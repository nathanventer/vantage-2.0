-- Phase 2 §5 — Pulse / Rate & Price Intelligence (subscription product).
-- Idempotent + additive. RLS: subscribers read benchmarks/lane rates, providers
-- manage their own rate cards, admins manage all.

begin;

-- ── Provider rate cards + observed lane rates ──────────────────────────────
create table if not exists public.rate_cards (
  id uuid primary key default gen_random_uuid(),
  provider_company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  currency text not null default 'ZAR',
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now()
);

create table if not exists public.lane_rates (
  id uuid primary key default gen_random_uuid(),
  rate_card_id uuid references public.rate_cards(id) on delete cascade,
  provider_company_id uuid references public.companies(id) on delete set null,
  provider_name text not null,
  origin text not null,
  destination text not null,
  mode text not null check (mode in ('Sea','Air','Road','Rail')),
  period text not null,                       -- YYYY-MM
  price numeric(14,2) not null,
  currency text not null default 'ZAR',
  transit_days int,
  created_at timestamptz not null default now()
);
create index if not exists lane_rates_lane_idx on public.lane_rates (origin, destination, mode, period);

-- Optional precomputed benchmarks (also derivable in-app from lane_rates).
create table if not exists public.market_benchmarks (
  id uuid primary key default gen_random_uuid(),
  lane text not null,
  mode text not null,
  period text not null,
  median_price numeric(14,2) not null,
  low_price numeric(14,2) not null,
  high_price numeric(14,2) not null,
  samples int not null default 0,
  created_at timestamptz not null default now()
);

-- ── Subscriptions + price alerts ───────────────────────────────────────────
create table if not exists public.rate_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  plan text not null default 'standard',
  status text not null default 'active' check (status in ('active','canceled','past_due','none')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lane text not null,
  mode text not null,
  threshold numeric(14,2) not null,
  direction text not null check (direction in ('above','below')),
  created_at timestamptz not null default now()
);

-- ── Entitlement helper (SECURITY DEFINER, no recursion) ────────────────────
create or replace function public.has_active_pulse()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.rate_subscriptions s
    where s.user_id = auth.uid() and s.status = 'active'
  );
$$;

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.rate_cards enable row level security;
alter table public.lane_rates enable row level security;
alter table public.market_benchmarks enable row level security;
alter table public.rate_subscriptions enable row level security;
alter table public.price_alerts enable row level security;

-- Lane rates + benchmarks: visible to active subscribers (and admins).
drop policy if exists lane_rates_select on public.lane_rates;
create policy lane_rates_select on public.lane_rates
  for select using (public.has_active_pulse() or public.is_admin());

drop policy if exists market_benchmarks_select on public.market_benchmarks;
create policy market_benchmarks_select on public.market_benchmarks
  for select using (public.has_active_pulse() or public.is_admin());

-- Providers manage their own rate cards + lane rates; admins all.
drop policy if exists rate_cards_rw on public.rate_cards;
create policy rate_cards_rw on public.rate_cards
  for all using (provider_company_id = public.my_company() or public.is_admin())
  with check (provider_company_id = public.my_company() or public.is_admin());

drop policy if exists lane_rates_write on public.lane_rates;
create policy lane_rates_write on public.lane_rates
  for all using (provider_company_id = public.my_company() or public.is_admin())
  with check (provider_company_id = public.my_company() or public.is_admin());

-- Subscriptions: a user sees only their own; only the service role (webhook) writes.
drop policy if exists rate_subscriptions_select on public.rate_subscriptions;
create policy rate_subscriptions_select on public.rate_subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

-- Price alerts: owner-scoped.
drop policy if exists price_alerts_rw on public.price_alerts;
create policy price_alerts_rw on public.price_alerts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

commit;

-- Rollback (manual): drop the policies, has_active_pulse(), then the tables
-- price_alerts, rate_subscriptions, market_benchmarks, lane_rates, rate_cards.
