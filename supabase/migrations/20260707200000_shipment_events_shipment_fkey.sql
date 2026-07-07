-- shipment_events.shipment_id → shipments.id FK was skipped when the table
-- pre-existed (create table if not exists). PostgREST needs this for embeds.

begin;

delete from public.shipment_events se
where not exists (
  select 1 from public.shipments s where s.id = se.shipment_id
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shipment_events_shipment_id_fkey'
      and conrelid = 'public.shipment_events'::regclass
  ) then
    alter table public.shipment_events
      add constraint shipment_events_shipment_id_fkey
      foreign key (shipment_id) references public.shipments(id) on delete cascade;
  end if;
end $$;

commit;
