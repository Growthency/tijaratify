"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  Package,
  MapPin,
  Loader2,
  Star,
  CheckCircle2,
  ShoppingBag,
  CreditCard,
  X,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { cn, formatPrice, formatDateTime } from "@/lib/utils";
import type { Order, OrderItem, OrderStatus } from "@/lib/orders";

const STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  pending: { label: "Order received", tone: "bg-amber-50 text-amber-700 ring-amber-200" },
  processing: { label: "Being made", tone: "bg-sky-50 text-sky-700 ring-sky-200" },
  shipped: { label: "On the way", tone: "bg-violet-50 text-violet-700 ring-violet-200" },
  delivered: { label: "Delivered", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  returned: { label: "Returned", tone: "bg-rose-50 text-rose-700 ring-rose-200" },
  cancelled: { label: "Cancelled", tone: "bg-onyx-100 text-onyx-500 ring-onyx-200" },
};

const CANCELLABLE = new Set<OrderStatus>(["pending", "processing"]);

export function OrdersLookupClient() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 6) {
      toast.error("Enter the phone number you used at checkout.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        toast.error(data.error || "Couldn't look up your orders.");
        setOrders([]);
        return;
      }
      setOrders(data.orders || []);
    } catch {
      toast.error("Something went wrong — please try again.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  const patchOrder = (updated: Order) =>
    setOrders((prev) =>
      prev ? prev.map((o) => (o.id === updated.id ? updated : o)) : prev,
    );

  return (
    <div className="bg-bone">
      <Container className="py-7">
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "My Orders" }]}
        />
      </Container>

      <Container className="pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-extrabold uppercase tracking-tightest text-onyx-950 sm:text-4xl">
            My Orders
          </h1>
          <p className="mx-auto mt-3 max-w-md text-onyx-500">
            Enter the phone number you used at checkout to track your orders,
            cancel one, or leave a review on what you&apos;ve received.
          </p>

          <form
            onSubmit={lookup}
            className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-onyx-400" />
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="h-12 w-full rounded-full border border-onyx-200 bg-white pl-11 pr-4 text-sm text-onyx-900 outline-none transition-colors placeholder:text-onyx-300 focus:border-ember-500 focus:ring-2 focus:ring-ember-500/25"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ember-500 px-7 text-sm font-bold text-white shadow-glow-sm transition-all hover:bg-ember-600 hover:shadow-glow disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Find my orders
            </button>
          </form>
        </div>

        {orders !== null && (
          <div className="mx-auto mt-12 max-w-2xl space-y-5">
            {orders.length === 0 ? (
              <EmptyLookup />
            ) : (
              orders.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  phone={phone}
                  onChange={patchOrder}
                />
              ))
            )}
          </div>
        )}
      </Container>
    </div>
  );
}

function EmptyLookup() {
  return (
    <div className="rounded-3xl border border-onyx-100 bg-white p-10 text-center shadow-card">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-onyx-50 text-onyx-300">
        <ShoppingBag className="h-7 w-7" />
      </div>
      <p className="mt-5 font-bold text-onyx-950">No orders found</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-onyx-500">
        We couldn&apos;t find any orders for that number. Double-check it&apos;s
        the one you used at checkout, or start a new order.
      </p>
      <Link
        href="/shop"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-onyx-950 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-onyx-800"
      >
        Browse products
      </Link>
    </div>
  );
}

