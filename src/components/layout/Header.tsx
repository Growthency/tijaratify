"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Search, ShoppingBag, User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { MobileNav } from "./MobileNav";
import { DesktopNav } from "./DesktopNav";
import { SearchOverlay } from "./SearchOverlay";
import { useCart, cartCount } from "@/lib/store/cart";
import { useSettings } from "@/components/providers/SettingsProvider";
import { resolveNavTree } from "@/config/site";
import type { Category } from "@/types";
import { cn } from "@/lib/utils";

export function Header({ categories }: { categories: Category[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const items = useCart((s) => s.items);
  const openCart = useCart((s) => s.open);
  const count = cartCount(items);
  const { brand, menu } = useSettings();

  const nav = resolveNavTree(menu, categories);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-[80] transition-all duration-300",
          scrolled
            ? "glass border-b border-onyx-100 shadow-[0_8px_30px_-18px_rgba(10,10,12,0.3)]"
            : "bg-bone/80 backdrop-blur-md"
        )}
      >
        <div className="container flex h-[72px] items-center justify-between gap-4">
          {/* left — search (mobile) + logo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="grid h-10 w-10 place-items-center rounded-full text-onyx-900 transition-colors hover:bg-onyx-100 lg:hidden"
            >
              <Search className="h-[19px] w-[19px]" />
            </button>
            <Link href="/" aria-label={`${brand.name} home`}>
              <Logo animated name={brand.name} logoUrl={brand.logoUrl || undefined} />
            </Link>
          </div>

          {/* desktop nav (with cascading dropdowns) */}
          <DesktopNav nav={nav} />

          {/* right — search (desktop), account, cart, hamburger (mobile, last) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="hidden h-10 w-10 place-items-center rounded-full text-onyx-900 transition-colors hover:bg-onyx-100 lg:grid"
            >
              <Search className="h-[19px] w-[19px]" />
            </button>
            <Link
              href="/orders"
              aria-label="My orders"
              className="hidden h-10 w-10 place-items-center rounded-full text-onyx-900 transition-colors hover:bg-onyx-100 sm:grid"
            >
              <User className="h-[19px] w-[19px]" />
            </Link>
            <button
              onClick={openCart}
              aria-label="Open cart"
              className="relative grid h-10 w-10 place-items-center rounded-full text-onyx-900 transition-colors hover:bg-onyx-100"
            >
              <ShoppingBag className="h-[19px] w-[19px]" />
              {mounted && count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ember-500 px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="grid h-10 w-10 place-items-center rounded-full text-onyx-900 transition-colors hover:bg-onyx-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} categories={categories} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
