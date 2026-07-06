-- ============================================================================
-- Jolchap — Product reviews (run once in the Supabase SQL Editor)
-- ----------------------------------------------------------------------------
-- Stores real customer reviews. A review is only ever created server-side
-- (service-role) AFTER the API has confirmed the reviewer actually ordered the
-- product and the order was delivered — so there is no public INSERT policy.
-- Reviews are publicly readable so they can show on product pages.
-- Safe to re-run (idempotent).
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.reviews (
  id             uuid primary key default gen_random_uuid(),
  product_slug   text not null,
  order_id       uuid references public.orders(id) on delete set null,
  order_no       text not null default '',
  customer_name  text not null default '',
  rating         integer not null default 5 check (rating between 1 and 5),
  title          text not null default '',
  body           text not null default '',
  created_at     timestamptz not null default now()
);

create index if not exists reviews_product_slug_idx
  on public.reviews (product_slug, created_at desc);

-- One review per order per product (blocks duplicates).
create unique index if not exists reviews_order_product_uniq
  on public.reviews (order_no, product_slug);

alter table public.reviews enable row level security;

drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read"
  on public.reviews for select to anon, authenticated
  using (true);

drop policy if exists "reviews auth delete" on public.reviews;
create policy "reviews auth delete"
  on public.reviews for delete to authenticated
  using (true);

notify pgrst, 'reload schema';
