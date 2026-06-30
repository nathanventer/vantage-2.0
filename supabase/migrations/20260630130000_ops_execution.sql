-- Phase 2 §1 — Logistics operations execution.
-- Idempotent + additive: never drops Phase-1 data. Adds the ops event stream,
-- POD/signature columns, and RLS via SECURITY DEFINER helpers (no recursion).

begin;

-- ── Ops event stream ──────────────────────────────────────────────────────
create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  event_type text not null default 'milestone',
  step smallint,
  note text,
  payload jsonb,
  trip_ref text,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- Tolerate a pre-existing table with a different shape.
alter table public.shipment_events add column if not exists event_type text not null default 'milestone';
alter table public.shipment_events add column if not exists step smallint;
alter table public.shipment_events add column if not exists note text;
alter table public.shipment_events add column if not exists payload jsonb;
alter table public.shipment_events add column if not exists trip_ref text;
alter table public.shipment_events add column if not exists created_by uuid;
alter table public.shipment_events add column if not exists created_at timestamptz not null default now();

create index if not exists shipment_events_shipment_idx on public.shipment_events (shipment_id, created_at desc);
create index if not exists shipment_events_trip_idx on public.shipment_events (trip_ref) where trip_ref is not null;

-- ── Document columns for POD + e-signature ─────────────────────────────────
alter table public.shipment_documents add column if not exists signature_token text;
alter table public.shipment_documents add column if not exists file_path text;
alter table public.shipment_documents add column if not exists payload jsonb;
alter table public.shipment_documents add column if not exists signed_by text;
alter table public.shipment_documents add column if not exists signed_at timestamptz;

-- ── SECURITY DEFINER access helper (avoids RLS recursion on shipments) ─────
create or replace function public.can_see_shipment(p_shipment uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select public.is_admin()
      or exists (
        select 1 from public.shipments s
        where s.id = p_shipment
          and (s.demand_company_id = public.my_company()
               or s.source_company_id = public.my_company())
      );
$$;

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.shipment_events enable row level security;

drop policy if exists shipment_events_select on public.shipment_events;
create policy shipment_events_select on public.shipment_events
  for select using (public.can_see_shipment(shipment_id));

drop policy if exists shipment_events_insert on public.shipment_events;
create policy shipment_events_insert on public.shipment_events
  for insert with check (public.can_see_shipment(shipment_id));

-- ── Audit trigger: every ops event produces an audit row ───────────────────
create or replace function public.audit_shipment_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (actor_id, action, entity, entity_id)
  values (new.created_by, 'ops.' || new.event_type, 'shipment_events', new.shipment_id::text);
  return new;
end;
$$;

drop trigger if exists trg_audit_shipment_event on public.shipment_events;
create trigger trg_audit_shipment_event
  after insert on public.shipment_events
  for each row execute function public.audit_shipment_event();

commit;

-- Rollback (manual):
--   drop trigger if exists trg_audit_shipment_event on public.shipment_events;
--   drop function if exists public.audit_shipment_event();
--   drop function if exists public.can_see_shipment(uuid);
--   drop table if exists public.shipment_events;
