"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Shapes,
  Newspaper,
  ImageIcon,
  ListTree,
  Settings,
  Store,
  Menu,
  X,
  ShoppingCart,
  PackageCheck,
  Undo2,
  type LucideIcon,
} from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { SignOutButton } from "./SignOutButton";
import { useSettings } from "@/components/providers/SettingsProvider";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** match nested routes (e.g. /admin/products/new) */
  startsWith?: boolean;
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart, startsWith: true },
  { label: "Fulfilled", href: "/admin/fulfilled", icon: PackageCheck, startsWith: true },
  { label: "Returns", href: "/admin/returns", icon: Undo2, startsWith: true },
  { label: "Products", href: "/admin/products", icon: Package, startsWith: true },
  { label: "Categories", href: "/admin/categories", icon: Shapes, startsWith: true },
  { label: "Journal", href: "/admin/blog", icon: Newspaper, startsWith: true },
  { label: "Media", href: "/admin/media", icon: ImageIcon, startsWith: true },
  { label: "Menu", href: "/admin/menu", icon: ListTree, startsWith: true },
  { label: "Settings", href: "/admin/settings", icon: Settings, startsWith: true },
];

function useActive() {
  const pathname = usePathname();
  return (item: NavItem) =>
    item.startsWith ? pathname.startsWith(item.href) : pathname === item.href;
}

/** The inner sidebar content, shared by the desktop rail and the mobile drawer. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const isActive = useActive();
  const { brand } = useSettings();

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-[72px] items-center border-b border-white/10 px-5">
        <Link href="/admin" onClick={onNavigate} aria-label={`${brand.name} admin`}>
          <Logo tone="light" name={brand.name} logoUrl={brand.logoUrl || undefined} />
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
          Manage
        </p>
        {NAV.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-ember-500 text-white shadow-glow-sm"
                  : "text-white/55 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  active ? "text-white" : "text-white/45 group-hover:text-white"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className="space-y-1 border-t border-white/10 px-3 py-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Store className="h-[18px] w-[18px]" />
          View store
        </Link>
        <SignOutButton />
      </div>
    </div>
  );
}

/**
 * Responsive admin navigation. Renders a fixed left rail on desktop and a
 * hamburger-triggered slide-in drawer on mobile. The matching top bar lives in
 * `AdminTopbar`.
 */
export function AdminSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 bg-onyx-grad lg:block">
      <SidebarContent />
    </aside>
  );
}

export function AdminMobileNav({ title }: { title?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open admin menu"
        className="grid h-10 w-10 place-items-center rounded-xl border border-onyx-200 bg-white text-onyx-800 transition-colors hover:bg-onyx-50"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close admin menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-onyx-950/60 backdrop-blur-sm"
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 w-[80%] max-w-xs bg-onyx-grad shadow-elevated">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-5 z-10 grid h-9 w-9 place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      {title && <span className="sr-only">{title}</span>}
    </div>
  );
}
