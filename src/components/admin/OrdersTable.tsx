"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Search,
  Package,
  Mail,
  Phone,
  MapPin,
  Printer,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { cn, formatPrice, formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/admin/AdminUI";
import { useSettings } from "@/components/providers/SettingsProvider";
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
  const brandName = useSettings().brand.name;

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

  async function changePaid(order: Order, paid: boolean) {
    if (paid === order.paid) return;
    setBusy(order.id);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, paid }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");

      const updated: Order = data.order;
      setRows((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      toast.success(
        `Order ${order.orderNo} marked ${paid ? "paid" : "unpaid"}`,
      );
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
                  brandName={brandName}
                  onToggle={() => toggle(o.id)}
                  onStatus={(s) => changeStatus(o, s)}
                  onPaid={(p) => changePaid(o, p)}
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
            brandName={brandName}
            onToggle={() => toggle(o.id)}
            onStatus={(s) => changeStatus(o, s)}
            onPaid={(p) => changePaid(o, p)}
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
  brandName,
  onToggle,
  onStatus,
  onPaid,
}: {
  order: Order;
  open: boolean;
  count: number;
  view: View;
  busy: boolean;
  brandName: string;
  onToggle: () => void;
  onStatus: (s: OrderStatus) => void;
  onPaid: (paid: boolean) => void;
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
        <td className="px-3 py-3.5">
          <p className="font-bold text-onyx-900">
            {formatPrice(o.total, o.currency)}
          </p>
          <div className="mt-1">
            <PaidBadge paid={o.paid} />
          </div>
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
            <OrderDetail
              order={o}
              busy={busy}
              brandName={brandName}
              onPaid={onPaid}
            />
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
  brandName,
  onToggle,
  onStatus,
  onPaid,
}: {
  order: Order;
  open: boolean;
  view: View;
  busy: boolean;
  brandName: string;
  onToggle: () => void;
  onStatus: (s: OrderStatus) => void;
  onPaid: (paid: boolean) => void;
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
        <div className="flex flex-col items-end text-right">
          <p className="font-bold text-onyx-900">
            {formatPrice(o.total, o.currency)}
          </p>
          <p className="mt-0.5 text-xs text-onyx-400">
            {count} item{count === 1 ? "" : "s"}
          </p>
          <div className="mt-1.5">
            <PaidBadge paid={o.paid} />
          </div>
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
          <OrderDetail
            order={o}
            busy={busy}
            brandName={brandName}
            onPaid={onPaid}
          />
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
function OrderDetail({
  order: o,
  busy,
  brandName,
  onPaid,
}: {
  order: Order;
  busy: boolean;
  brandName: string;
  onPaid: (paid: boolean) => void;
}) {
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
            Delivery zone:{" "}
            {o.deliveryZone === "outside" ? "Outside Dhaka" : "Inside Dhaka"}
          </p>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-onyx-400">
            Payment
          </p>
          <p className="font-semibold text-onyx-900">{o.paymentMethod || "—"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PaidBadge paid={o.paid} />
            <button
              type="button"
              disabled={busy}
              onClick={() => onPaid(!o.paid)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors disabled:opacity-50",
                o.paid
                  ? "border-onyx-200 text-onyx-600 hover:border-onyx-300"
                  : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
              )}
            >
              {busy && <Loader2 className="h-3 w-3 animate-spin" />}
              {o.paid ? "Mark as unpaid" : "Mark as paid"}
            </button>
          </div>
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
        <div className="pt-1">
          <button
            type="button"
            onClick={() => printSlip(o, brandName)}
            className="inline-flex items-center gap-2 rounded-lg border border-onyx-200 bg-white px-3.5 py-2 text-xs font-bold text-onyx-800 shadow-sm transition-colors hover:border-ember-300 hover:text-ember-600"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / download delivery slip
          </button>
        </div>
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

/* ── Paid / Unpaid pill ── */
function PaidBadge({ paid }: { paid: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
        paid
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-amber-50 text-amber-700 ring-amber-200",
      )}
    >
      {paid ? "Paid" : "Unpaid"}
    </span>
  );
}

/* Escape user-supplied text before it goes into the printable slip markup. */
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Open a clean, printable delivery slip in a new window (Print → Save as PDF to
 * download). It carries everything the delivery person needs: who to deliver to,
 * the address & phone, the items, and — crucially — whether to collect cash
 * (Cash on Delivery) or not (already paid online).
 */
function printSlip(o: Order, brandName: string) {
  const isCOD = /cash on delivery/i.test(o.paymentMethod);
  const address =
    [o.address, o.city, o.region, o.postcode, o.country]
      .filter(Boolean)
      .join(", ") || "—";
  const zone = o.deliveryZone === "outside" ? "Outside Dhaka" : "Inside Dhaka";
  const date = formatDateTime(o.createdAt);

  const itemRows = o.items
    .map((i) => {
      const variant = [i.size, i.color].filter(Boolean).join(" · ");
      return `<tr>
        <td class="q">${i.quantity}×</td>
        <td class="n">${esc(i.name)}${variant ? `<span>${esc(variant)}</span>` : ""}</td>
        <td class="p">${esc(formatPrice(i.lineTotal, i.currency))}</td>
      </tr>`;
    })
    .join("");

  const discountRow =
    o.discount > 0
      ? `<div class="row"><span>Discount${o.promoCode ? ` (${esc(o.promoCode)})` : ""}</span><span>− ${esc(formatPrice(o.discount, o.currency))}</span></div>`
      : "";

  const collect = isCOD
    ? `<div class="collect cod"><span class="lbl">Collect on delivery (Cash)</span><span class="amt">${esc(formatPrice(o.total, o.currency))}</span></div>`
    : `<div class="collect prepaid"><span class="lbl">Paid online — ${esc(o.paymentMethod || "Prepaid")}</span><span class="amt">${o.paid ? "PAID" : "Do not collect cash"}</span></div>`;

  const notes = o.notes ? `<div class="notes"><b>Notes:</b> ${esc(o.notes)}</div>` : "";

  const html = `<!doctype html>
<html><head><meta charset="utf-8" />
<title>Delivery slip ${esc(o.orderNo)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #0c141b; }
  .slip { max-width: 420px; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0c141b; padding-bottom: 10px; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
  .doc { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280; }
  .meta { display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px; color: #6b7280; }
  .meta b { color: #0c141b; }
  .to { margin-top: 14px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; }
  .to .lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280; }
  .to .name { font-size: 17px; font-weight: 800; margin-top: 3px; }
  .to .phone { font-size: 15px; font-weight: 700; margin-top: 2px; }
  .to .addr { font-size: 13px; margin-top: 4px; line-height: 1.4; }
  .to .zone { font-size: 11px; color: #6b7280; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding: 0 0 6px; }
  td { padding: 6px 0; border-bottom: 1px solid #f1f3f5; vertical-align: top; }
  td.q { width: 34px; font-weight: 700; }
  td.n span { display: block; font-size: 11px; color: #6b7280; }
  td.p { text-align: right; white-space: nowrap; font-weight: 600; }
  .totals { margin-top: 10px; font-size: 13px; }
  .row { display: flex; justify-content: space-between; padding: 2px 0; color: #4b5563; }
  .grand { display: flex; justify-content: space-between; padding: 8px 0 0; margin-top: 6px; border-top: 1px solid #0c141b; font-size: 16px; font-weight: 800; }
  .collect { margin-top: 14px; border-radius: 10px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; }
  .collect .lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
  .collect .amt { font-size: 18px; font-weight: 800; }
  .collect.cod { background: #fef3c7; color: #92400e; }
  .collect.prepaid { background: #ecfdf5; color: #065f46; }
  .notes { margin-top: 12px; font-size: 12px; color: #4b5563; line-height: 1.4; }
  .foot { margin-top: 18px; text-align: center; font-size: 11px; color: #9ca3af; }
  @media print { body { padding: 0; } .slip { max-width: none; } }
</style></head>
<body onload="window.focus();window.print();">
  <div class="slip">
    <div class="head">
      <div class="brand">${esc(brandName)}</div>
      <div class="doc">Delivery Slip</div>
    </div>
    <div class="meta">
      <span>Order <b>${esc(o.orderNo)}</b></span>
      <span>${esc(date)}</span>
    </div>
    <div class="to">
      <div class="lbl">Deliver to</div>
      <div class="name">${esc(o.customerName || "—")}</div>
      <div class="phone">${esc(o.customerPhone || "—")}</div>
      <div class="addr">${esc(address)}</div>
      <div class="zone">${esc(zone)}</div>
    </div>
    <table>
      <thead><tr><th>Qty</th><th>Item</th><th style="text-align:right">Price</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${esc(formatPrice(o.subtotal, o.currency))}</span></div>
      <div class="row"><span>Delivery</span><span>${esc(formatPrice(o.delivery, o.currency))}</span></div>
      ${discountRow}
      <div class="grand"><span>Total</span><span>${esc(formatPrice(o.total, o.currency))}</span></div>
    </div>
    ${collect}
    ${notes}
    <div class="foot">Thank you — ${esc(brandName)}</div>
  </div>
</body></html>`;

  const w = window.open("", "_blank", "width=480,height=720");
  if (!w) {
    toast.error("Allow pop-ups to print the delivery slip.");
    return;
  }
  w.document.write(html);
  w.document.close();
}
