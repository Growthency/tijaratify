import { NextResponse } from "next/server";

import { createOrder, type NewOrderInput } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/orders
 *
 * Public endpoint the checkout calls to record an order. Card details are
 * intentionally NOT accepted or stored. Returns the saved order number so the
 * confirmation screen can show it. Never blocks checkout: if saving fails, the
 * client still shows its own confirmation.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const num = (v: unknown, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items: NewOrderInput["items"] = rawItems.map((raw) => {
    const i = (raw ?? {}) as Record<string, unknown>;
    const quantity = Math.max(1, Math.round(num(i.quantity, 1)));
    const unitPrice = num(i.unitPrice ?? i.price);
    return {
      productId: str(i.productId),
      slug: str(i.slug),
      name: str(i.name),
      image: str(i.image),
      quantity,
      unitPrice,
      lineTotal: num(i.lineTotal, unitPrice * quantity),
      size: i.size == null || i.size === "" ? null : str(i.size),
      color: i.color == null || i.color === "" ? null : str(i.color),
      currency: str(i.currency) || "BDT",
    };
  });

  if (!items.length) {
    return NextResponse.json({ ok: false, error: "Empty order" }, { status: 400 });
  }
  if (!str(body.customerName).trim() || !str(body.customerPhone).trim()) {
    return NextResponse.json(
      { ok: false, error: "Missing customer details" },
      { status: 400 },
    );
  }

  const input: NewOrderInput = {
    customerName: str(body.customerName).trim(),
    customerEmail: str(body.customerEmail).trim(),
    customerPhone: str(body.customerPhone).trim(),
    address: str(body.address).trim(),
    city: str(body.city).trim(),
    region: str(body.region).trim(),
    postcode: str(body.postcode).trim(),
    country: str(body.country).trim() || "Bangladesh",
    mapLink: str(body.mapLink).trim(),
    deliveryZone: str(body.deliveryZone) || "inside",
    subtotal: num(body.subtotal),
    delivery: num(body.delivery),
    discount: num(body.discount),
    total: num(body.total),
    currency: str(body.currency) || items[0]?.currency || "BDT",
    promoCode: str(body.promoCode),
    paymentMethod: str(body.paymentMethod) || "card",
    notes: str(body.notes),
    items,
  };

  try {
    const result = await createOrder(input);
    if (!result.ok) {
      // Do not fail the customer's checkout — just report that it wasn't stored.
      return NextResponse.json(
        { ok: false, orderNo: null, error: result.error ?? "save_failed" },
        { status: 200 },
      );
    }
    return NextResponse.json({ ok: true, orderNo: result.orderNo });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ ok: false, orderNo: null, error: message }, { status: 200 });
  }
}
