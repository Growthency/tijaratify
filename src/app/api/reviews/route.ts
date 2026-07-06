import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getOrderByNo, phonesMatch } from "@/lib/orders";
import { createReview } from "@/lib/reviews-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/reviews
 * Public, but purchase-verified: a review is only accepted when the order
 * (matched by order number + phone) was delivered and actually contains the
 * product being reviewed. This is what stops non-buyers from reviewing.
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
  const rating = Math.max(1, Math.min(5, Math.round(Number(body.rating) || 0)));
  const title = str(body.title).slice(0, 120);
  const reviewBody = str(body.body).slice(0, 2000);

  if (!orderNo || !phone || !productSlug || !rating) {
    return NextResponse.json(
      { ok: false, error: "Please add a star rating." },
      { status: 400 },
    );
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
  if (order.status !== "delivered") {
    return NextResponse.json(
      { ok: false, error: "You can review this once your order is delivered." },
      { status: 200 },
    );
  }
  if (!order.items.some((i) => i.slug === productSlug)) {
    return NextResponse.json(
      { ok: false, error: "That item isn't part of this order." },
      { status: 200 },
    );
  }

  const res = await createReview({
    productSlug,
    orderId: order.id,
    orderNo: order.orderNo,
    customerName: order.customerName,
    rating,
    title,
    body: reviewBody,
  });

  if (!res.ok) {
    const msg =
      res.error === "duplicate"
        ? "You've already reviewed this item — thank you!"
        : res.error === "missing_table"
          ? "Reviews aren't available right now."
          : "Couldn't save your review — please try again.";
    return NextResponse.json({ ok: false, error: msg }, { status: 200 });
  }

  // Refresh the product page so the new review shows.
  revalidatePath(`/product/${productSlug}`);
  return NextResponse.json({ ok: true });
}
