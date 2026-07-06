import { NextResponse } from "next/server";

import { cancelOrderByCustomer } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  not_found: "We couldn't find that order.",
  phone_mismatch: "That phone number doesn't match this order.",
  not_cancellable: "This order is already on its way and can't be cancelled here — message us on WhatsApp.",
  update_failed: "Couldn't cancel just now — please try again.",
};

/**
 * POST /api/orders/cancel
 * Public. Cancels an order after verifying (order number + phone) that the
 * requester owns it and it's still cancellable (pending / processing).
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const orderNo = typeof body.orderNo === "string" ? body.orderNo.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone : "";
  if (!orderNo || !phone) {
    return NextResponse.json(
      { ok: false, error: "Missing order details." },
      { status: 400 },
    );
  }

  const res = await cancelOrderByCustomer(orderNo, phone);
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: MESSAGES[res.error ?? ""] ?? "Couldn't cancel this order." },
      { status: 200 },
    );
  }
  return NextResponse.json({ ok: true, order: res.order });
}
