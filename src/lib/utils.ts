import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as a currency string (defaults to Bangladeshi Taka). */
export function formatPrice(
  value: number,
  currency = "BDT",
  locale = "en-US"
): string {
  const digits = value % 1 === 0 ? 0 : 2;
  // Render Taka with the ৳ glyph for a clean local look.
  if (currency === "BDT") {
    return "৳" + new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Percentage saved when there's a compare-at price. */
export function discountPercent(price: number, compareAt: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** Human-friendly date, e.g. "5 June 2026". */
export function formatDate(iso: string, locale = "en-GB"): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Date + time, e.g. "5 Jun 2026, 14:32". */
export function formatDateTime(iso: string, locale = "en-GB"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Estimate reading time (words / 200wpm) from plain text or HTML. */
export function estimateReadingTime(text: string): number {
  const words = text.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Clamp a number to a range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Build a wa.me deep link with a pre-filled message. */
export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Title-case a slug for display fallbacks. */
export function deslugify(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
