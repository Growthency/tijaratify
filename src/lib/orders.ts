import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";

/* ──────────────────────────────────────────────────────────────────────────
   Orders data layer.
   Orders live only in Supabase — there is no bundled fallback. Every reader
   degrades gracefully: if Supabase isn't configured, or the orders tables
   haven't been created yet, it returns an explicit "setup" state instead of
   throwing, so the admin can show a helpful notice rather than crashing.
   ────────────────────────────────────────────────────────────────────────── */

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  size: string | null;
  color: string | null;
  currency: string;
}

export interface Order {
  id: string;
  orderNo: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
  /** Google Maps link to the customer's exact pinned location (may be empty). */
  mapLink: string;
  deliveryZone: string;
  subtotal: number;
  delivery: number;
  discount: number;
  total: number;
  currency: string;
  promoCode: string;
  paymentMethod: string;
  /** Whether payment has been received/verified (admin-confirmed). */
  paid: boolean;
  notes: string;
  fulfilledAt: string | null;
  returnedAt: string | null;
  returnReason: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

/** "ok" = tables present; "missing" = run supabase/orders.sql; "unconfigured" = no Supabase keys. */
export type OrdersSetup = "ok" | "missing" | "unconfigured";

export interface NewOrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
  mapLink: string;
  deliveryZone: string;
  subtotal: number;
  delivery: number;
  discount: number;
  total: number;
  currency: string;
  promoCode: string;
  paymentMethod: string;
  notes: string;
  items: Array<{
    productId: string;
    slug: string;
    name: string;
    image: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    size: string | null;
    color: string | null;
    currency: string;
  }>;
}

function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

function mapItem(r: Record<string, unknown>): OrderItem {
  return {
    id: String(r.id),
    productId: String(r.product_id ?? ""),
    slug: String(r.slug ?? ""),
    name: String(r.name ?? ""),
    image: String(r.image ?? ""),
    quantity: Number(r.quantity ?? 0),
    unitPrice: Number(r.unit_price ?? 0),
    lineTotal: Number(r.line_total ?? 0),
    size: r.size == null ? null : String(r.size),
    color: r.color == null ? null : String(r.color),
    currency: String(r.currency ?? "BDT"),
  };
}

function mapOrder(r: Record<string, unknown>): Order {
  const rawItems = (r.items ?? r.order_items ?? []) as Record<string, unknown>[];
  return {
    id: String(r.id),
    orderNo: String(r.order_no ?? ""),
    status: (String(r.status ?? "pending") as OrderStatus),
    customerName: String(r.customer_name ?? ""),
    customerEmail: String(r.customer_email ?? ""),
    customerPhone: String(r.customer_phone ?? ""),
    address: String(r.address ?? ""),
    city: String(r.city ?? ""),
    region: String(r.region ?? ""),
    postcode: String(r.postcode ?? ""),
    country: String(r.country ?? ""),
    mapLink: String(r.map_link ?? ""),
    deliveryZone: String(r.delivery_zone ?? "inside"),
    subtotal: Number(r.subtotal ?? 0),
    delivery: Number(r.delivery ?? 0),
    discount: Number(r.discount ?? 0),
    total: Number(r.total ?? 0),
    currency: String(r.currency ?? "BDT"),
    promoCode: String(r.promo_code ?? ""),
    paymentMethod: String(r.payment_method ?? ""),
    paid: Boolean(r.paid ?? false),
    notes: String(r.notes ?? ""),
    fulfilledAt: r.fulfilled_at ? String(r.fulfilled_at) : null,
    returnedAt: r.returned_at ? String(r.returned_at) : null,
    returnReason: String(r.return_reason ?? ""),
    createdAt: String(r.created_at ?? ""),
    updatedAt: String(r.updated_at ?? ""),
    items: Array.isArray(rawItems) ? rawItems.map(mapItem) : [],
  };
}

