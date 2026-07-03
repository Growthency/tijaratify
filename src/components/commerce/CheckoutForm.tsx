"use client";

import { useMemo, useState } from "react";
import {
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useCart, cartSubtotal, cartHasPaidDelivery, cartPromoDiscount } from "@/lib/store/cart";
import { useSettings } from "@/components/providers/SettingsProvider";
import { cn, formatPrice } from "@/lib/utils";
import type { PlacedOrder } from "./OrderConfirmation";

/* ──────────────────────────────────────────────────────────────────────────
   Jolchap — Demo checkout
   Contact + shipping + (demo) payment with inline validation. On submit it
   saves the order, then hands it up to the cart page (via onPlaced) which swaps
   the view for the order-success screen and empties the bag. No real payment
   is taken.
   ────────────────────────────────────────────────────────────────────────── */

interface Fields {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
  card: string;
  exp: string;
  cvc: string;
}

const EMPTY: Fields = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  region: "",
  postcode: "",
  country: "Bangladesh",
  card: "",
  exp: "",
  cvc: "",
};

type Errors = Partial<Record<keyof Fields, string>>;

export function CheckoutForm({
  onPlaced,
}: {
  onPlaced?: (info: PlacedOrder) => void;
}) {
  const { items, clear, promoCode, deliveryZone } = useCart();
  const { delivery: rates } = useSettings();
  const subtotal = cartSubtotal(items);
  const currency = items[0]?.currency ?? "BDT";

  const delivery = cartHasPaidDelivery(items)
    ? deliveryZone === "outside"
      ? rates.outsideDhaka
      : rates.insideDhaka
    : 0;
  const { discount } = cartPromoDiscount(items, promoCode);
  const total = Math.max(0, subtotal + delivery - discount);

  const [values, setValues] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "processing">("idle");
  // Fallback reference used if the order can't be saved server-side; the real
  // stored number replaces it when the API responds.
  const [orderNo] = useState(
    () => `JC-${Math.floor(100000 + Math.random() * 900000)}`
  );

  const set =
    (key: keyof Fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      let v = e.target.value;
      if (key === "card") v = formatCard(v);
      if (key === "exp") v = formatExp(v);
      if (key === "cvc") v = v.replace(/\D/g, "").slice(0, 4);
      setValues((s) => ({ ...s, [key]: v }));
      if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
    };

  const validate = (): boolean => {
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Enter your full name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      next.email = "Enter a valid email";
    if (values.phone.replace(/\D/g, "").length < 7)
      next.phone = "Enter a valid phone number";
    if (!values.address.trim()) next.address = "Enter your street address";
    if (!values.city.trim()) next.city = "Required";
    if (!values.region.trim()) next.region = "Required";
    if (!values.postcode.trim()) next.postcode = "Required";
    if (!values.country.trim()) next.country = "Required";
    if (values.card.replace(/\s/g, "").length < 15)
      next.card = "Enter a 16-digit card number";
    if (!/^\d{2}\s?\/\s?\d{2}$/.test(values.exp)) next.exp = "MM / YY";
    if (values.cvc.length < 3) next.cvc = "3–4 digits";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "processing") return;
    if (!validate()) {
      toast.error("Please check the highlighted fields");
      return;
    }
    setStatus("processing");

    // Save the order (no card details are sent or stored).
    const payload = {
      customerName: values.name,
      customerEmail: values.email,
      customerPhone: values.phone,
      address: values.address,
      city: values.city,
      region: values.region,
      postcode: values.postcode,
      country: values.country,
      deliveryZone,
      subtotal,
      delivery,
      discount,
      total,
      currency,
      promoCode,
      paymentMethod: "card",
      items: items.map((i) => ({
        productId: i.productId,
        slug: i.slug,
        name: i.name,
        image: i.image,
        quantity: i.quantity,
        unitPrice: i.price,
        lineTotal: i.price * i.quantity,
        size: i.size,
        color: i.color,
        currency: i.currency,
      })),
    };

    let placedOrderNo = orderNo;
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.orderNo) placedOrderNo = data.orderNo;
    } catch {
      // Never block the customer — show the success screen even if saving hiccuped.
    }

    // Hand the finished order up to the cart page, which swaps the whole view
    // for the success screen; then empty the bag.
    onPlaced?.({
      orderNo: placedOrderNo,
      firstName,
      email: values.email,
      total: formatPrice(total, currency),
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
      deliveryZone,
    });
    clear();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const firstName = useMemo(
    () => values.name.trim().split(/\s+/)[0] || "there",
    [values.name]
  );

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {/* Contact */}
      <Fieldset
        step={1}
        icon={<User className="h-4 w-4" />}
        title="Contact"
        hint="Order updates & tracking are sent here."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Full name"
            className="sm:col-span-2"
            value={values.name}
            onChange={set("name")}
            error={errors.name}
            autoComplete="name"
            placeholder="Rahim Ahmed"
          />
          <Field
            label="Email"
            type="email"
            value={values.email}
            onChange={set("email")}
            error={errors.email}
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Field
            label="Phone"
            type="tel"
            value={values.phone}
            onChange={set("phone")}
            error={errors.phone}
            autoComplete="tel"
            placeholder="+880 1700 000000"
          />
        </div>
      </Fieldset>

      {/* Shipping */}
      <Fieldset
        step={2}
        icon={<MapPin className="h-4 w-4" />}
        title="Delivery address"
        hint="Where should we deliver your order?"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Street address"
            className="sm:col-span-2"
            value={values.address}
            onChange={set("address")}
            error={errors.address}
            autoComplete="address-line1"
            placeholder="House 12, Road 4, Dhanmondi"
          />
          <Field
            label="City"
            value={values.city}
            onChange={set("city")}
            error={errors.city}
            autoComplete="address-level2"
            placeholder="Dhaka"
          />
          <Field
            label="District / Area"
            value={values.region}
            onChange={set("region")}
            error={errors.region}
            autoComplete="address-level1"
            placeholder="Dhaka"
          />
          <Field
            label="Postcode"
            value={values.postcode}
            onChange={set("postcode")}
            error={errors.postcode}
            autoComplete="postal-code"
            placeholder="1209"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-onyx-400">
              Country
            </label>
            <select
              value={values.country}
              onChange={set("country")}
              autoComplete="country-name"
              className="h-12 rounded-xl border border-onyx-200 bg-white px-3.5 text-sm font-medium text-onyx-900 outline-none transition-colors focus:border-onyx-950"
            >
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Fieldset>

      {/* Payment */}
      <Fieldset
        step={3}
        icon={<CreditCard className="h-4 w-4" />}
        title="Payment"
        hint="Demo only — no card is charged."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Card number"
            className="sm:col-span-2"
            value={values.card}
            onChange={set("card")}
            error={errors.card}
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            adornment={<CreditCard className="h-4 w-4 text-onyx-400" />}
          />
          <Field
            label="Expiry"
            value={values.exp}
            onChange={set("exp")}
            error={errors.exp}
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM / YY"
          />
          <Field
            label="CVC"
            value={values.cvc}
            onChange={set("cvc")}
            error={errors.cvc}
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
          />
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-onyx-400">
          <Lock className="h-3.5 w-3.5" />
          Secured with 256-bit encryption. This is a demo storefront — use any test details.
        </p>
      </Fieldset>

      <button
        type="submit"
        disabled={status === "processing" || items.length === 0}
        className="group/btn relative inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-ember-500 text-base font-bold text-white shadow-glow-sm transition-all hover:bg-ember-600 hover:shadow-glow active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
      >
        {status === "processing" ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Pay {formatPrice(total, currency)}
          </>
        )}
      </button>
    </form>
  );
}

