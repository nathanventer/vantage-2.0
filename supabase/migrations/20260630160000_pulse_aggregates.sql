-- Phase 2 §6 — Heavy aggregates for live Pulse reporting. Idempotent.
-- Materialized view for cost-by-route + RPCs (SECURITY INVOKER so RLS applies to
-- the caller's visible rows). Realtime drives invalidation; these power the tiles.

begin;

-- ── Cost-by-route materialized view ────────────────────────────────────────
-- Derived from accepted quotes per shipment lane.
drop materialized view if exists public.mv_cost_by_route;
create materialized view public.mv_cost_by_route as
select
  s.origin_port as origin,
  s.destination_port as destination,
  count(*) as shipments,
  sum(q.total) as total_cost,
  avg(q.total) as avg_cost
from public.shipments s
join public.quotes q
  on q.shipment_id = s.id and q.status = 'selected'
group by s.origin_port, s.destination_port;

create unique index if not exists mv_cost_by_route_idx
  on public.mv_cost_by_route (origin, destination);

create or replace function public.refresh_pulse_aggregates()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  refresh materialized view concurrently public.mv_cost_by_route;
end;
$$;

-- ── Executive summary RPC (used by scheduled-reports + dashboards) ─────────
create or replace function public.pulse_executive_summary()
returns json
language sql
stable
security invoker
as $$
  select json_build_object(
    'active_shipments', (select count(*) from public.shipments where status = 'in_progress'),
    'closed_shipments', (select count(*) from public.shipments where status = 'completed'),
    'total_quoted_value', coalesce((select sum(total) from public.quotes where status = 'selected'), 0),
    'open_exceptions', (select count(*) from public.shipment_events where event_type = 'exception'),
    'generated_at', now()
  );
$$;

-- ── Transit-time / SLA trend RPC ───────────────────────────────────────────
create or replace function public.pulse_transit_trend()
returns table(period text, avg_transit_days numeric, shipments bigint)
language sql
stable
security invoker
as $$
  select to_char(s.created_at, 'YYYY-MM') as period,
         avg(q.estimated_transit_days)::numeric as avg_transit_days,
         count(distinct s.id) as shipments
  from public.shipments s
  join public.quotes q on q.shipment_id = s.id and q.status = 'selected'
  group by to_char(s.created_at, 'YYYY-MM')
  order by 1;
$$;

commit;

-- Rollback (manual): drop the functions + materialized view mv_cost_by_route.