/** List orders (optionally filtered by status), newest first, with line items. */
export async function listOrders(opts?: {
  status?: OrderStatus | OrderStatus[];
}): Promise<{ orders: Order[]; setup: OrdersSetup }> {
  if (!isSupabaseAdminConfigured()) return { orders: [], setup: "unconfigured" };

  try {
    const db = createAdminClient();
    let query = db
      .from("orders")
      .select("*, items:order_items(*)")
      .order("created_at", { ascending: false });

    if (opts?.status) {
      if (Array.isArray(opts.status)) query = query.in("status", opts.status);
      else query = query.eq("status", opts.status);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingTable(error)) return { orders: [], setup: "missing" };
      return { orders: [], setup: "ok" };
    }
    return { orders: (data ?? []).map(mapOrder), setup: "ok" };
  } catch {
    return { orders: [], setup: "missing" };
  }
}

/** Aggregate counts for the admin nav / dashboards. */
export async function orderCounts(): Promise<Record<OrderStatus, number> | null> {
  if (!isSupabaseAdminConfigured()) return null;
  try {
    const db = createAdminClient();
    const { data, error } = await db.from("orders").select("status");
    if (error || !data) return null;
    const counts = Object.fromEntries(
      ORDER_STATUSES.map((s) => [s, 0]),
    ) as Record<OrderStatus, number>;
    for (const row of data) {
      const s = String((row as { status?: string }).status ?? "") as OrderStatus;
      if (s in counts) counts[s] += 1;
    }
    return counts;
  } catch {
    return null;
  }
}

function genOrderNo(): string {
  return `JC-${Math.floor(100000 + Math.random() * 900000)}`;
}

/** Persist a new order and its line items. Returns the stored order number. */
export async function createOrder(
  input: NewOrderInput,
): Promise<{ ok: boolean; orderNo: string | null; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, orderNo: null, error: "not_configured" };
  }
  const db = createAdminClient();

  // Insert the header, retrying a couple of times on the (rare) unique clash.
  // `map_link` is a newer column — if it hasn't been added yet, we drop it and
  // retry so an order is never lost just because that migration wasn't run.
  let orderId = "";
  let orderNo = "";
  let includeMapLink = Boolean(input.mapLink);
  for (let attempt = 0; attempt < 5; attempt++) {
    orderNo = genOrderNo();
    const row: Record<string, unknown> = {
      order_no: orderNo,
      status: "pending",
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      address: input.address,
      city: input.city,
      region: input.region,
      postcode: input.postcode,
      country: input.country,
      delivery_zone: input.deliveryZone,
      subtotal: input.subtotal,
      delivery: input.delivery,
      discount: input.discount,
      total: input.total,
      currency: input.currency,
      promo_code: input.promoCode,
      payment_method: input.paymentMethod,
      notes: input.notes,
    };
    if (includeMapLink) row.map_link = input.mapLink;

    const { data, error } = await db
      .from("orders")
      .insert(row)
      .select("id, order_no")
      .single();

    if (!error && data) {
      orderId = String((data as { id: string }).id);
      orderNo = String((data as { order_no: string }).order_no);
      break;
    }
    if (error && isMissingTable(error)) {
      return { ok: false, orderNo: null, error: "missing_table" };
    }
    // The map_link column doesn't exist yet → retry immediately without it.
    if (
      error &&
      includeMapLink &&
      (error.code === "42703" || /map_link/i.test(error.message ?? ""))
    ) {
      includeMapLink = false;
      attempt--;
      continue;
    }
    // 23505 = unique_violation → try another number; otherwise bail.
    if (error && error.code !== "23505") {
      return { ok: false, orderNo: null, error: error.message };
    }
  }

  if (!orderId) return { ok: false, orderNo: null, error: "insert_failed" };

  if (input.items.length) {
    const rows = input.items.map((i) => ({
      order_id: orderId,
      product_id: i.productId,
      slug: i.slug,
      name: i.name,
      image: i.image,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      line_total: i.lineTotal,
      size: i.size,
      color: i.color,
      currency: i.currency,
    }));
    const { error: itemsError } = await db.from("order_items").insert(rows);
    if (itemsError) {
      // Keep the header — the order is still recorded — but report the issue.
      return { ok: true, orderNo, error: `items:${itemsError.message}` };
    }
  }

  return { ok: true, orderNo };
}

