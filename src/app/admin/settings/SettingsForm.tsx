"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Palette } from "lucide-react";
import { toast } from "sonner";

import { updateSettings } from "@/app/admin/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { deriveAccentScale, DEFAULT_ACCENT, ACCENT_STEPS } from "@/lib/theme";
import type { ResolvedSettings } from "@/lib/settings";
import {
  Field,
  FormSection,
  Toggle,
  StringListEditor,
  fieldInput,
  fieldArea,
} from "@/components/admin/FormKit";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { NotConfiguredNotice } from "@/components/admin/AdminUI";
import { cn } from "@/lib/utils";

const PRESETS = [
  DEFAULT_ACCENT, // teal
  "#4F46E5", // indigo
  "#2563EB", // blue
  "#0EA5E9", // sky
  "#059669", // emerald
  "#CA8A04", // gold
  "#EA580C", // orange
  "#E11D48", // rose
  "#DB2777", // pink
  "#7C3AED", // violet
  "#16A34A", // green
  "#0F172A", // slate
];

export function SettingsForm({ initial }: { initial: ResolvedSettings }) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [s, setS] = useState<ResolvedSettings>(initial);
  const [pending, startTransition] = useTransition();

  // Live-preview the accent across the admin while editing; revert on leave.
  useEffect(() => {
    const scale = deriveAccentScale(s.brand.accentColor);
    const root = document.documentElement;
    ACCENT_STEPS.forEach((k) => root.style.setProperty(`--ember-${k}`, scale[k]));
    return () => {
      ACCENT_STEPS.forEach((k) => root.style.removeProperty(`--ember-${k}`));
    };
  }, [s.brand.accentColor]);

  const setBrand = <K extends keyof ResolvedSettings["brand"]>(k: K, v: ResolvedSettings["brand"][K]) =>
    setS((p) => ({ ...p, brand: { ...p.brand, [k]: v } }));
  const setContact = <K extends keyof ResolvedSettings["contact"]>(k: K, v: ResolvedSettings["contact"][K]) =>
    setS((p) => ({ ...p, contact: { ...p.contact, [k]: v } }));
  const setAddress = <K extends keyof ResolvedSettings["contact"]["address"]>(k: K, v: string) =>
    setS((p) => ({ ...p, contact: { ...p.contact, address: { ...p.contact.address, [k]: v } } }));
  const setSocial = <K extends keyof ResolvedSettings["socials"]>(k: K, v: string) =>
    setS((p) => ({ ...p, socials: { ...p.socials, [k]: v } }));
  const setHero = <K extends keyof ResolvedSettings["hero"]>(k: K, v: ResolvedSettings["hero"][K]) =>
    setS((p) => ({ ...p, hero: { ...p.hero, [k]: v } }));
  const setDelivery = (k: keyof ResolvedSettings["delivery"], v: string) =>
    setS((p) => ({ ...p, delivery: { ...p.delivery, [k]: Number(v) || 0 } }));
  const setPayFlag = (k: "cashOnDelivery" | "card", v: boolean) =>
    setS((p) => ({ ...p, payments: { ...p.payments, [k]: v } }));
  const setWallet = (
    k: "bkash" | "nagad" | "rocket",
    field: "enabled" | "number",
    v: boolean | string
  ) =>
    setS((p) => ({
      ...p,
      payments: { ...p.payments, [k]: { ...p.payments[k], [field]: v } },
    }));
  const setBank = (field: "enabled" | "details", v: boolean | string) =>
    setS((p) => ({
      ...p,
      payments: { ...p.payments, bank: { ...p.payments.bank, [field]: v } },
    }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      toast.error("Connect Supabase to save settings.");
      return;
    }
    startTransition(async () => {
      const result = await updateSettings(s);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Settings saved — your site is updated.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-4">
      {/* Header / save */}
      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-4 bg-bone/80 px-1 py-1 backdrop-blur sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ember-600">Settings</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-tightest text-onyx-950 sm:text-3xl">
            Store settings
          </h1>
          <p className="mt-1.5 text-sm text-onyx-500">
            Change your brand, colours, contact &amp; socials — applied across the whole site.
          </p>
        </div>
        <button
          type="submit"
          disabled={pending || !configured}
          className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-ember-500 px-6 text-sm font-semibold text-white shadow-glow-sm transition-all hover:bg-ember-600 hover:shadow-glow disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </button>
      </div>

      {!configured && (
        <NotConfiguredNotice detail="You can edit everything below, but saving needs a live Supabase project + the site_settings table (run supabase/settings.sql)." />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Brand */}
        <FormSection title="Brand">
          <Field label="Brand name" htmlFor="name" required>
            <input id="name" value={s.brand.name} onChange={(e) => setBrand("name", e.target.value)} className={fieldInput} />
          </Field>
          <Field label="Legal name" htmlFor="legalName" hint="Used in the footer copyright">
            <input id="legalName" value={s.brand.legalName} onChange={(e) => setBrand("legalName", e.target.value)} className={fieldInput} />
          </Field>
          <Field label="Tagline" htmlFor="tagline">
            <input id="tagline" value={s.brand.tagline} onChange={(e) => setBrand("tagline", e.target.value)} className={fieldInput} />
          </Field>
          <Field label="Short description" htmlFor="shortDescription" hint="Social share / meta description">
            <textarea id="shortDescription" rows={2} value={s.brand.shortDescription} onChange={(e) => setBrand("shortDescription", e.target.value)} className={fieldArea} />
          </Field>
          <Field label="Description" htmlFor="description" hint="Footer & SEO">
            <textarea id="description" rows={3} value={s.brand.description} onChange={(e) => setBrand("description", e.target.value)} className={fieldArea} />
          </Field>
        </FormSection>

        {/* Colour */}
        <div className="space-y-6">
          <FormSection title="Brand colour" description="Pick one accent — the whole site re-themes to match. Preview is live here.">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(s.brand.accentColor) ? s.brand.accentColor : DEFAULT_ACCENT}
                onChange={(e) => setBrand("accentColor", e.target.value)}
                className="h-12 w-14 cursor-pointer rounded-lg border border-onyx-200 bg-white p-1"
                aria-label="Pick accent colour"
              />
              <input
                value={s.brand.accentColor}
                onChange={(e) => setBrand("accentColor", e.target.value)}
                className={cn(fieldInput, "w-32 font-mono uppercase")}
                placeholder="#0E8388"
              />
              <button
                type="button"
                onClick={() => setBrand("accentColor", DEFAULT_ACCENT)}
                className="text-xs font-semibold text-onyx-500 underline hover:text-ember-600"
              >
                Reset
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBrand("accentColor", c)}
                  style={{ background: c }}
                  aria-label={c}
                  className={cn(
                    "h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-white transition-transform hover:scale-110",
                    s.brand.accentColor.toLowerCase() === c.toLowerCase() ? "ring-onyx-900" : "ring-transparent"
                  )}
                />
              ))}
            </div>

            {/* live sample */}
            <div className="mt-1 flex items-center gap-4 rounded-2xl bg-onyx-50/60 p-4">
              <button type="button" className="rounded-full bg-ember-500 px-4 py-2 text-sm font-bold text-white">
                Sample button
              </button>
              <span className="text-sm font-bold text-ember-600">Accent link</span>
              <Palette className="ml-auto h-5 w-5 text-ember-500" />
            </div>
          </FormSection>

          <FormSection title="Logo" description="Upload a logo to replace the built-in seal. Leave empty to keep the Jolchap mark.">
            <ImageUploader value={s.brand.logoUrl} onChange={(url) => setBrand("logoUrl", url)} label="Logo image" />
          </FormSection>
        </div>

        {/* Contact */}
        <FormSection title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="phone">
              <input id="phone" value={s.contact.phone} onChange={(e) => setContact("phone", e.target.value)} className={fieldInput} />
            </Field>
            <Field label="WhatsApp" htmlFor="whatsapp" hint="Floating button + checkout">
              <input id="whatsapp" value={s.contact.whatsapp} onChange={(e) => setContact("whatsapp", e.target.value)} className={fieldInput} />
            </Field>
          </div>
          <Field label="Email" htmlFor="email">
            <input id="email" value={s.contact.email} onChange={(e) => setContact("email", e.target.value)} className={fieldInput} />
          </Field>
          <Field label="WhatsApp greeting" htmlFor="wamsg" hint="Pre-filled chat message">
            <input id="wamsg" value={s.contact.whatsappMessage} onChange={(e) => setContact("whatsappMessage", e.target.value)} className={fieldInput} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address line" htmlFor="line1">
              <input id="line1" value={s.contact.address.line1} onChange={(e) => setAddress("line1", e.target.value)} className={fieldInput} />
            </Field>
            <Field label="City" htmlFor="city">
              <input id="city" value={s.contact.address.city} onChange={(e) => setAddress("city", e.target.value)} className={fieldInput} />
            </Field>
            <Field label="Region" htmlFor="region">
              <input id="region" value={s.contact.address.region} onChange={(e) => setAddress("region", e.target.value)} className={fieldInput} />
            </Field>
            <Field label="Postcode" htmlFor="postcode">
              <input id="postcode" value={s.contact.address.postcode} onChange={(e) => setAddress("postcode", e.target.value)} className={fieldInput} />
            </Field>
          </div>
          <Field label="Opening hours" htmlFor="hours">
            <input id="hours" value={s.contact.hours} onChange={(e) => setContact("hours", e.target.value)} className={fieldInput} />
          </Field>
        </FormSection>

        {/* Socials */}
        <FormSection title="Social channels">
          <Field label="Instagram" htmlFor="instagram">
            <input id="instagram" value={s.socials.instagram} onChange={(e) => setSocial("instagram", e.target.value)} className={fieldInput} />
          </Field>
          <Field label="Facebook" htmlFor="facebook">
            <input id="facebook" value={s.socials.facebook} onChange={(e) => setSocial("facebook", e.target.value)} className={fieldInput} />
          </Field>
          <Field label="YouTube" htmlFor="youtube">
            <input id="youtube" value={s.socials.youtube} onChange={(e) => setSocial("youtube", e.target.value)} className={fieldInput} />
          </Field>
          <Field label="TikTok" htmlFor="tiktok">
            <input id="tiktok" value={s.socials.tiktok} onChange={(e) => setSocial("tiktok", e.target.value)} className={fieldInput} />
          </Field>
          <Field label="X (Twitter)" htmlFor="x">
            <input id="x" value={s.socials.x} onChange={(e) => setSocial("x", e.target.value)} className={fieldInput} />
          </Field>
        </FormSection>
      </div>

      {/* Hero banner — full width */}
      <FormSection
        title="Hero banner"
        description="Upload banner image(s) for the homepage hero. Add more than one for an auto-playing slideshow. Leave empty to keep the default product showcase."
      >
        <ImageUploader multiple value={s.hero.images} onChange={(urls) => setHero("images", urls)} label="Banner images" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            checked={s.hero.float}
            onChange={(v) => setHero("float", v)}
            label="Floating effect"
            description="Gentle up-and-down motion"
          />
          <Toggle
            checked={s.hero.autoplay}
            onChange={(v) => setHero("autoplay", v)}
            label="Auto-play slideshow"
            description="Advance images automatically"
          />
        </div>
      </FormSection>

      {/* Product badges */}
      <FormSection
        title="Product badges"
        description="The ribbon labels you can put on products. Add or remove them here — they appear in the product editor's Badge dropdown."
      >
        <StringListEditor
          items={s.badges}
          onChange={(items) => setS((p) => ({ ...p, badges: items }))}
          placeholder="Bestseller"
          addLabel="Add badge"
        />
      </FormSection>

      {/* Delivery charges */}
      <FormSection
        title="Delivery charges"
        description="Charged once per order. A product marked “Free delivery” skips it. The customer picks their zone (inside / outside Dhaka) in the cart."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Inside Dhaka (৳)" htmlFor="insideDhaka">
            <input
              id="insideDhaka"
              inputMode="decimal"
              value={String(s.delivery.insideDhaka)}
              onChange={(e) => setDelivery("insideDhaka", e.target.value)}
              placeholder="60"
              className={fieldInput}
            />
          </Field>
          <Field label="Outside Dhaka (৳)" htmlFor="outsideDhaka">
            <input
              id="outsideDhaka"
              inputMode="decimal"
              value={String(s.delivery.outsideDhaka)}
              onChange={(e) => setDelivery("outsideDhaka", e.target.value)}
              placeholder="120"
              className={fieldInput}
            />
          </Field>
        </div>
      </FormSection>

      {/* Payment methods */}
      <FormSection
        title="Payment methods"
        description="Choose how customers can pay at checkout. For bKash / Nagad / Rocket, enter the number they should Send Money to — it is shown to them on the payment step."
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-onyx-100 p-3">
            <Toggle
              checked={s.payments.cashOnDelivery}
              onChange={(v) => setPayFlag("cashOnDelivery", v)}
              label="Cash on Delivery"
              description="Pay in cash when the order arrives"
            />
          </div>

          <WalletField
            name="bKash"
            wallet={s.payments.bkash}
            onToggle={(v) => setWallet("bkash", "enabled", v)}
            onNumber={(v) => setWallet("bkash", "number", v)}
          />
          <WalletField
            name="Nagad"
            wallet={s.payments.nagad}
            onToggle={(v) => setWallet("nagad", "enabled", v)}
            onNumber={(v) => setWallet("nagad", "number", v)}
          />
          <WalletField
            name="Rocket"
            wallet={s.payments.rocket}
            onToggle={(v) => setWallet("rocket", "enabled", v)}
            onNumber={(v) => setWallet("rocket", "number", v)}
          />

          <div className="space-y-3 rounded-2xl border border-onyx-100 p-3">
            <Toggle
              checked={s.payments.bank.enabled}
              onChange={(v) => setBank("enabled", v)}
              label="Bank transfer"
              description="Show your bank account details at checkout"
            />
            {s.payments.bank.enabled && (
              <Field label="Bank account details" htmlFor="bankDetails">
                <textarea
                  id="bankDetails"
                  value={s.payments.bank.details}
                  onChange={(e) => setBank("details", e.target.value)}
                  placeholder="Bank name • Account name • Account number • Branch / routing"
                  rows={3}
                  className={fieldArea}
                />
              </Field>
            )}
          </div>

          <div className="rounded-2xl border border-onyx-100 p-3">
            <Toggle
              checked={s.payments.card}
              onChange={(v) => setPayFlag("card", v)}
              label="Card (demo)"
              description="Demo card form — no real charge is taken"
            />
          </div>
        </div>
      </FormSection>
    </form>
  );
}

function WalletField({
  name,
  wallet,
  onToggle,
  onNumber,
}: {
  name: string;
  wallet: { enabled: boolean; number: string };
  onToggle: (v: boolean) => void;
  onNumber: (v: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-onyx-100 p-3">
      <Toggle
        checked={wallet.enabled}
        onChange={onToggle}
        label={name}
        description={`Customer sends money via ${name}`}
      />
      {wallet.enabled && (
        <Field label={`${name} number (Send Money to)`} htmlFor={`pay-${name}`}>
          <input
            id={`pay-${name}`}
            inputMode="tel"
            value={wallet.number}
            onChange={(e) => onNumber(e.target.value)}
            placeholder="01XXXXXXXXX"
            className={fieldInput}
          />
        </Field>
      )}
    </div>
  );
}
