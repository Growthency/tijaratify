import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import type { StoredReview } from "@/lib/reviews";

/* ──────────────────────────────────────────────────────────────────────────
   Reviews data layer (DB-backed).
   Reviews live only in Supabase. Reads degrade gracefully to an empty list if
   Supabase isn't configured or the reviews table hasn't been created yet, so
   product pages never crash. Writes happen only after the API has verified the
   reviewer actually ordered (and received) the product.
   ────────────────────────────────────────────────────────────────────────── */

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

function mapReview(r: Record<string, unknown>): StoredReview {
  return {
    id: String(r.id),
    productSlug: String(r.product_slug ?? ""),
    orderNo: String(r.order_no ?? ""),
    customerName: String(r.customer_name ?? ""),
    rating: Number(r.rating ?? 5),
    title: String(r.title ?? ""),
    body: String(r.body ?? ""),
    createdAt: String(r.created_at ?? ""),
  };
}

/** All reviews for a product, newest first. Empty on any setup/error state. */
export async function listReviews(productSlug: string): Promise<StoredReview[]> {
  if (!isSupabaseAdminConfigured()) return [];
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("reviews")
      .select("*")
      .eq("product_slug", productSlug)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map(mapReview);
  } catch {
    return [];
  }
}

export interface NewReviewInput {
  productSlug: string;
  orderId: string;
  orderNo: string;
  customerName: string;
  rating: number;
  title: string;
  body: string;
}

/** Insert a review. The caller MUST have verified the purchase first. */
export async function createReview(
  input: NewReviewInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) return { ok: false, error: "not_configured" };
  try {
    const db = createAdminClient();
    const { error } = await db.from("reviews").insert({
      product_slug: input.productSlug,
      order_id: input.orderId || null,
      order_no: input.orderNo,
      customer_name: input.customerName,
      rating: input.rating,
      title: input.title,
      body: input.body,
    });
    if (error) {
      if (isMissingTable(error)) return { ok: false, error: "missing_table" };
      // 23505 = unique_violation → they already reviewed this item on this order.
      if (error.code === "23505") return { ok: false, error: "duplicate" };
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}
