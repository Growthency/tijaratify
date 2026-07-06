"use client";

import { useMemo, useState } from "react";
import {
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  User,
  Wallet,
  Banknote,
  Smartphone,
  Landmark,
  LocateFixed,
  MapPinned,
} from "lucide-react";
import { toast } from "sonner";
import { useCart, cartSubtotal, cartHasPaidDelivery, cartPromoDiscount } from "@/lib/store/cart";
import { useSettings } from "@/components/providers/SettingsProvider";
import { cn, formatPrice } from "@/lib/utils";
import type { PaymentSettings } from "@/lib/settings";
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
  /** Mobile-wallet / bank fields (used per selected payment method). */
  payNumber: string;
  trxId: string;
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
  payNumber: "",
  trxId: "",
};

type Errors = Partial<Record<keyof Fields, string>>;

/** Payment methods the customer can pick from at checkout. */
type PaymentKey = "cod" | "bkash" | "nagad" | "rocket" | "bank" | "card";

const METHOD_LABEL: Record<PaymentKey, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  bank: "Bank Transfer",
  card: "Card",
};

/** The first enabled method, used as the default selection. */
function firstMethod(p: PaymentSettings): PaymentKey {
  if (p.cashOnDelivery) return "cod";
  if (p.bkash.enabled) return "bkash";
  if (p.nagad.enabled) return "nagad";
  if (p.rocket.enabled) return "rocket";
  if (p.bank.enabled) return "bank";
  return "card";
}

