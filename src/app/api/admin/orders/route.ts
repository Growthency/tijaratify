import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-guard";
import {
  updateOrderStatus,
  ORDER_STATUSES,
  type OrderStatus,
} from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/orders
 * Admin-only. Updates an order's status (and stamps the fulfilment / return
 * date). Body: { id: string, status: OrderStatus, returnReason?: string }.
 */
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status : "";
  const returnReason =
    typeof body.returnReason === "string" ? body.returnReason : undefined;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await updateOrderStatus(id, status as OrderStatus, returnReason);
  if (!updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ order: updated });
}
