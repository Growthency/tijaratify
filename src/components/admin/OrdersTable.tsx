"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Search,
  Package,
  Mail,
  Phone,
  MapPin,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { cn, formatPrice, formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/admin/AdminUI";
import type { Order, OrderItem, OrderStatus } from "@/lib/orders";

/* `@/lib/orders` is server-only, so the status list is mirrored here for the
   client control rather than imported. */
const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "returned", label: "Returned" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_TONE: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  processing: "bg-sky-50 text-sky-700 ring-sky-200",
  shipped: "bg-violet-50 text-violet-700 ring-violet-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  returned: "bg-rose-50 text-rose-700 ring-rose-200",
  cancelled: "bg-onyx-100 text-onyx-500 ring-onyx-200",
};

type View = "all" | "fulfilled" | "returns";

export function OrdersTable({
  orders,
  view,
}: {
  orders: Order[];
  view: View;
}) {
  const [rows, setRows] = useState<Order[]>(orders);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((o) =>
      [
        o.orderNo,
        o.customerName,
        o.customerPhone,
        o.customerEmail,
        o.city,
        ...o.items.map((i) => i.name),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, query]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function changeStatus(order: Order, status: OrderStatus) {
    if (status === order.status) return;
    setBusy(order.id);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");

      const updated: Order = data.order;
      setRows((prev) => {
        // If the order no longer belongs to this filtered view, drop it.
        const leavesView =
          (view === "fulfilled" && updated.status !== "delivered") ||
          (view === "returns" && updated.status !== "returned");
        if (leavesView) return prev.filter((o) => o.id !== order.id);
        return prev.map((o) => (o.id === order.id ? updated : o));
      });
      toast.success(`Order ${order.orderNo} marked ${status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={
          view === "fulfilled"
            ? "No fulfilled orders yet"
            : view === "returns"
              ? "No returns"
              : "No orders yet"
        }
        hint={
          view === "returns"
            ? "Orders you mark as returned will appear here."
            : view === "fulfilled"
              ? "Orders you mark as delivered will appear here."
              : "Orders placed at checkout will show up here automatically."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-onyx-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search order #, name, phone, product…"
          className="h-11 w-full rounded-xl border border-onyx-200 bg-white pl-10 pr-4 text-sm text-onyx-900 outline-none transition-colors placeholder:text-onyx-300 focus:border-ember-500 focus:ring-2 focus:ring-ember-500/25"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-onyx-100 bg-white shadow-card md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-onyx-100 text-[11px] font-bold uppercase tracking-widest text-onyx-400">
              <th className="px-5 py-3 font-bold">Order</th>
              <th className="px-3 py-3 font-bold">Customer</th>
              <th className="px-3 py-3 font-bold">Items</th>
              <th className="px-3 py-3 font-bold">Total</th>
              <th className="px-3 py-3 font-bold">
                {view === "returns"
                  ? "Returned"
                  : view === "fulfilled"
                    ? "Delivered"
                    : "Status"}
              </th>
              <th className="px-5 py-3 text-right font-bold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-50">
            {filtered.map((o) => {
              const open = expanded.has(o.id);
              const count = o.items.reduce((s, i) => s + i.quantity, 0);
              return (
                <FragmentRow
                  key={o.id}
                  order={o}
                  open={open}
                  count={count}
                  view={view}
                  busy={busy === o.id}
                  onToggle={() => toggle(o.id)}
                  onStatus={(s) => changeStatus(o, s)}
                />
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-onyx-400">
            No orders match “{query}”.
          </p>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((o) => (
          <MobileCard
            key={o.id}
            order={o}
            open={expanded.has(o.id)}
            view={view}
            busy={busy === o.id}
            onToggle={() => toggle(o.id)}
            onStatus={(s) => changeStatus(o, s)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-onyx-400">
            No orders match “{query}”.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Desktop row + its expandable detail row ── */
function FragmentRow({
  order: o,
  open,
  count,
  view,
  busy,
  onToggle,
  onStatus,
}: {
  order: Order;
  open: boolean;
  count: number;
  view: View;
  busy: boolean;
  onToggle: () => void;
  onStatus: (s: OrderStatus) => void;
}) {
  return (
    <>
      <tr className="group align-top transition-colors hover:bg-onyx-50/50">
        <td className="px-5 py-3.5">
          <p className="font-bold text-onyx-950">{o.orderNo}</p>
          <p className="mt-0.5 text-xs text-onyx-400">
            {formatDateTime(o.createdAt)}
          </p>
        </td>
        <td className="px-3 py-3.5">
          <p className="font-semibold text-onyx-900">{o.customerName || "—"}</p>
          <p className="mt-0.5 text-xs text-onyx-500">{o.customerPhone}</p>
          {o.city && <p className="text-xs text-onyx-400">{o.city}</p>}
        </td>
        <td className="px-3 py-3.5">
          <span className="inline-flex items-center gap-1.5 text-sm text-onyx-700">
            <Package className="h-3.5 w-3.5 text-onyx-400" />
            {count} item{count === 1 ? "" : "s"}
          </span>
        </td>
        <td className="px-3 py-3.5 font-bold text-onyx-900">
          {formatPrice(o.total, o.currency)}
        </td>
        <td className="px-3 py-3.5">
          <StatusControl order={o} busy={busy} onStatus={onStatus} />
          {view === "fulfilled" && o.fulfilledAt && (
            <p className="mt-1 text-xs text-onyx-400">
              {formatDateTime(o.fulfilledAt)}
            </p>
          )}
          {view === "returns" && o.returnedAt && (
            <p className="mt-1 text-xs text-onyx-400">
              {formatDateTime(o.returnedAt)}
            </p>
          )}
        </td>
        <td className="px-5 py-3.5 text-right">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 rounded-lg border border-onyx-200 px-3 py-1.5 text-xs font-semibold text-onyx-700 transition-colors hover:border-ember-300 hover:text-ember-600"
          >
            {open ? "Hide" : "View"}
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
            />
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="bg-onyx-50/40 px-5 py-5">
            <OrderDetail order={o} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Mobile card ── */
function MobileCard({
  order: o,
  open,
  view,
  busy,
  onToggle,
  onStatus,
}: {
  order: Order;
  open: boolean;
  view: View;
  busy: boolean;
  onToggle: () => void;
  onStatus: (s: OrderStatus) => void;
}) {
  const count = o.items.reduce((s, i) => s + i.quantity, 0);
  return (
    <div className="overflow-hidden rounded-2xl border border-onyx-100 bg-white shadow-card">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-bold text-onyx-950">{o.orderNo}</p>
          <p className="mt-0.5 text-xs text-onyx-400">
            {formatDateTime(o.createdAt)}
          </p>
          <p className="mt-2 text-sm font-semibold text-onyx-900">
            {o.customerName || "—"}
          </p>
          <p className="text-xs text-onyx-500">{o.customerPhone}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-onyx-900">
            {formatPrice(o.total, o.currency)}
          </p>
          <p className="mt-0.5 text-xs text-onyx-400">
            {count} item{count === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-onyx-50 px-4 py-3">
        <StatusControl order={o} busy={busy} onStatus={onStatus} />
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1.5 rounded-lg border border-onyx-200 px-3 py-1.5 text-xs font-semibold text-onyx-700"
        >
          {open ? "Hide" : "View"}
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>
      {open && (
        <div className="border-t border-onyx-50 bg-onyx-50/40 p-4">
          <OrderDetail order={o} />
        </div>
      )}
    </div>
  );
}

/* ── Status <select> ── */
function StatusControl({
  order,
  busy,
  onStatus,
}: {
  order: Order;
  busy: boolean;
  onStatus: (s: OrderStatus) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
          STATUS_TONE[order.status],
        )}
      >
        {order.status}
      </span>
      <div className="relative">
        <select
          value={order.status}
          disabled={busy}
          onChange={(e) => onStatus(e.target.value as OrderStatus)}
          aria-label={`Change status for ${order.orderNo}`}
          className="h-8 rounded-lg border border-onyx-200 bg-white pl-2 pr-6 text-xs font-semibold text-onyx-700 outline-none transition-colors focus:border-ember-500 disabled:opacity-50"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {busy && (
          <Loader2 className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-onyx-400" />
        )}
      </div>
    </div>
  );
}

/* ── Expanded detail: items + shipping + totals ── */
function OrderDetail({ order: o }: { order: Order }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Items */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-onyx-400">
          Items
        </p>
        <div className="space-y-2">
          {o.items.map((i) => (
            <ItemRow key={i.id} item={i} />
          ))}
        </div>
        <dl className="mt-4 space-y-1.5 border-t border-onyx-100 pt-3 text-sm">
          <Line label="Subtotal" value={formatPrice(o.subtotal, o.currency)} />
          <Line label="Delivery" value={formatPrice(o.delivery, o.currency)} />
          {o.discount > 0 && (
            <Line
              label={`Discount${o.promoCode ? ` (${o.promoCode})` : ""}`}
              value={`− ${formatPrice(o.discount, o.currency)}`}
            />
          )}
          <div className="flex items-center justify-between border-t border-onyx-100 pt-2 text-base font-bold text-onyx-950">
            <span>Total</span>
            <span>{formatPrice(o.total, o.currency)}</span>
          </div>
        </dl>
      </div>

      {/* Customer & shipping */}
      <div className="space-y-4 text-sm">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-onyx-400">
            Contact
          </p>
          <p className="font-semibold text-onyx-900">{o.customerName || "—"}</p>
          {o.customerEmail && (
            <p className="mt-1 flex items-center gap-1.5 text-onyx-600">
              <Mail className="h-3.5 w-3.5 text-onyx-400" />
              {o.customerEmail}
            </p>
          )}
          <p className="mt-0.5 flex items-center gap-1.5 text-onyx-600">
            <Phone className="h-3.5 w-3.5 text-onyx-400" />
            {o.customerPhone || "—"}
          </p>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-onyx-400">
            Shipping
          </p>
          <p className="flex items-start gap-1.5 text-onyx-600">
            <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-onyx-400" />
            <span>
              {[o.address, o.city, o.region, o.postcode, o.country]
                .filter(Boolean)
                .join(", ") || "—"}
            </span>
          </p>
          <p className="mt-1.5 text-xs text-onyx-400">
            Delivery zone: {o.deliveryZone === "outside" ? "Outside Dhaka" : "Inside Dhaka"}
            {" · "}Payment: {o.paymentMethod || "—"}
          </p>
        </div>
        {o.returnReason && (
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-onyx-400">
              Return reason
            </p>
            <p className="text-onyx-600">{o.returnReason}</p>
          </div>
        )}
        {o.notes && (
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-onyx-400">
              Notes
            </p>
            <p className="text-onyx-600">{o.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemRow({ item: i }: { item: OrderItem }) {
  const variant = [i.size, i.color].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-3 rounded-xl border border-onyx-100 bg-white p-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={i.image || "/placeholder.svg"}
        alt=""
        className="h-12 w-12 flex-shrink-0 rounded-lg object-cover ring-1 ring-onyx-100"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-onyx-900">{i.name}</p>
        {variant && <p className="text-xs text-onyx-400">{variant}</p>}
      </div>
      <div className="text-right text-sm">
        <p className="text-onyx-500">
          {i.quantity} × {formatPrice(i.unitPrice, i.currency)}
        </p>
        <p className="font-bold text-onyx-900">
          {formatPrice(i.lineTotal, i.currency)}
        </p>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-onyx-600">
      <span>{label}</span>
      <span className="font-medium text-onyx-800">{value}</span>
    </div>
  );
}