export function CheckoutForm({
  onPlaced,
}: {
  onPlaced?: (info: PlacedOrder) => void;
}) {
  const { items, clear, promoCode, deliveryZone } = useCart();
  const { delivery: rates, payments } = useSettings();
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
  const [method, setMethod] = useState<PaymentKey>(() => firstMethod(payments));
  // Exact GPS drop-pin (via "use my location"), saved with the order so the
  // courier can navigate to the precise spot.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLink, setMapLink] = useState("");
  const [locating, setLocating] = useState(false);

  const isWallet = method === "bkash" || method === "nagad" || method === "rocket";
  const selectedWallet =
    method === "bkash"
      ? payments.bkash
      : method === "nagad"
        ? payments.nagad
        : method === "rocket"
          ? payments.rocket
          : null;

  const methodOptions: {
    key: PaymentKey;
    label: string;
    hint: string;
    icon: React.ReactNode;
  }[] = [];
  if (payments.cashOnDelivery)
    methodOptions.push({ key: "cod", label: "Cash on Delivery", hint: "Pay when it arrives", icon: <Banknote className="h-4 w-4" /> });
  if (payments.bkash.enabled)
    methodOptions.push({ key: "bkash", label: "bKash", hint: "Send Money", icon: <Smartphone className="h-4 w-4" /> });
  if (payments.nagad.enabled)
    methodOptions.push({ key: "nagad", label: "Nagad", hint: "Send Money", icon: <Smartphone className="h-4 w-4" /> });
  if (payments.rocket.enabled)
    methodOptions.push({ key: "rocket", label: "Rocket", hint: "Send Money", icon: <Smartphone className="h-4 w-4" /> });
  if (payments.bank.enabled)
    methodOptions.push({ key: "bank", label: "Bank Transfer", hint: "Direct deposit", icon: <Landmark className="h-4 w-4" /> });
  if (payments.card)
    methodOptions.push({ key: "card", label: "Card", hint: "Demo checkout", icon: <CreditCard className="h-4 w-4" /> });

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

  /** Turn on the device location, drop an exact pin, and prefill the area. */
  const pinLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        setMapLink(`https://www.google.com/maps?q=${lat},${lng}`);
        // Best-effort reverse geocode (free, no key) to prefill city / area.
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
          );
          const g = await res.json();
          setValues((s) => ({
            ...s,
            city: s.city.trim() || g.city || g.locality || s.city,
            region:
              s.region.trim() ||
              g.locality ||
              g.principalSubdivision ||
              s.region,
          }));
        } catch {
          /* the exact pin is what matters — ignore geocode failures */
        }
        setLocating(false);
        toast.success("Location pinned — thank you!");
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Allow location access to pin your exact spot, or type your address."
            : "Couldn't get your location — please type your address.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
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

    // Payment fields depend on the chosen method.
    if (method === "card") {
      if (values.card.replace(/\s/g, "").length < 15)
        next.card = "Enter a 16-digit card number";
      if (!/^\d{2}\s?\/\s?\d{2}$/.test(values.exp)) next.exp = "MM / YY";
      if (values.cvc.length < 3) next.cvc = "3–4 digits";
    } else if (isWallet) {
      if (values.payNumber.replace(/\D/g, "").length < 11)
        next.payNumber = "Enter the number you paid from";
      if (values.trxId.trim().length < 4)
        next.trxId = "Enter the Transaction ID";
    } else if (method === "bank") {
      if (values.trxId.trim().length < 3)
        next.trxId = "Enter your transfer reference";
    }
    // Cash on Delivery needs nothing extra.

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

    // Build a short payment reference to store alongside the order (no card
    // details are ever sent or stored).
    let paymentNote = "";
    if (method === "cod") paymentNote = "Cash on delivery — collect on arrival.";
    else if (isWallet)
      paymentNote = `${METHOD_LABEL[method]} · Sender: ${values.payNumber} · TrxID: ${values.trxId}`;
    else if (method === "bank")
      paymentNote = `Bank transfer · Ref: ${values.trxId}`;

    const payload = {
      customerName: values.name,
      customerEmail: values.email,
      customerPhone: values.phone,
      address: values.address,
      city: values.city,
      region: values.region,
      postcode: values.postcode,
      country: values.country,
      mapLink,
      deliveryZone,
      subtotal,
      delivery,
      discount,
      total,
      currency,
      promoCode,
      paymentMethod: METHOD_LABEL[method],
      notes: paymentNote,
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
        {/* Exact-location pin */}
        <div className="mb-5 rounded-2xl border border-dashed border-onyx-200 bg-onyx-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-ember-600" />
              <p className="text-sm text-onyx-600">
                <span className="font-semibold text-onyx-900">
                  Pin your exact location
                </span>{" "}
                — turn on location so the courier reaches you faster.
              </p>
            </div>
            <button
              type="button"
              onClick={pinLocation}
              disabled={locating}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-onyx-950 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-onyx-800 disabled:opacity-60"
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              {coords ? "Update location" : "Use my location"}
            </button>
          </div>

          {coords && (
            <div className="mt-4">
              <div className="overflow-hidden rounded-xl border border-onyx-100">
                <iframe
                  title="Your delivery location"
                  src={`https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=16&output=embed`}
                  className="block h-44 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                  <MapPinned className="h-3.5 w-3.5" />
                  Exact location pinned
                </span>
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-ember-600 underline-offset-2 hover:underline"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>
          )}
        </div>

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
        icon={<Wallet className="h-4 w-4" />}
        title="Payment"
        hint="Choose how you'd like to pay."
      >
        {/* Method selector */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {methodOptions.map((m) => {
            const active = method === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  setMethod(m.key);
                  setErrors({});
                }}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-2.5 rounded-2xl border px-3 py-3 text-left transition-colors",
                  active
                    ? "border-ember-500 bg-ember-50 ring-1 ring-ember-500"
                    : "border-onyx-200 hover:border-onyx-300"
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors",
                    active ? "bg-ember-500 text-white" : "bg-onyx-100 text-onyx-500"
                  )}
                >
                  {m.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-onyx-950">
                    {m.label}
                  </span>
                  <span className="block truncate text-[11px] text-onyx-400">
                    {m.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Method-specific panel */}
        <div className="mt-5">
          {method === "cod" && (
            <p className="flex items-start gap-2.5 rounded-2xl bg-onyx-50 p-4 text-sm text-onyx-600 ring-1 ring-onyx-100">
              <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-ember-600" />
              Pay in cash when your order arrives. We&apos;ll confirm it and start
              making your order right away.
            </p>
          )}

          {isWallet && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-onyx-50 p-4 text-sm leading-relaxed text-onyx-600 ring-1 ring-onyx-100">
                {selectedWallet?.number ? (
                  <p>
                    <span className="font-semibold text-onyx-950">Send Money</span> to
                    our {METHOD_LABEL[method]} number{" "}
                    <span className="select-all font-bold text-ember-700">
                      {selectedWallet.number}
                    </span>
                    , then enter your number and the Transaction ID below.
                  </p>
                ) : (
                  <p>
                    Send Money via {METHOD_LABEL[method]}, then enter your number and
                    the Transaction ID below. We&apos;ll share our {METHOD_LABEL[method]}{" "}
                    number with you on WhatsApp to confirm.
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={`Your ${METHOD_LABEL[method]} number`}
                  value={values.payNumber}
                  onChange={set("payNumber")}
                  error={errors.payNumber}
                  inputMode="tel"
                  placeholder="01XXXXXXXXX"
                />
                <Field
                  label="Transaction ID (TrxID)"
                  value={values.trxId}
                  onChange={set("trxId")}
                  error={errors.trxId}
                  placeholder="e.g. 9F2K7ABCDE"
                />
              </div>
            </div>
          )}

          {method === "bank" && (
            <div className="space-y-4">
              {payments.bank.details ? (
                <div className="rounded-2xl bg-onyx-50 p-4 text-sm text-onyx-600 ring-1 ring-onyx-100">
                  <p className="mb-1 font-semibold text-onyx-950">Transfer to</p>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {payments.bank.details}
                  </p>
                </div>
              ) : (
                <p className="rounded-2xl bg-onyx-50 p-4 text-sm leading-relaxed text-onyx-600 ring-1 ring-onyx-100">
                  Make your bank transfer, then enter the reference below. We&apos;ll
                  share our account details with you on WhatsApp to confirm.
                </p>
              )}
              <Field
                label="Transfer reference / TrxID"
                value={values.trxId}
                onChange={set("trxId")}
                error={errors.trxId}
                placeholder="Your transfer reference"
              />
            </div>
          )}

          {method === "card" && (
            <div className="space-y-4">
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
              <p className="flex items-center gap-2 text-xs text-onyx-400">
                <Lock className="h-3.5 w-3.5" />
                Secured with 256-bit encryption. This is a demo card — no real charge
                is taken.
              </p>
            </div>
          )}
        </div>
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
        ) : method === "cod" ? (
          <>Place order · {formatPrice(total, currency)}</>
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
