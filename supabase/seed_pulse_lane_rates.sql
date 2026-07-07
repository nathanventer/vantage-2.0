-- Seed Pulse (lane_rates) from live shipment/quote data.
-- COPY, not move: source tables are never modified. Idempotent & re-runnable —
-- the NOT EXISTS dedupe (lane_rates has no unique key) means a second run
-- inserts 0 rows. Sample is a reproducible ~30% of shipments via hashtext.
-- Applied to live 2026-07-08: 120 inserted (72 → 192), rerun verified = 0.

begin;

with src as (
  select s.id, s.origin_port, coalesce(s.final_delivery_location, s.destination_port) as dest,
         to_char(s.created_at,'YYYY-MM') as period,
         q.source_company_id, c.name as provider_name, q.total, q.estimated_transit_days
  from shipments s
  join quotes q on q.shipment_id = s.id and q.status::text in ('selected','submitted')
  join companies c on c.id = q.source_company_id
  where s.origin_port is not null and coalesce(s.final_delivery_location, s.destination_port) is not null
    and q.total is not null and q.total > 0
),
sampled as (
  select * from src where abs(hashtext(id::text)) % 10 < 3   -- reproducible ~30%
)
insert into lane_rates (rate_card_id, provider_company_id, provider_name, origin, destination, mode, period, price, currency, transit_days)
select
  (select id from rate_cards limit 1),
  sp.source_company_id,
  sp.provider_name,
  sp.origin_port,
  sp.dest,
  case when sp.origin_port ~* 'durban|cape town|richards|gqeberha|port elizabeth'
         or sp.dest ~* 'durban|cape town|richards|gqeberha|port elizabeth'
       then 'Sea' else 'Road' end,
  sp.period,
  round(sp.total::numeric, 2),
  'ZAR',
  coalesce(sp.estimated_transit_days, 7)
from sampled sp
where not exists (
  select 1 from lane_rates lr
  where lr.origin = sp.origin_port and lr.destination = sp.dest
    and lr.period = sp.period and lr.provider_name = sp.provider_name
);

commit;
