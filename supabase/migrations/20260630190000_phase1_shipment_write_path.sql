-- Phase 1 shipment write-path: next_ref, demand-side shipment INSERT/UPDATE RLS,
-- provider matching RPC, and quote-selection RPC.
-- Idempotent — safe to re-run on live (qzckmlhaoehsngxjlgfk).

-- ── 1. Reference generator (may already exist from 20260630120000) ───────────
create table if not exists public.ref_sequences (
  prefix      text primary key,
  last_value  bigint not null default 1000
);

alter table public.ref_sequences enable row level security;

create or replace function public.next_ref(p_prefix text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next bigint;
begin
  insert into public.ref_sequences (prefix, last_value)
  values (p_prefix, 1001)
  on conflict (prefix)
    do update set last_value = public.ref_sequences.last_value + 1
  returning last_value into v_next;

  return 'VTG-' || p_prefix || '-' || v_next::text;
end;
$$;

revoke all on function public.next_ref(text) from public;
grant execute on function public.next_ref(text) to authenticated;

-- ── 2. Quote scoring columns ────────────────────────────────────────────────
alter table public.quotes add column if not exists cost_score       numeric(6,2);
alter table public.quotes add column if not exists service_score    numeric(6,2);
alter table public.quotes add column if not exists compliance_score numeric(6,2);
alter table public.quotes add column if not exists capacity_score   numeric(6,2);
alter table public.quotes add column if not exists risk_score       numeric(6,2);
alter table public.quotes add column if not exists total_score      numeric(6,2);

alter table public.shipments add column if not exists source_override_reason text;

-- ── 3. Demand-side shipment write RLS ───────────────────────────────────────
drop policy if exists p_ship_insert on public.shipments;
create policy p_ship_insert on public.shipments
  for insert to authenticated
  with check (demand_company_id = public.my_company());

drop policy if exists p_ship_update on public.shipments;
create policy p_ship_update on public.shipments
  for update to authenticated
  using (
    demand_company_id = public.my_company()
    or source_company_id = public.my_company()
    or public.is_admin()
  )
  with check (
    demand_company_id = public.my_company()
    or source_company_id = public.my_company()
    or public.is_admin()
  );

-- ── 4. Match source providers → seed quote rows (SECURITY DEFINER) ──────────
create or replace function public.match_providers_for_shipment(p_shipment_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ship record;
  v_provider record;
  v_count integer := 0;
  v_i integer := 0;
  v_ref text;
  v_freight numeric;
  v_customs numeric;
  v_wh numeric;
  v_transport numeric;
  v_vat numeric;
begin
  select id, demand_company_id into v_ship
  from public.shipments
  where id = p_shipment_id;

  if not found then
    raise exception 'shipment not found: %', p_shipment_id;
  end if;

  if v_ship.demand_company_id is distinct from public.my_company()
     and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  for v_provider in
    select c.id, c.name
    from public.companies c
    where c.type in ('source', 'both')
    order by c.name
    limit 4
  loop
    if exists (
      select 1 from public.quotes q
      where q.shipment_id = p_shipment_id and q.source_company_id = v_provider.id
    ) then
      continue;
    end if;

    v_i := v_i + 1;
    v_ref := public.next_ref('QTE');
    v_freight := 120000 + v_i * 18500 + (extract(epoch from now())::bigint % 7) * 2100;
    v_customs := round(v_freight * 0.12, 2);
    v_wh := round(v_freight * 0.15, 2);
    v_transport := round(v_freight * 0.18, 2);
    v_vat := round((v_freight + v_customs + v_wh + v_transport) * 0.15, 2);

    insert into public.quotes (
      reference,
      shipment_id,
      source_company_id,
      freight_cost,
      customs_cost,
      warehouse_cost,
      transport_cost,
      other_cost,
      vat_amount,
      estimated_transit_days,
      status
    ) values (
      v_ref,
      p_shipment_id,
      v_provider.id,
      v_freight,
      v_customs,
      v_wh,
      v_transport,
      0,
      v_vat,
      6 + v_i,
      'submitted'
    );

    v_count := v_count + 1;
  end loop;

  update public.shipments
  set current_step = greatest(current_step, 2)
  where id = p_shipment_id;

  return v_count;
end;
$$;

revoke all on function public.match_providers_for_shipment(uuid) from public;
grant execute on function public.match_providers_for_shipment(uuid) to authenticated;

-- ── 5. Demand confirms a quote (SECURITY DEFINER) ───────────────────────────
create or replace function public.select_shipment_quote(
  p_shipment_id uuid,
  p_quote_id uuid,
  p_override_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ship record;
  v_quote record;
begin
  select id, demand_company_id into v_ship
  from public.shipments
  where id = p_shipment_id;

  if not found then
    raise exception 'shipment not found: %', p_shipment_id;
  end if;

  if v_ship.demand_company_id is distinct from public.my_company()
     and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select id, source_company_id into v_quote
  from public.quotes
  where id = p_quote_id and shipment_id = p_shipment_id;

  if not found then
    raise exception 'quote not found: %', p_quote_id;
  end if;

  update public.quotes
  set status = 'submitted'
  where shipment_id = p_shipment_id and id <> p_quote_id;

  update public.quotes
  set status = 'selected'
  where id = p_quote_id;

  update public.shipments
  set
    source_company_id = v_quote.source_company_id,
    current_step = 4,
    status = 'in_progress',
    source_override_reason = nullif(trim(p_override_reason), '')
  where id = p_shipment_id;
end;
$$;

revoke all on function public.select_shipment_quote(uuid, uuid, text) from public;
grant execute on function public.select_shipment_quote(uuid, uuid, text) to authenticated;

-- ── 6. Demand may insert/update quotes on own shipments (client fallback) ───
drop policy if exists p_quote_demand_insert on public.quotes;
create policy p_quote_demand_insert on public.quotes
  for insert to authenticated
  with check (shipment_id in (select public.my_demand_shipment_ids()));

drop policy if exists p_quote_demand_update on public.quotes;
create policy p_quote_demand_update on public.quotes
  for update to authenticated
  using (shipment_id in (select public.my_demand_shipment_ids()))
  with check (shipment_id in (select public.my_demand_shipment_ids()));
