"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Sparkles,
  Stamp,
  Coffee,
  Shirt,
  Mail,
  PencilRuler,
  ShieldCheck,
  Truck,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { cn, whatsappLink } from "@/lib/utils";
import { useSettings } from "@/components/providers/SettingsProvider";

/* ──────────────────────────────────────────────────────────────────────────
   Jolchap — Order confirmation

   Replaces the whole cart page once an order is placed. It reads like a short,
   warm note from the small Dhaka studio team who will actually make the order:
   a celebratory success moment, a heartfelt personalised thank-you, the order
   details, a made-to-order "what happens next" (free design preview → printed
   & quality-checked → on its way), a WhatsApp line for any last tweak, and a
   genuinely inviting "keep shopping" block pointing to the three things we love
   making most — stamps & seals, mugs & drinkware, and printed apparel.
   ────────────────────────────────────────────────────────────────────────── */

export interface PlacedOrder {
  orderNo: string;
  firstName: string;
  email: string;
  total: string;
  itemCount: number;
  deliveryZone: "inside" | "outside";
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function OrderConfirmation({
  orderNo,
  firstName,
  email,
  total,
  itemCount,
  deliveryZone,
}: PlacedOrder) {
  const { contact } = useSettings();

  const itemLabel = itemCount === 1 ? "1 piece" : `${itemCount} pieces`;
  const deliveryLine =
    deliveryZone === "inside"
      ? "You're inside Dhaka, so it won't have far to travel once it's ready."
      : "You're outside Dhaka — we'll pack it with extra care for the journey across Bangladesh.";

  const waHref = whatsappLink(
    contact.whatsapp,
    `Hi Jolchap! This is ${firstName} about my order ${orderNo}. `
  );

  return (
    <div className="bg-bone">
      <Container className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl">
          {/* ── Success moment ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="overflow-hidden rounded-3xl border border-onyx-100 bg-onyx-950 shadow-card"
          >
            <div className="relative px-6 py-14 text-center text-white sm:px-12">
              {/* ambient ember glows */}
              <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-ember-500/25 blur-[90px]" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-ember-500/20 blur-[90px]" />

              <SuccessMark />

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
                className="relative mt-7 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-ember-50/80"
              >
                <Sparkles className="h-3.5 w-3.5 text-ember-500" />
                Order placed · From our Dhaka studio
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: 0.5, ease: EASE }}
                className="relative mt-3 text-3xl font-extrabold uppercase tracking-tightest text-white sm:text-4xl"
              >
                Made with love, {firstName}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.46, duration: 0.5, ease: EASE }}
                className="relative mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/70"
              >
                This is the part we love most — the moment your idea starts becoming
                something real. Your order&apos;s in our hands now, and we couldn&apos;t
                be happier to make it for you. We&apos;ve sent the details to{" "}
                <span className="font-semibold text-white">{email}</span> — do keep an
                eye out for your free design preview.
              </motion.p>

              {/* order summary chip */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.5, ease: EASE }}
                className="relative mx-auto mt-8 flex max-w-md flex-wrap items-center justify-center gap-x-8 gap-y-4 rounded-2xl bg-white/5 px-6 py-5 ring-1 ring-white/10 sm:justify-between"
              >
                <div className="text-center sm:text-left">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">
                    Order number
                  </p>
                  <p className="mt-1 text-lg font-extrabold tracking-tight text-white">
                    {orderNo}
                  </p>
                </div>
                <div className="hidden h-9 w-px bg-white/10 sm:block" />
                <div className="text-center sm:text-left">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">
                    Total
                  </p>
                  <p className="mt-1 text-lg font-extrabold tracking-tight text-white">
                    {total}
                  </p>
                </div>
                <div className="hidden h-9 w-px bg-white/10 sm:block" />
                <div className="text-center sm:text-left">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">
                    In your order
                  </p>
                  <p className="mt-1 text-lg font-extrabold tracking-tight text-white">
                    {itemLabel}
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* ── What happens next ── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5, ease: EASE }}
            className="mt-6 rounded-3xl border border-onyx-100 bg-white p-6 shadow-card sm:p-8"
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-onyx-400">
              What happens next
            </p>
            <h2 className="mt-2 text-xl font-extrabold uppercase tracking-tightest text-onyx-950 sm:text-2xl">
              Made to order, right here in Dhaka
            </h2>

            <ol className="mt-6 space-y-6">
              <Step
                icon={<PencilRuler className="h-4 w-4" />}
                title="We design your preview"
                copy="Our studio team gets on it right away and sends you a free design preview to look over. Nothing goes to print until you love it."
                done
              />
              <Step
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Printed & quality-checked by hand"
                copy="Once you give the nod, we craft your pieces one at a time and check every detail ourselves — it only leaves the studio once we'd be proud to hand it to you."
              />
              <Step
                icon={<Truck className="h-4 w-4" />}
                title="On its way to you"
                copy={`Then it's carefully packed and sent out with fast delivery across Bangladesh. ${deliveryLine}`}
                last
              />
            </ol>

            {/* WhatsApp "tweak your design" helper */}
            <div className="mt-7 flex flex-col gap-3 rounded-2xl bg-onyx-50 p-4 ring-1 ring-onyx-100 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ember-50 text-ember-600">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <p className="text-sm leading-relaxed text-onyx-500">
                  Want to tweak a colour, a spelling or anything on the design? Message
                  us and we&apos;ll sort it together before we make it.
                </p>
              </div>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-onyx-200 px-5 py-2.5 text-sm font-bold text-onyx-900 transition-colors hover:border-onyx-950"
              >
                <MessageCircle className="h-4 w-4" />
                Chat on WhatsApp
              </a>
            </div>
          </motion.section>

          {/* ── Keep shopping — the hero invitation ── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5, ease: EASE }}
            className="mt-6 rounded-3xl border border-onyx-100 bg-white p-6 shadow-card sm:p-8"
          >
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ember-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-ember-700">
                <Sparkles className="h-3.5 w-3.5" />
                This is just the start
              </span>
              <h2 className="mt-4 text-2xl font-extrabold uppercase tracking-tightest text-onyx-950 sm:text-3xl">
                See what else you can make
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-onyx-500">
                Every piece we make is designed with you and crafted to order, with a
                free design preview before you pay. Have a look at the three things
                Jolchap loves making most — your next favourite thing is one design away.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <CraftCard
                href="/category/seals-stamps"
                icon={<Stamp className="h-5 w-5" />}
                title="Stamps & Seals"
                copy="Rubber, self-inking and wax seals, cut to your mark."
              />
              <CraftCard
                href="/category/drinkware"
                icon={<Coffee className="h-5 w-5" />}
                title="Mugs & Drinkware"
                copy="Photo mugs and magic cups made to say something."
              />
              <CraftCard
                href="/category/apparel"
                icon={<Shirt className="h-5 w-5" />}
                title="Printed Apparel"
                copy="Cotton tees and couple sets, printed to order."
              />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/shop"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-ember-500 px-7 py-3.5 text-sm font-bold text-white shadow-glow-sm transition-all hover:bg-ember-600 hover:shadow-glow active:scale-[0.99]"
              >
                Explore the shop
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-onyx-950 px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-onyx-800"
              >
                Back to home
              </Link>
            </div>
          </motion.section>

          {/* ── Signed-off footer note ── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="mx-auto mt-8 flex max-w-md items-center justify-center gap-2 text-center text-sm text-onyx-400"
          >
            <Mail className="h-4 w-4 shrink-0" />
            Made with care in Dhaka — thank you for choosing Jolchap. Keep order{" "}
            <span className="font-bold text-onyx-600">{orderNo}</span> handy for anything
            you need from us.
          </motion.p>
        </div>
      </Container>
    </div>
  );
}

/* ── Animated success check: a pulsing ring, a spring-in badge and a soft
      burst of light for a genuine celebratory beat. ── */
function SuccessMark() {
  return (
    <div className="relative mx-auto grid h-24 w-24 place-items-center">
      <Confetti />

      {/* pulsing ring */}
      <motion.span
        initial={{ scale: 0.6, opacity: 0.6 }}
        animate={{ scale: 1.35, opacity: 0 }}
        transition={{ delay: 0.25, duration: 1.1, ease: "easeOut" }}
        className="absolute inset-0 rounded-full bg-ember-500/40"
      />

      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 13 }}
        className="relative grid h-20 w-20 place-items-center rounded-full bg-ember-500 shadow-glow"
      >
        <CheckCircle2 className="h-11 w-11 text-white" strokeWidth={2.2} />
      </motion.div>

      {/* sparkle accents */}
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.55, type: "spring", stiffness: 260, damping: 12 }}
        className="absolute -right-1 -top-1 text-ember-300"
      >
        <Sparkles className="h-5 w-5" />
      </motion.span>
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.7, type: "spring", stiffness: 260, damping: 12 }}
        className="absolute -bottom-0.5 -left-1.5 text-ember-300/80"
      >
        <Sparkles className="h-3.5 w-3.5" />
      </motion.span>
    </div>
  );
}

