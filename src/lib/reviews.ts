import type { Product } from "@/types";

/* ──────────────────────────────────────────────────────────────────────────
   Deterministic, brand-neutral customer reviews.
   Generated from the catalogue record so every product shows relevant,
   written reviews — and the copy works for any product type.
   ────────────────────────────────────────────────────────────────────────── */

export interface WrittenReview {
  name: string;
  initials: string;
  meta: string;
  rating: number;
  title: string;
  body: string;
}

/** A real, purchase-verified review stored in the database. */
export interface StoredReview {
  id: string;
  productSlug: string;
  orderNo: string;
  customerName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
}

/** Initials for an avatar chip, from a customer's name. */
export function initialsOf(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "JC";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase() || "JC";
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const REVIEWERS = [
  { name: "Rahul A.", initials: "RA", meta: "Verified buyer" },
  { name: "Nadia K.", initials: "NK", meta: "Repeat customer" },
  { name: "Tanvir H.", initials: "TH", meta: "Verified buyer · Dhaka" },
  { name: "Mehjabin R.", initials: "MR", meta: "Verified buyer" },
  { name: "Arif S.", initials: "AS", meta: "Repeat customer" },
  { name: "Sadia I.", initials: "SI", meta: "Verified buyer" },
];

const TEMPLATES: { rating: number; title: string; body: (n: string) => string }[] = [
  {
    rating: 5,
    title: "Exactly as described",
    body: (n) =>
      `The ${n} arrived exactly as pictured — the quality is genuinely better than I expected for the price. Really happy with it and would order again.`,
  },
  {
    rating: 5,
    title: "Fast delivery, careful packaging",
    body: (n) =>
      `Turned up quicker than promised and packaged with real care. The ${n} feels premium and well made. Smooth experience from order to delivery.`,
  },
  {
    rating: 5,
    title: "Brilliant value for money",
    body: (n) =>
      `Second time ordering and the ${n} hasn't disappointed. Great quality, fair price, and it does exactly what I needed. Highly recommend.`,
  },
  {
    rating: 4,
    title: "Really good — small note",
    body: (n) =>
      `Very happy with the ${n} overall — lovely finish and feels durable. Only reason for four stars is I'd love a couple more options, but no complaints on the quality itself.`,
  },
  {
    rating: 5,
    title: "Top-class service",
    body: (n) =>
      `Had a question before ordering and the team replied on WhatsApp within minutes. The ${n} itself is excellent and exactly as described. Will be back.`,
  },
];

/** Build a deterministic set of written reviews for a product. */
export function buildReviews(product: Product, count = 4): WrittenReview[] {
  const seed = hash(product.id);
  const out: WrittenReview[] = [];
  for (let i = 0; i < Math.min(count, TEMPLATES.length); i++) {
    const t = TEMPLATES[(seed + i) % TEMPLATES.length];
    const who = REVIEWERS[(seed + i * 2) % REVIEWERS.length];
    out.push({
      ...who,
      rating: t.rating,
      title: t.title,
      body: t.body(product.name),
    });
  }
  return out;
}

/** Skew a 5→1 star distribution toward the product's average rating. */
export function buildDistribution(rating: number) {
  const r = Math.max(1, Math.min(5, rating));
  const weights: Record<number, number> = {
    5: Math.max(0, r - 3.2) + 0.55,
    4: Math.max(0, 1.2 - Math.abs(r - 4.4)) + 0.22,
    3: Math.max(0, 0.5 - Math.abs(r - 3.4)) + 0.05,
    2: Math.max(0, 0.3 - Math.abs(r - 2.4)) + 0.02,
    1: Math.max(0, 0.3 - Math.abs(r - 1.6)) + 0.015,
  };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const rows = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    percent: Math.round((weights[stars] / total) * 100),
  }));
  const drift = 100 - rows.reduce((a, b) => a + b.percent, 0);
  rows[0].percent = Math.max(0, rows[0].percent + drift);
  return rows;
}

export const recommendPercent = (rating: number) =>
  Math.round((Math.max(1, Math.min(5, rating)) / 5) * 100);
