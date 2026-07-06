import type { Category, NavGroup, NavLink } from "@/types";
import type { MenuItem } from "@/lib/settings"; // type-only — no runtime cycle

/**
 * Single source of truth for brand-level content.
 * Anything a client would routinely change (phone, WhatsApp, address, socials)
 * is read from env first so it can be configured without touching code —
 * see .env.local.example for every key.
 */

const env = (key: string, fallback: string) =>
  (process.env[key] && process.env[key]!.trim()) || fallback;

/**
 * The canonical production origin — feeds metadataBase, canonical, og:image,
 * sitemap and robots. Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL (set this in Vercel to your exact live domain)
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel's production domain, so OG/canonical
 *      auto-point at the real deployed host even if the env var isn't set
 *   3. the built-in default
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "https://jolchap.com.bd";
}

export const siteConfig = {
  name: "Jolchap",
  legalName: "Jolchap Lifestyle",
  tagline: "Make It Yours",
  shortDescription:
    "Custom seals & stamps, personalised apparel, mugs, bags and gifts — designed with you and made to order in Dhaka.",
  description:
    "Jolchap is a Dhaka-based custom print & personalisation studio. From rubber stamps and wax seals to printed t-shirts, photo mugs, tote bags and gifts — we turn your idea into something you can hold. Free design preview, nationwide delivery.",
  url: resolveSiteUrl(),
  established: 2019,
  ogImage: "/images/og/jolchap-og.webp",

  contact: {
    phone: env("NEXT_PUBLIC_CONTACT_PHONE", "+880 1700-000000"),
    email: env("NEXT_PUBLIC_CONTACT_EMAIL", "hello@jolchap.com.bd"),
    whatsapp: env("NEXT_PUBLIC_WHATSAPP_NUMBER", "+880 1700-000000"),
    whatsappMessage:
      "Hi Jolchap 👋 — I'd like to customise a product. Can you help me get started?",
    address: {
      line1: "Shop 12, Level 4, Bashundhara City",
      city: "Dhaka",
      region: "Dhaka",
      postcode: "1215",
      country: "Bangladesh",
    },
    hours: "Sat–Thu · 10:00–20:00",
  },

  socials: {
    instagram: env("NEXT_PUBLIC_SOCIAL_INSTAGRAM", "https://instagram.com/"),
    facebook: env("NEXT_PUBLIC_SOCIAL_FACEBOOK", "https://www.facebook.com/jolchaplifestyle"),
    youtube: env("NEXT_PUBLIC_SOCIAL_YOUTUBE", "https://youtube.com/"),
    tiktok: env("NEXT_PUBLIC_SOCIAL_TIKTOK", "https://tiktok.com/"),
    x: env("NEXT_PUBLIC_SOCIAL_X", "https://x.com/"),
  },

  /** Trust signals surfaced under the hero and at checkout. */
  trust: [
    { label: "Free design preview before you pay", icon: "PencilRuler" },
    { label: "Fast delivery across Bangladesh", icon: "Truck" },
    { label: "Quality-checked, satisfaction guaranteed", icon: "BadgeCheck" },
    { label: "Trusted by 8,000+ happy customers", icon: "Gift" },
  ],
} as const;

/** Primary mega-menu (modelled on a full custom-print catalogue). */
export const mainNav: NavGroup[] = [
  {
    label: "Seals & Stamps",
    href: "/category/seals-stamps",
    featured: {
      title: "Custom Round Rubber Stamp",
      href: "/product/custom-round-rubber-stamp",
      image: "/images/products/custom-round-rubber-stamp-1.webp",
      copy: "Your logo or text, laser-cut for a crisp, lasting impression.",
    },
    columns: [
      {
        heading: "Stamps",
        links: [
          { label: "Rubber Stamps", href: "/category/seals-stamps?type=rubber" },
          { label: "Self-Inking Stamps", href: "/category/seals-stamps?type=self-inking" },
          { label: "Pre-Inked Stamps", href: "/category/seals-stamps?type=pre-inked" },
          { label: "Date & Address Stamps", href: "/category/seals-stamps?type=date" },
        ],
      },
      {
        heading: "Seals",
        links: [
          { label: "Wax Seal Kits", href: "/category/seals-stamps?type=wax" },
          { label: "Monogram Brass Seals", href: "/category/seals-stamps?type=monogram" },
          { label: "Company Seals", href: "/category/seals-stamps?type=company" },
        ],
      },
    ],
  },
  {
    label: "Apparel",
    href: "/category/apparel",
    featured: {
      title: "Couple Matching T-Shirts",
      href: "/product/couple-matching-tshirts",
      image: "/images/products/couple-matching-tshirts-1.webp",
      copy: "Your design, your colours — made to order in soft cotton.",
    },
    columns: [
      {
        heading: "Tops",
        links: [
          { label: "Custom T-Shirts", href: "/category/apparel?type=tshirt" },
          { label: "Couple Tees", href: "/category/apparel?type=couple" },
          { label: "Family Combo", href: "/category/apparel?type=family" },
          { label: "Printed Panjabi", href: "/category/apparel?type=panjabi" },
        ],
      },
      {
        heading: "Outerwear",
        links: [
          { label: "Custom Hoodies", href: "/category/apparel?type=hoodie" },
          { label: "Team Jerseys", href: "/category/apparel?type=jersey" },
        ],
      },
    ],
  },
  {
    label: "Mugs & Bottles",
    href: "/category/drinkware",
    columns: [
      {
        heading: "Drinkware",
        links: [
          { label: "Photo Mugs", href: "/category/drinkware?type=mug" },
          { label: "Magic Mugs", href: "/category/drinkware?type=magic" },
          { label: "Steel Bottles", href: "/category/drinkware?type=bottle" },
          { label: "Tumblers", href: "/category/drinkware?type=tumbler" },
        ],
      },
    ],
  },
  {
    label: "Bags",
    href: "/category/bags",
  },
  {
    label: "Gifts",
    href: "/category/gifts",
    columns: [
      {
        heading: "Personalised Gifts",
        links: [
          { label: "Photo Frames", href: "/category/gifts?type=frame" },
          { label: "Engraved Keychains", href: "/category/gifts?type=keychain" },
          { label: "Name Plates", href: "/category/gifts?type=nameplate" },
          { label: "Gift Hampers", href: "/category/gifts?type=hamper" },
        ],
      },
    ],
  },
  {
    label: "Stationery",
    href: "/category/stationery",
  },
  {
    label: "Blog",
    href: "/blog",
  },
  {
    label: "Offers",
    href: "/shop?sale=true",
  },
];

