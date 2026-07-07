-- Seed Pulse (lane_rates) from ALL live provider quotes.
-- COPY, not move: source tables are never modified. Idempotent & re-runnable —
-- the NOT EXISTS dedupe (lane_rates has no unique key) means a second run
-- inserts 0 rows. One median price per lane+period+provider so every provider
-- that quoted a lane appears (drives the Supplier rate analysis chart) and every
-- month with data appears (drives the trend line).
-- Applied to live 2026-07-08: lane_rates 72 → 284, 5 providers, 25 lanes,
-- up to 5 providers per lane/period (was 1).

begin;

with src as (
  select s.origin_port as origin,
         coalesce(s.final_delivery_location, s.destination_port) as dest,
         to_char(s.created_at,'YYYY-MM') as period,
         q.source_company_id, c.name as provider_name,
         q.total::numeric as price, q.estimated_transit_days
  from shipments s
  join quotes q on q.shipment_id = s.id
  join companies c on c.id = q.source_company_id
  where s.origin_port is not null
    and coalesce(s.final_delivery_location, s.destination_port) is not null
    and q.total is not null and q.total > 0
),
agg as (
  select origin, dest, period, source_company_id, provider_name,
         round(percentile_cont(0.5) within group (order by price)::numeric, 2) as price,
         round(avg(estimated_transit_days))::int as transit_days
  from src
  group by origin, dest, period, source_company_id, provider_name
)
insert into lane_rates (rate_card_id, provider_company_id, provider_name, origin, destination, mode, period, price, currency, transit_days)
select (select id from rate_cards limit 1),
  a.source_company_id, a.provider_name, a.origin, a.dest,
  case when a.origin ~* 'durban|cape town|richards|gqeberha|port elizabeth'
         or a.dest ~* 'durban|cape town|richards|gqeberha|port elizabeth'
       then 'Sea' else 'Road' end,
  a.period, a.price, 'ZAR', coalesce(a.transit_days, 7)
from agg a
where not exists (
  select 1 from lane_rates lr
  where lr.origin = a.origin and lr.destination = a.dest
    and lr.period = a.period and lr.provider_name = a.provider_name
);

commit;
