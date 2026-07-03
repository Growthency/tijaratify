"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { CheckoutForm } from "@/components/commerce/CheckoutForm";
import {
  OrderConfirmation,
  type PlacedOrder,
} from "@/components/commerce/OrderConfirmation";
import {
  useCart,
  lineKey,
  cartSubtotal,
  cartCount,
  cartHasPaidDelivery,
  cartPromoDiscount,
} from "@/lib/store/cart";
import { useSettings } from "@/components/providers/SettingsProvider";
import { cn, formatPrice } from "@/lib/utils";

export default function CartClient() {
  const { items, remove, setQty, promoCode, setPromoCode, deliveryZone, setDeliveryZone } =
    useCart();
  const { delivery: rates } = useSettings();
  const subtotal = cartSubtotal(items);
  const count = cartCount(items);
  const currency = items[0]?.currency ?? "BDT";

  const delivery = cartHasPaidDelivery(items)
    ? deliveryZone === "outside"
      ? rates.outsideDhaka
      : rates.insideDhaka
    : 0;
  const { discount, matched } = cartPromoDiscount(items, promoCode);
  const total = Math.max(0, subtotal + delivery - discount);

  const [promo, setPromo] = useState(promoCode);
  // Once an order is placed we keep its details here so the whole cart view is
  // replaced by the success screen — even though the bag has just been emptied.
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  const applyPromo = () => {
    const code = promo.trim();
    if (!code) return;
    const res = cartPromoDiscount(items, code);
    if (!res.matched) {
      setPromoCode("");
      toast.error("This code doesn't apply to anything in your bag.");
      return;
    }
    setPromoCode(code.toUpperCase());
    toast.success(`Promo applied — ${formatPrice(res.discount, currency)} off!`);
  };

  const clearPromo = () => {
    setPromo("");
    setPromoCode("");
  };

  /* ── Order placed → success screen (wins over the empty-bag view) ── */
  if (placed) {
    return <OrderConfirmation {...placed} />;
  }

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <div className="bg-bone">
        <Container className="py-7">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Shop", href: "/shop" },
              { label: "Cart" },
            ]}
          />
        </Container>
        <Container className="flex flex-col items-center justify-center px-6 py-20 text-center lg:py-28">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="grid h-24 w-24 place-items-center rounded-full bg-white shadow-card ring-1 ring-onyx-100"
          >
            <ShoppingBag className="h-10 w-10 text-onyx-300" />
          </motion.div>
          <h1 className="mt-7 text-3xl font-extrabold uppercase tracking-tightest text-onyx-950 sm:text-4xl">
            Your bag is empty
          </h1>
          <p className="mt-3 max-w-md text-onyx-500">
            Nothing in the bag yet. Browse our custom stamps, mugs, apparel and more.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-ember-500 px-7 py-3.5 text-sm font-bold text-white shadow-glow-sm transition-all hover:bg-ember-600 hover:shadow-glow"
          >
            Shop all products
            <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="mt-14 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
            <PerkCard icon={<Truck className="h-5 w-5" />} title="Fast delivery" copy="Across Bangladesh" />
            <PerkCard icon={<RotateCcw className="h-5 w-5" />} title="Easy returns" copy="On eligible items" />
            <PerkCard icon={<ShieldCheck className="h-5 w-5" />} title="Quality guaranteed" copy="Checked before we ship" />
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-bone">
      <Container className="py-7">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
            { label: "Cart" },
          ]}
        />
      </Container>

      <Container className="pb-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-extrabold uppercase tracking-tightest text-onyx-950 sm:text-4xl">
            Your bag
          </h1>
          <span className="text-sm text-onyx-500">
            <span className="font-bold text-onyx-950">{count}</span>{" "}
            {count === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_420px]">
          {/* ── Left: line items + checkout ── */}
          <div className="min-w-0">
            {/* items */}
            <ul className="divide-y divide-onyx-100 overflow-hidden rounded-3xl border border-onyx-100 bg-white">
              {items.map((item) => {
                const key = lineKey(item);
                const variant = [item.color, item.size].filter(Boolean).join(" · ");
                return (
                  <motion.li
                    key={key}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-4 p-4 sm:p-5"
                  >
                    <Link
                      href={`/product/${item.slug}`}
                      className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-bone ring-1 ring-onyx-100 sm:h-32 sm:w-28"
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/product/${item.slug}`}
                            className="line-clamp-2 text-[15px] font-bold leading-snug text-onyx-950 hover:text-ember-600"
                          >
                            {item.name}
                          </Link>
                          {variant && (
                            <p className="mt-1 text-xs font-medium text-onyx-400">
                              {variant}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            remove(key);
                            toast.success("Removed from bag");
                          }}
                          aria-label={`Remove ${item.name}`}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-onyx-300 transition-colors hover:bg-ember-50 hover:text-ember-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-auto flex items-end justify-between pt-3">
                        <div className="flex items-center rounded-full border border-onyx-200">
                          <button
                            onClick={() => setQty(key, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                            className="grid h-9 w-9 place-items-center rounded-l-full text-onyx-600 transition-colors hover:text-ember-600 disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => setQty(key, item.quantity + 1)}
                            aria-label="Increase quantity"
                            className="grid h-9 w-9 place-items-center rounded-r-full text-onyx-600 transition-colors hover:text-ember-600"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-base font-extrabold text-onyx-950">
                            {formatPrice(item.price * item.quantity, item.currency)}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-onyx-400">
                              {formatPrice(item.price, item.currency)} each
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>

            <div className="mt-5 flex items-center justify-between">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 text-sm font-semibold text-onyx-700 transition-colors hover:text-ember-600"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Continue shopping
              </Link>
            </div>

            {/* checkout */}
            <div id="checkout" className="mt-12">
              <h2 className="mb-6 text-2xl font-extrabold uppercase tracking-tightest text-onyx-950">
                Checkout
              </h2>
              <CheckoutForm onPlaced={setPlaced} />
            </div>
          </div>

          {/* ── Right: sticky summary ── */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-onyx-100 bg-white p-6 shadow-card">
              <h2 className="text-lg font-extrabold uppercase tracking-tight text-onyx-950">
                Order summary
              </h2>

              {/* promo */}
              <div className="mt-5">
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-onyx-400">
                  <Tag className="h-3.5 w-3.5" />
                  Promo code
                </label>
                <div className="flex gap-2">
                  <input
                    value={promo}
                    onChange={(e) => setPromo(e.target.value)}
                    placeholder="SAVE100"
                    className="h-11 flex-1 rounded-full border border-onyx-200 bg-white px-4 text-sm font-medium uppercase tracking-wide text-onyx-900 outline-none transition-colors placeholder:font-normal placeholder:tracking-normal placeholder:text-onyx-300 focus:border-onyx-950"
                  />
                  <button
                    onClick={applyPromo}
                    className="shrink-0 rounded-full bg-onyx-950 px-5 text-sm font-bold text-white transition-colors hover:bg-onyx-800"
                  >
                    Apply
                  </button>
                </div>
                {matched && (
                  <p className="mt-2 flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-ember-600">
                      &ldquo;{promoCode}&rdquo; applied — {formatPrice(discount, currency)} off
                    </span>
                    <button
                      onClick={clearPromo}
                      className="shrink-0 text-onyx-400 underline-offset-2 hover:text-ember-600 hover:underline"
                    >
                      Remove
                    </button>
                  </p>
                )}
              </div>

              {/* delivery zone */}
              <div className="mt-5">
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-onyx-400">
                  <Truck className="h-3.5 w-3.5" />
                  Delivery zone
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["inside", "outside"] as const).map((z) => (
                    <button
                      key={z}
                      onClick={() => setDeliveryZone(z)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                        deliveryZone === z
                          ? "border-ember-500 bg-ember-50 text-ember-700"
                          : "border-onyx-200 text-onyx-600 hover:border-onyx-300"
                      )}
                    >
                      {z === "inside" ? "Inside Dhaka" : "Outside Dhaka"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="my-5 hairline" />

              <dl className="space-y-3 text-sm">
                <Row label="Subtotal">{formatPrice(subtotal, currency)}</Row>
                <Row label="Delivery">
                  {delivery === 0 ? (
                    <span className="font-bold text-ember-600">Free</span>
                  ) : (
                    formatPrice(delivery, currency)
                  )}
                </Row>
                {discount > 0 && (
                  <Row label={`Discount (${promoCode})`}>
                    <span className="font-bold text-ember-600">
                      − {formatPrice(discount, currency)}
                    </span>
                  </Row>
                )}
              </dl>

              <div className="my-5 hairline" />

              <div className="flex items-end justify-between">
                <span className="text-sm font-bold uppercase tracking-wide text-onyx-950">
                  Total
                </span>
                <div className="text-right">
                  <span className="block text-2xl font-extrabold text-onyx-950">
                    {formatPrice(total, currency)}
                  </span>
                  <span className="text-xs text-onyx-400">
                    {currency} · delivery included
                  </span>
                </div>
              </div>

              <a
                href="#checkout"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ember-500 py-4 text-base font-bold text-white shadow-glow-sm transition-all hover:bg-ember-600 hover:shadow-glow"
              >
                Go to checkout
                <ArrowRight className="h-4 w-4" />
              </a>

              {/* trust */}
              <ul className="mt-6 space-y-2.5 text-xs text-onyx-500">
                <TrustLi icon={<ShieldCheck className="h-4 w-4 text-ember-500" />}>
                  Secure 256-bit encrypted checkout
                </TrustLi>
                <TrustLi icon={<RotateCcw className="h-4 w-4 text-ember-500" />}>
                  Easy returns &amp; exchanges
                </TrustLi>
                <TrustLi icon={<Truck className="h-4 w-4 text-ember-500" />}>
                  Fast delivery across Bangladesh
                </TrustLi>
              </ul>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-onyx-500">{label}</dt>
      <dd className="font-semibold text-onyx-950">{children}</dd>
    </div>
  );
}

function TrustLi({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2">
      {icon}
      {children}
    </li>
  );
}

function PerkCard({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-onyx-100 bg-white p-5 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-ember-50 text-ember-600">
        {icon}
      </span>
      <p className="text-sm font-bold text-onyx-950">{title}</p>
      <p className="text-xs text-onyx-500">{copy}</p>
    </div>
  );
}