/** Footer link architecture. */
export const footerNav: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Shop",
    links: [
      { label: "Seals & Stamps", href: "/category/seals-stamps" },
      { label: "Custom Apparel", href: "/category/apparel" },
      { label: "Mugs & Bottles", href: "/category/drinkware" },
      { label: "Bags", href: "/category/bags" },
      { label: "Personalised Gifts", href: "/category/gifts" },
      { label: "Business & Stationery", href: "/category/stationery" },
      { label: "New Arrivals", href: "/shop?sort=new" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "How to Order", href: "/faq" },
      { label: "Delivery & Shipping", href: "/shipping" },
      { label: "Returns & Refunds", href: "/returns" },
      { label: "Artwork & File Guide", href: "/size-guide" },
      { label: "Track Your Order", href: "/orders" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Our Story", href: "/about" },
      { label: "The Jolchap Journal", href: "/blog" },
      { label: "Corporate & Bulk Orders", href: "/contact#wholesale" },
      { label: "Become a Reseller", href: "/contact#affiliate" },
      { label: "Reviews", href: "/about#reviews" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Shipping Policy", href: "/shipping" },
      { label: "Refund Policy", href: "/returns" },
    ],
  },
];

/**
 * Header / mobile navigation, built from the live category list. Every category
 * collapses under a single "Categories" dropdown, with Home / Blog / Offers
 * alongside — so adding a category just adds it to that dropdown.
 */
export function buildMainNav(categories: Pick<Category, "slug" | "name">[]): NavGroup[] {
  return [
    { label: "Home", href: "/" },
    {
      label: "Categories",
      href: "/shop",
      columns: [
        {
          heading: "Shop by category",
          links: categories.map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
        },
      ],
    },
    { label: "Blog", href: "/blog" },
    { label: "Offers", href: "/shop?sale=true" },
  ];
}

/**
 * Convert a flat, depth-tagged custom menu into the header's NavGroup shape:
 * depth-0 items become top-level links; deeper items become dropdown links
 * under the nearest top-level item above them.
 */
export function menuToNav(items: MenuItem[]): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const it of items) {
    if (it.depth <= 0 || groups.length === 0) {
      groups.push({ label: it.label, href: it.href });
    } else {
      const parent = groups[groups.length - 1];
      const links: NavLink[] = [
        ...(parent.columns?.[0]?.links ?? []),
        { label: it.label, href: it.href },
      ];
      groups[groups.length - 1] = {
        ...parent,
        columns: [{ heading: parent.label, links }],
      };
    }
  }
  return groups;
}

/** The site's main nav: a custom menu if the owner built one, else the default. */
export function resolveMainNav(
  menu: MenuItem[],
  categories: Pick<Category, "slug" | "name">[]
): NavGroup[] {
  return menu && menu.length ? menuToNav(menu) : buildMainNav(categories);
}

/* ── Nested navigation tree (supports 3 levels: top → sub → sub-sub) ─────── */

export interface NavNode {
  label: string;
  href: string;
  children: NavNode[];
}

/** Default nav tree: Home, a Categories group (all categories), Blog, Offers. */
export function defaultNavTree(categories: Pick<Category, "slug" | "name">[]): NavNode[] {
  return [
    { label: "Home", href: "/", children: [] },
    {
      label: "Categories",
      href: "/shop",
      children: categories.map((c) => ({
        label: c.name,
        href: `/category/${c.slug}`,
        children: [],
      })),
    },
    { label: "Blog", href: "/blog", children: [] },
    { label: "Offers", href: "/shop?sale=true", children: [] },
  ];
}

/** Build a nested tree from the flat, depth-tagged custom menu. */
export function menuTree(items: MenuItem[]): NavNode[] {
  const root: NavNode[] = [];
  const lastAtDepth: NavNode[] = [];
  for (const it of items) {
    const node: NavNode = { label: it.label, href: it.href, children: [] };
    const d = Math.max(0, Math.min(2, Number(it.depth) || 0));
    if (d === 0 || !lastAtDepth[d - 1]) {
      root.push(node);
      lastAtDepth[0] = node;
      lastAtDepth.length = 1;
    } else {
      lastAtDepth[d - 1].children.push(node);
      lastAtDepth[d] = node;
      lastAtDepth.length = d + 1;
    }
  }
  return root;
}

/** The nav tree to render: the owner's custom menu if any, else the default. */
export function resolveNavTree(
  menu: MenuItem[],
  categories: Pick<Category, "slug" | "name">[]
): NavNode[] {
  return menu && menu.length ? menuTree(menu) : defaultNavTree(categories);
}

export type SiteConfig = typeof siteConfig;
