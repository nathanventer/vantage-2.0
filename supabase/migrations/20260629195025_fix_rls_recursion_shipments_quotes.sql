-- Break the mutual RLS recursion between shipments and quotes (Postgres 42P17).
-- The cross-table visibility checks run in SECURITY DEFINER helpers so they do
-- not re-trigger the other table's policy. Visibility is unchanged:
--   demand sees own company's shipments; source sees assigned-or-quoted; admins all.

create or replace function public.my_quote_shipment_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select shipment_id from quotes where source_company_id = my_company();
$$;

create or replace function public.my_demand_shipment_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from shipments where demand_company_id = my_company();
$$;

drop policy if exists p_ship_read on shipments;
create policy p_ship_read on shipments for select using (
  demand_company_id = my_company()
  or source_company_id = my_company()
  or id in (select public.my_quote_shipment_ids())
  or is_admin()
);

drop policy if exists p_quote_read on quotes;
create policy p_quote_read on quotes for select using (
  source_company_id = my_company()
  or shipment_id in (select public.my_demand_shipment_ids())
  or is_admin()
);
