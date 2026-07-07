-- Cross-account notification delivery: sender, type, metadata, dedup + SECURITY DEFINER RPC.
-- Idempotent + additive.

begin;

alter table public.notifications add column if not exists sender_id uuid references public.profiles(id);
alter table public.notifications add column if not exists type text not null default 'status_update';
alter table public.notifications add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.notifications add column if not exists dedup_key text;

-- Ensure kind column exists (older envs may have dropped it from generated types).
alter table public.notifications add column if not exists kind text not null default 'info';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'notifications_kind_check' and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_kind_check
      check (kind in ('info','success','warning','error'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'notifications_type_check' and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_type_check
      check (type in ('task_assigned','message','status_update','approval_request'));
  end if;
end $$;

create unique index if not exists notifications_dedup_key_idx
  on public.notifications (dedup_key) where dedup_key is not null;

create index if not exists notifications_sender_idx on public.notifications (sender_id);

-- ── Cross-account delivery (SECURITY DEFINER) ───────────────────────────────
create or replace function public.deliver_notification(
  p_recipient_id uuid,
  p_title text,
  p_body text default null,
  p_type text default 'status_update',
  p_kind text default 'info',
  p_link text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_dedup_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_id uuid;
  v_shipment uuid;
  v_demand uuid;
  v_source uuid;
  v_recipient_company uuid;
begin
  if v_sender is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.profiles where id = p_recipient_id) then
    raise exception 'invalid recipient';
  end if;

  if not public.is_admin() and p_recipient_id <> v_sender then
    v_shipment := nullif(p_metadata->>'shipmentId', '')::uuid;

    if v_shipment is not null then
      if not public.can_see_shipment(v_shipment) then
        raise exception 'not permitted for shipment';
      end if;

      select s.demand_company_id, s.source_company_id
        into v_demand, v_source
      from public.shipments s
      where s.id = v_shipment;

      select company_id into v_recipient_company
      from public.profiles where id = p_recipient_id;

      if v_recipient_company is distinct from v_demand
         and v_recipient_company is distinct from v_source then
        raise exception 'recipient not on shipment';
      end if;
    else
      -- Non-shipment notifications: same company only (registration, admin flows).
      if not exists (
        select 1
        from public.profiles sender, public.profiles recipient
        where sender.id = v_sender
          and recipient.id = p_recipient_id
          and sender.company_id is not null
          and sender.company_id = recipient.company_id
      ) then
        raise exception 'not permitted';
      end if;
    end if;
  elsif p_recipient_id <> v_sender then
    -- Self-notify skips cross-account checks (e.g. POPIA acknowledgement).
    null;
  end if;

  insert into public.notifications (
    user_id, sender_id, title, body, type, kind, link, metadata, dedup_key
  ) values (
    p_recipient_id, v_sender, p_title, p_body, p_type, p_kind, p_link, p_metadata, p_dedup_key
  )
  on conflict (dedup_key) where dedup_key is not null do nothing
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.deliver_notification(uuid, text, text, text, text, text, jsonb, text) from public;
grant execute on function public.deliver_notification(uuid, text, text, text, text, text, jsonb, text) to authenticated;

commit;

-- Rollback (manual): drop function deliver_notification; drop index notifications_dedup_key_idx;
-- alter table notifications drop column if exists sender_id, type, metadata, dedup_key;