function OrderCard({
  order: o,
  phone,
  onChange,
}: {
  order: Order;
  phone: string;
  onChange: (o: Order) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const st = STATUS[o.status];
  const count = o.items.reduce((s, i) => s + i.quantity, 0);

  async function cancel() {
    setBusy(true);
    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo: o.orderNo, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        toast.error(data.error || "Couldn't cancel this order.");
        return;
      }
      onChange(data.order);
      toast.success(`Order ${o.orderNo} cancelled.`);
    } catch {
      toast.error("Couldn't cancel — please try again.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-onyx-100 bg-white shadow-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-onyx-50 p-5">
        <div>
          <p className="font-extrabold text-onyx-950">{o.orderNo}</p>
          <p className="mt-0.5 text-xs text-onyx-400">
            {formatDateTime(o.createdAt)} · {count} item{count === 1 ? "" : "s"}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset",
            st.tone,
          )}
        >
          {st.label}
        </span>
      </div>

      {/* Items */}
      <ul className="divide-y divide-onyx-50">
        {o.items.map((i) => (
          <li key={i.id} className="p-5">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={i.image || "/placeholder.svg"}
                alt=""
                className="h-16 w-16 flex-shrink-0 rounded-xl object-cover ring-1 ring-onyx-100"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${i.slug}`}
                  className="line-clamp-1 font-bold text-onyx-950 hover:text-ember-600"
                >
                  {i.name}
                </Link>
                {[i.size, i.color].filter(Boolean).length > 0 && (
                  <p className="text-xs text-onyx-400">
                    {[i.size, i.color].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="mt-0.5 text-sm text-onyx-500">
                  {i.quantity} × {formatPrice(i.unitPrice, i.currency)}
                </p>
              </div>
              <p className="shrink-0 font-bold text-onyx-950">
                {formatPrice(i.lineTotal, i.currency)}
              </p>
            </div>

            {/* Review (delivered only) */}
            {o.status === "delivered" && (
              <div className="mt-3 pl-20">
                {reviewed.has(i.slug) ? (
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Review submitted — thank you!
                  </p>
                ) : reviewing === i.slug ? (
                  <ReviewForm
                    orderNo={o.orderNo}
                    phone={phone}
                    item={i}
                    onDone={() => {
                      setReviewed((s) => new Set(s).add(i.slug));
                      setReviewing(null);
                    }}
                    onCancel={() => setReviewing(null)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setReviewing(i.slug)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-onyx-200 px-3.5 py-1.5 text-xs font-bold text-onyx-700 transition-colors hover:border-ember-300 hover:text-ember-600"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Write a review
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Summary + meta */}
      <div className="space-y-3 border-t border-onyx-50 bg-onyx-50/40 p-5 text-sm">
        <div className="flex items-center justify-between text-onyx-500">
          <span>Subtotal</span>
          <span>{formatPrice(o.subtotal, o.currency)}</span>
        </div>
        <div className="flex items-center justify-between text-onyx-500">
          <span>Delivery</span>
          <span>{formatPrice(o.delivery, o.currency)}</span>
        </div>
        {o.discount > 0 && (
          <div className="flex items-center justify-between text-ember-600">
            <span>Discount{o.promoCode ? ` (${o.promoCode})` : ""}</span>
            <span>− {formatPrice(o.discount, o.currency)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-onyx-100 pt-3 text-base font-extrabold text-onyx-950">
          <span>Total</span>
          <span>{formatPrice(o.total, o.currency)}</span>
        </div>

        <div className="flex flex-col gap-1.5 pt-1 text-xs text-onyx-500">
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-onyx-400" />
            <span>
              {[o.address, o.city, o.region, o.postcode, o.country]
                .filter(Boolean)
                .join(", ") || "—"}
            </span>
          </p>
          <p className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-onyx-400" />
            {o.paymentMethod || "—"}
            {" · "}
            <span className={o.paid ? "font-semibold text-emerald-600" : "text-onyx-400"}>
              {o.paid ? "Paid" : "Payment pending"}
            </span>
          </p>
        </div>

        {/* Cancel */}
        {CANCELLABLE.has(o.status) && (
          <div className="pt-2">
            {confirming ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Yes, cancel order
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="rounded-full px-3 py-2 text-xs font-semibold text-onyx-500 hover:text-onyx-800"
                >
                  Keep order
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-onyx-200 px-4 py-2 text-xs font-bold text-onyx-600 transition-colors hover:border-rose-300 hover:text-rose-600"
              >
                <X className="h-3.5 w-3.5" />
                Cancel this order
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Inline review form (delivered items only) ── */
function ReviewForm({
  orderNo,
  phone,
  item,
  onDone,
  onCancel,
}: {
  orderNo: string;
  phone: string;
  item: OrderItem;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNo,
          phone,
          productSlug: item.slug,
          rating,
          title,
          body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        toast.error(data.error || "Couldn't submit your review.");
        return;
      }
      toast.success("Thanks for your review!");
      onDone();
    } catch {
      toast.error("Couldn't submit — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-onyx-100 bg-onyx-50/50 p-4"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-onyx-400">
        Review {item.name}
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="p-0.5"
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                (hover || rating) >= n
                  ? "fill-ember-500 text-ember-500"
                  : "fill-onyx-200 text-onyx-200",
              )}
            />
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a headline (optional)"
        maxLength={120}
        className="h-11 w-full rounded-xl border border-onyx-200 bg-white px-3.5 text-sm text-onyx-900 outline-none transition-colors placeholder:text-onyx-300 focus:border-ember-500"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="How was it? Share a little about your experience (optional)."
        rows={3}
        maxLength={2000}
        className="w-full rounded-xl border border-onyx-200 bg-white px-3.5 py-2.5 text-sm text-onyx-900 outline-none transition-colors placeholder:text-onyx-300 focus:border-ember-500"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-ember-500 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-ember-600 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Submit review
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-full px-3 py-2 text-xs font-semibold text-onyx-500 hover:text-onyx-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
