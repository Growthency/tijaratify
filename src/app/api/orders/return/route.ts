import { NextResponse } from "next/server";

import { getOrderByNo, phonesMatch, updateOrderStatus } from "@/lib/orders";
import { getProduct } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/orders/return
 * Public, but verified: a return is only accepted when the order (matched by
 * order number + phone) was delivered, actually contains the item, AND the item
 * is still inside its product's return window (returnDays from delivery).
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const orderNo = str(body.orderNo);
  const phone = str(body.phone);
  const productSlug = str(body.productSlug);
  const reasonType = str(body.reasonType) || "Return requested";
  const reason = str(body.reason).slice(0, 600);

  if (!orderNo || !phone || !productSlug) {
    return NextResponse.json({ ok: false, error: "Missing return details." }, { status: 400 });
  }

  const order = await getOrderByNo(orderNo);
  if (!order) {
    return NextResponse.json({ ok: false, error: "We couldn't find that order." }, { status: 200 });
  }
  if (!phonesMatch(order.customerPhone, phone)) {
    return NextResponse.json(
      { ok: false, error: "That phone number doesn't match this order." },
      { status: 200 },
    );
  }
  if (order.status === "returned") {
    return NextResponse.json(
      { ok: false, error: "A return is already in progress for this order." },
      { status: 200 },
    );
  }
  if (order.status !== "delivered") {
    return NextResponse.json(
      { ok: false, error: "You can only return items from a delivered order." },
      { status: 200 },
    );
  }

  const item = order.items.find((i) => i.slug === productSlug);
  if (!item) {
    return NextResponse.json(
      { ok: false, error: "That item isn't part of this order." },
      { status: 200 },
    );
  }

  // Authoritative return-window check against the product's policy.
  const product = await getProduct(productSlug);
  const returnDays = product?.returnDays ?? 0;
  if (returnDays <= 0) {
    return NextResponse.json(
      { ok: false, error: "This item isn't eligible for return." },
      { status: 200 },
    );
  }

  const deliveredAt = order.fulfilledAt ? new Date(order.fulfilledAt).getTime() : 0;
  if (!deliveredAt) {
    return NextResponse.json(
      { ok: false, error: "We can start returns once your order is marked delivered." },
      { status: 200 },
    );
  }
  const daysSince = (Date.now() - deliveredAt) / 86_400_000;
  if (daysSince > returnDays) {
    return NextResponse.json(
      {
        ok: false,
        error: `Sorry — the ${returnDays}-day return window for this item has passed.`,
      },
      { status: 200 },
    );
  }

  const detail = reason ? `${reasonType}: ${reason}` : reasonType;
  const updated = await updateOrderStatus(
    order.id,
    "returned",
    `${item.name} — ${detail}`,
  );
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Couldn't submit your return — please try again." },
      { status: 200 },
    );
  }
  return NextResponse.json({ ok: true, order: updated });
}
