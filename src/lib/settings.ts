import { siteConfig } from "@/config/site";
import { DEFAULT_ACCENT } from "@/lib/theme";

/* ──────────────────────────────────────────────────────────────────────────
   Site settings model.

   Everything a store owner can change from the admin (brand, colours, contact,
   socials, hero banner, badge list) lives here. The DB stores only the OVERRIDES
   (a partial blob); `mergeSettings` layers them over these code defaults, so the
   site always renders even with an empty/missing settings row.

   This module is intentionally PURE (no server-only imports) so client
   components — the settings form, providers — can share the same types. The
   server reader `getSettings()` lives in `@/lib/queries`.
   ────────────────────────────────────────────────────────────────────────── */

export interface BrandSettings {
  name: string;
  legalName: string;
  tagline: string;
  description: string;
  shortDescription: string;
  /** Optional uploaded logo image. Empty string → use the built-in SVG mark. */
  logoUrl: string;
  /** Brand accent colour (hex). The whole UI keys off this. */
  accentColor: string;
}

export interface AddressSettings {
  line1: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
}

export interface ContactSettings {
  phone: string;
  email: string;
  whatsapp: string;
  whatsappMessage: string;
  address: AddressSettings;
  hours: string;
}

export interface SocialSettings {
  instagram: string;
  facebook: string;
  youtube: string;
  tiktok: string;
  x: string;
}

export interface HeroSettings {
  /** Banner images shown in the hero slideshow. Empty → built-in showcase card. */
  images: string[];
  /** Gentle up/down float animation on the banner. */
  float: boolean;
  /** Auto-advance the slideshow. */
  autoplay: boolean;
}

/** A single navigation menu entry. `depth` (0=top, 1=sub, 2=sub-sub) drives nesting. */
export interface MenuItem {
  id: string;
  label: string;
  href: string;
  depth: number;
}

/** Delivery charges by zone (per order; a product can override with free delivery). */
export interface DeliverySettings {
  insideDhaka: number;
  outsideDhaka: number;
}

/** A mobile-wallet method (bKash / Nagad / Rocket). */
export interface WalletMethod {
  enabled: boolean;
  /** The number the customer should "Send Money" to. */
  number: string;
}

/** Payment methods offered at checkout — the customer picks one. */
export interface PaymentSettings {
  /** Pay in cash when the order is delivered. */
  cashOnDelivery: boolean;
  bkash: WalletMethod;
  nagad: WalletMethod;
  rocket: WalletMethod;
  /** Bank transfer with free-text account details. */
  bank: { enabled: boolean; details: string };
  /** Demo card form — no real charge is taken. */
  card: boolean;
}

export interface ResolvedSettings {
  brand: BrandSettings;
  contact: ContactSettings;
  socials: SocialSettings;
  hero: HeroSettings;
  /** Custom navigation menu — empty means the default auto nav is used. */
  menu: MenuItem[];
  /** Selectable product ribbon labels, managed from the admin. */
  badges: string[];
  /** Delivery charges by zone (inside / outside Dhaka). */
  delivery: DeliverySettings;
  /** Checkout payment methods. */
  payments: PaymentSettings;
}

export type PartialSettings = {
  brand?: Partial<BrandSettings>;
  contact?: Partial<Omit<ContactSettings, "address">> & { address?: Partial<AddressSettings> };
  socials?: Partial<SocialSettings>;
  hero?: Partial<HeroSettings>;
  menu?: MenuItem[];
  badges?: string[];
  delivery?: Partial<DeliverySettings>;
  payments?: {
    cashOnDelivery?: boolean;
    bkash?: Partial<WalletMethod>;
    nagad?: Partial<WalletMethod>;
    rocket?: Partial<WalletMethod>;
    bank?: { enabled?: boolean; details?: string };
    card?: boolean;
  };
};

export const DEFAULT_BADGES = ["Bestseller", "Popular", "New", "Hot", "Sale", "Limited"];

/** Code defaults, derived from siteConfig — the floor every read merges onto. */
export const DEFAULT_SETTINGS: ResolvedSettings = {
  brand: {
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    tagline: siteConfig.tagline,
    description: siteConfig.description,
    shortDescription: siteConfig.shortDescription,
    logoUrl: "",
    accentColor: DEFAULT_ACCENT,
  },
  contact: {
    phone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
    whatsapp: siteConfig.contact.whatsapp,
    whatsappMessage: siteConfig.contact.whatsappMessage,
    address: { ...siteConfig.contact.address },
    hours: siteConfig.contact.hours,
  },
  socials: { ...siteConfig.socials },
  hero: { images: [], float: true, autoplay: true },
  menu: [],
  badges: DEFAULT_BADGES,
  delivery: { insideDhaka: 60, outsideDhaka: 120 },
  payments: {
    cashOnDelivery: true,
    bkash: { enabled: true, number: "" },
    nagad: { enabled: true, number: "" },
    rocket: { enabled: false, number: "" },
    bank: { enabled: false, details: "" },
    card: true,
  },
};