/* ── Soft confetti-of-light burst behind the check ── */
function Confetti() {
  const sparks = [
    { x: -46, y: -34, d: 0.5 },
    { x: 44, y: -30, d: 0.56 },
    { x: -50, y: 18, d: 0.62 },
    { x: 50, y: 24, d: 0.58 },
    { x: 0, y: -54, d: 0.54 },
    { x: -30, y: 44, d: 0.66 },
    { x: 32, y: 46, d: 0.6 },
    { x: 56, y: -6, d: 0.64 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0">
      {sparks.map((s, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
          animate={{ x: s.x, y: s.y, scale: [0, 1, 0.9], opacity: [0, 1, 0] }}
          transition={{ delay: s.d, duration: 1.1, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember-500"
          style={{ boxShadow: "0 0 8px 1px rgba(249,115,22,0.6)" }}
        />
      ))}
    </div>
  );
}

/* ── "What happens next" step ── */
function Step({
  icon,
  title,
  copy,
  done = false,
  last = false,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  done?: boolean;
  last?: boolean;
}) {
  return (
    <li className="relative flex gap-4">
      {!last && (
        <span className="absolute left-[15px] top-9 h-[calc(100%-4px)] w-px bg-onyx-100" />
      )}
      <span
        className={cn(
          "relative grid h-8 w-8 shrink-0 place-items-center rounded-full",
          done ? "bg-ember-500 text-white shadow-glow-sm" : "bg-onyx-100 text-onyx-500"
        )}
      >
        {icon}
      </span>
      <div className="pb-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-onyx-950">{title}</p>
          {done && (
            <span className="rounded-full bg-ember-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ember-600">
              Now
            </span>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-onyx-500">{copy}</p>
      </div>
    </li>
  );
}

/* ── Discovery card for one of the three crafts ── */
function CraftCard({
  href,
  icon,
  title,
  copy,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl bg-onyx-50 p-5 ring-1 ring-onyx-100 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-card hover:ring-ember-200"
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-ember-600 ring-1 ring-onyx-100 transition-colors group-hover:bg-ember-500 group-hover:text-white group-hover:ring-ember-500">
        {icon}
      </span>
      <p className="mt-4 text-base font-bold text-onyx-950">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-onyx-500">{copy}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-onyx-400 transition-colors group-hover:text-ember-600">
        Browse
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