/* ── Form primitives ── */
function Fieldset({
  step,
  icon,
  title,
  hint,
  children,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-3xl border border-onyx-100 bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-onyx-950 text-white">
          {icon}
        </span>
        <div>
          <p className="flex items-center gap-2 text-base font-bold leading-tight text-onyx-950">
            <span className="text-onyx-300">{step}.</span> {title}
          </p>
          {hint && <p className="text-xs text-onyx-400">{hint}</p>}
        </div>
      </div>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  className,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  adornment,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  className?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  adornment?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-[11px] font-bold uppercase tracking-widest text-onyx-400">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={!!error}
          className={cn(
            "h-12 w-full rounded-xl border bg-white px-3.5 text-sm font-medium text-onyx-900 outline-none transition-colors placeholder:font-normal placeholder:text-onyx-300",
            adornment && "pr-10",
            error
              ? "border-ember-500 focus:border-ember-500"
              : "border-onyx-200 focus:border-onyx-950"
          )}
        />
        {adornment && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
            {adornment}
          </span>
        )}
      </div>
      {error && <p className="text-xs font-medium text-ember-600">{error}</p>}
    </div>
  );
}

/* ── formatting helpers ── */
function formatCard(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExp(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)} / ${d.slice(2)}`;
}

const COUNTRIES = [
  "Bangladesh",
  "India",
  "United States",
  "Canada",
  "United Kingdom",
  "Ireland",
  "Australia",
  "New Zealand",
  "Germany",
  "France",
  "Netherlands",
  "Spain",
  "Italy",
  "United Arab Emirates",
];
