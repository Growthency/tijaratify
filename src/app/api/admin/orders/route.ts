import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-guard";
import {
  updateOrderStatus,
  updateOrderPaid,
  ORDER_STATUSES,
  type OrderStatus,
} from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/orders
 * Admin-only. Updates an order's status (stamping the fulfilment / return date)
 * and/or its payment (paid) flag.
 * Body: { id: string, status?: OrderStatus, returnReason?: string, paid?: boolean }.
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
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const hasStatus = typeof body.status === "string";
  const hasPaid = typeof body.paid === "boolean";
  if (!hasStatus && !hasPaid) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  let updated = null;

  if (hasStatus) {
    const status = body.status as string;
    if (!ORDER_STATUSES.includes(status as OrderStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const returnReason =
      typeof body.returnReason === "string" ? body.returnReason : undefined;
    updated = await updateOrderStatus(id, status as OrderStatus, returnReason);
  }

  if (hasPaid) {
    updated = await updateOrderPaid(id, body.paid as boolean);
  }

  if (!updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ order: updated });
}
