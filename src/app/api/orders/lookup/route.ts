import { NextResponse } from "next/server";

import { findOrdersByPhone } from "@/lib/orders";
import { getProducts } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/orders/lookup
 * Public. Given the phone number used at checkout, returns that customer's own
 * orders (newest first) so they can track / cancel / review them. There are no
 * accounts — the phone number is the guest key.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone : "";
  if (phone.replace(/\D/g, "").length < 6) {
    return NextResponse.json(
      { ok: false, error: "Enter the phone number you used at checkout." },
      { status: 400 },
    );
  }

  const { orders, setup } = await findOrdersByPhone(phone);
  if (setup === "unconfigured" || setup === "missing") {
    return NextResponse.json(
      { ok: false, error: "Order lookup isn't available right now." },
      { status: 200 },
    );
  }

  // Enrich each line with its product's current return window, so the portal
  // can show a "Return this item" option only while it's still within policy.
  try {
    const products = await getProducts();
    const days = new Map(products.map((p) => [p.slug, p.returnDays ?? 7]));
    for (const o of orders) {
      for (const it of o.items) it.returnDays = days.get(it.slug) ?? 7;
    }
  } catch {
    /* enrichment is best-effort — the return API re-checks the window anyway */
  }

  return NextResponse.json({ ok: true, orders });
}
