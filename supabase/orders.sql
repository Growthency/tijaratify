-- ============================================================================
-- Jolchap — Orders (run once in the Supabase SQL Editor)
-- ----------------------------------------------------------------------------
-- Creates the tables that capture customer orders placed at checkout and the
-- per-order line items. Safe to re-run (idempotent).
--
-- After running this, checkout submissions are saved and appear in the admin
-- under Orders / Fulfilled / Returns.
--
-- Column names are snake_case and match the row mappers in src/lib/orders.ts.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- orders
--   One row per checkout. `order_no` is the human-facing reference (JC-######)
--   shown to the customer. `status` drives which admin list an order shows in:
--   pending / processing / shipped → Orders, delivered → Fulfilled,
--   returned → Returns. Card details are never stored.
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_no        text not null unique,
  status          text not null default 'pending',
  customer_name   text not null default '',
  customer_email  text not null default '',
  customer_phone  text not null default '',
  address         text not null default '',
  city            text not null default '',
  region          text not null default '',
  postcode        text not null default '',
  country         text not null default '',
  delivery_zone   text not null default 'inside',
  subtotal        numeric(10, 2) not null default 0,
  delivery        numeric(10, 2) not null default 0,
  discount        numeric(10, 2) not null default 0,
  total           numeric(10, 2) not null default 0,
  currency        text not null default 'BDT',
  promo_code      text not null default '',
  payment_method  text not null default 'card',
  notes           text not null default '',
  fulfilled_at    timestamptz,
  returned_at     timestamptz,
  return_reason   text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- order_items
--   A snapshot of each product in the order at the moment of purchase, so the
--   record stays accurate even if the product is later edited or removed.
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  text not null default '',
  slug        text not null default '',
  name        text not null default '',
  image       text not null default '',
  quantity    integer not null default 1,
  unit_price  numeric(10, 2) not null default 0,
  line_total  numeric(10, 2) not null default 0,
  size        text,
  color       text,
  currency    text not null default 'BDT',
  created_at  timestamptz not null default now()
);

-- Payment received/verified flag (safe to run on an existing table).
alter table public.orders
  add column if not exists paid boolean not null default false;

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- ============================================================================
-- ROW LEVEL SECURITY
--   The storefront inserts orders through the privileged service-role key
--   (server-side), which bypasses RLS. These policies also allow a public
--   insert as a fallback and restrict all reads/updates to signed-in admins.
-- ============================================================================
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "orders public insert" on public.orders;
create policy "orders public insert"
  on public.orders for insert to anon, authenticated
  with check (true);

drop policy if exists "orders auth read" on public.orders;
create policy "orders auth read"
  on public.orders for select to authenticated
  using (true);

drop policy if exists "orders auth update" on public.orders;
create policy "orders auth update"
  on public.orders for update to authenticated
  using (true) with check (true);

drop policy if exists "orders auth delete" on public.orders;
create policy "orders auth delete"
  on public.orders for delete to authenticated
  using (true);

drop policy if exists "order_items public insert" on public.order_items;
create policy "order_items public insert"
  on public.order_items for insert to anon, authenticated
  with check (true);

drop policy if exists "order_items auth read" on public.order_items;
create policy "order_items auth read"
  on public.order_items for select to authenticated
  using (true);

drop policy if exists "order_items auth delete" on public.order_items;
create policy "order_items auth delete"
  on public.order_items for delete to authenticated
  using (true);

-- Reload the API cache so the new tables are visible immediately.
notify pgrst, 'reload schema';