const str = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() ? v : fallback;

const bool = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : fallback;

/** Merge one wallet method; an empty string number is a valid "not set" override. */
function mergeWallet(p: Partial<WalletMethod> | undefined, d: WalletMethod): WalletMethod {
  return {
    enabled: bool(p?.enabled, d.enabled),
    number: typeof p?.number === "string" ? p.number : d.number,
  };
}

/** Layer a partial override blob over the code defaults into a full settings object. */
export function mergeSettings(p: PartialSettings | null | undefined): ResolvedSettings {
  const d = DEFAULT_SETTINGS;
  if (!p || typeof p !== "object") return d;
  return {
    brand: {
      name: str(p.brand?.name, d.brand.name),
      legalName: str(p.brand?.legalName, d.brand.legalName),
      tagline: str(p.brand?.tagline, d.brand.tagline),
      description: str(p.brand?.description, d.brand.description),
      shortDescription: str(p.brand?.shortDescription, d.brand.shortDescription),
      logoUrl: typeof p.brand?.logoUrl === "string" ? p.brand.logoUrl : d.brand.logoUrl,
      accentColor: str(p.brand?.accentColor, d.brand.accentColor),
    },
    contact: {
      phone: str(p.contact?.phone, d.contact.phone),
      email: str(p.contact?.email, d.contact.email),
      whatsapp: str(p.contact?.whatsapp, d.contact.whatsapp),
      whatsappMessage: str(p.contact?.whatsappMessage, d.contact.whatsappMessage),
      address: {
        line1: str(p.contact?.address?.line1, d.contact.address.line1),
        city: str(p.contact?.address?.city, d.contact.address.city),
        region: str(p.contact?.address?.region, d.contact.address.region),
        postcode: str(p.contact?.address?.postcode, d.contact.address.postcode),
        country: str(p.contact?.address?.country, d.contact.address.country),
      },
      hours: str(p.contact?.hours, d.contact.hours),
    },
    socials: {
      instagram: str(p.socials?.instagram, d.socials.instagram),
      facebook: str(p.socials?.facebook, d.socials.facebook),
      youtube: str(p.socials?.youtube, d.socials.youtube),
      tiktok: str(p.socials?.tiktok, d.socials.tiktok),
      x: str(p.socials?.x, d.socials.x),
    },
    hero: {
      images: Array.isArray(p.hero?.images) ? p.hero!.images.filter((s) => typeof s === "string") : d.hero.images,
      float: typeof p.hero?.float === "boolean" ? p.hero.float : d.hero.float,
      autoplay: typeof p.hero?.autoplay === "boolean" ? p.hero.autoplay : d.hero.autoplay,
    },
    menu: Array.isArray(p.menu)
      ? p.menu
          .filter((m) => m && typeof m.label === "string" && typeof m.href === "string")
          .map((m, i) => ({
            id: typeof m.id === "string" && m.id ? m.id : `m${i}`,
            label: m.label,
            href: m.href,
            depth: Math.max(0, Math.min(2, Number(m.depth) || 0)),
          }))
      : d.menu,
    badges: Array.isArray(p.badges) && p.badges.length
      ? p.badges.filter((s) => typeof s === "string" && s.trim())
      : d.badges,
    delivery: {
      insideDhaka: Math.max(0, Number(p.delivery?.insideDhaka ?? d.delivery.insideDhaka) || 0),
      outsideDhaka: Math.max(0, Number(p.delivery?.outsideDhaka ?? d.delivery.outsideDhaka) || 0),
    },
    payments: {
      cashOnDelivery: bool(p.payments?.cashOnDelivery, d.payments.cashOnDelivery),
      bkash: mergeWallet(p.payments?.bkash, d.payments.bkash),
      nagad: mergeWallet(p.payments?.nagad, d.payments.nagad),
      rocket: mergeWallet(p.payments?.rocket, d.payments.rocket),
      bank: {
        enabled: bool(p.payments?.bank?.enabled, d.payments.bank.enabled),
        details:
          typeof p.payments?.bank?.details === "string"
            ? p.payments.bank.details
            : d.payments.bank.details,
      },
      card: bool(p.payments?.card, d.payments.card),
    },
  };
}