/** Update an order's status, stamping the derived fulfilment/return dates. */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  returnReason?: string,
): Promise<Order | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const db = createAdminClient();

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "delivered") patch.fulfilled_at = new Date().toISOString();
  if (status === "returned") {
    patch.returned_at = new Date().toISOString();
    if (typeof returnReason === "string") patch.return_reason = returnReason;
  }

  const { data, error } = await db
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select("*, items:order_items(*)")
    .single();

  if (error || !data) return null;
  return mapOrder(data);
}

/** Mark an order as paid / unpaid (payment received and verified by the admin). */
export async function updateOrderPaid(
  id: string,
  paid: boolean,
): Promise<Order | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const db = createAdminClient();

  const { data, error } = await db
    .from("orders")
    .update({ paid, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, items:order_items(*)")
    .single();

  if (error || !data) return null;
  return mapOrder(data);
}

/* ── Customer-facing (guest) lookups ──────────────────────────────────────
   There are no customer accounts. A customer proves ownership of an order with
   the phone number they used at checkout — the same way small COD stores let
   people "track by phone". Matching is on the last 10 digits so +8801… and 01…
   forms both work. */

const phoneCore = (s: string): string => (s || "").replace(/\D/g, "").slice(-10);

/** True when two phone numbers refer to the same line (last-10-digit match). */
export function phonesMatch(a: string, b: string): boolean {
  const ca = phoneCore(a);
  return ca.length >= 6 && ca === phoneCore(b);
}

/** Orders placed with a given phone number, newest first. */
export async function findOrdersByPhone(
  phone: string,
): Promise<{ orders: Order[]; setup: OrdersSetup }> {
  if (!isSupabaseAdminConfigured()) return { orders: [], setup: "unconfigured" };
  const core = phoneCore(phone);
  if (core.length < 6) return { orders: [], setup: "ok" };
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("orders")
      .select("*, items:order_items(*)")
      .ilike("customer_phone", `%${core}%`)
      .order("created_at", { ascending: false });
    if (error) {
      if (isMissingTable(error)) return { orders: [], setup: "missing" };
      return { orders: [], setup: "ok" };
    }
    // Exact last-10 match (ilike is a coarse pre-filter).
    const orders = (data ?? [])
      .map(mapOrder)
      .filter((o) => phonesMatch(o.customerPhone, phone));
    return { orders, setup: "ok" };
  } catch {
    return { orders: [], setup: "missing" };
  }
}

/** Fetch a single order by its human order number (with items). */
export async function getOrderByNo(orderNo: string): Promise<Order | null> {
  if (!isSupabaseAdminConfigured()) return null;
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("order_no", orderNo)
      .single();
    if (error || !data) return null;
    return mapOrder(data);
  } catch {
    return null;
  }
}

/** Statuses a customer is still allowed to cancel themselves. */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ["pending", "processing"];

/** Cancel an order on the customer's behalf, after verifying they own it. */
export async function cancelOrderByCustomer(
  orderNo: string,
  phone: string,
): Promise<{ ok: boolean; order?: Order; error?: string }> {
  const order = await getOrderByNo(orderNo);
  if (!order) return { ok: false, error: "not_found" };
  if (!phonesMatch(order.customerPhone, phone)) {
    return { ok: false, error: "phone_mismatch" };
  }
  if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
    return { ok: false, error: "not_cancellable" };
  }
  const updated = await updateOrderStatus(order.id, "cancelled");
  if (!updated) return { ok: false, error: "update_failed" };
  return { ok: true, order: updated };
}
