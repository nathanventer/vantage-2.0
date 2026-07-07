-- One-shot live demo sync: schema gaps + cross-account notifications + Pulse extras.
-- Safe to re-run. Run: bunx supabase db query --linked -f supabase/sync-live-demo.sql

begin;

alter table public.notifications add column if not exists sender_id uuid references public.profiles(id);
alter table public.notifications add column if not exists type text not null default 'status_update';
alter table public.notifications add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.notifications add column if not exists dedup_key text;
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

commit;

do $$
declare
  v_buyer uuid;
  v_provider uuid;
  v_admin uuid;
  v_auditor uuid;
  v_finance uuid;
  v_warehouse uuid;
  v_transport uuid;
  v_customs uuid;
begin
  select id into v_buyer from auth.users where email = 'buyer@ubuntuimports.com';
  select id into v_provider from auth.users where email = 'provider@sclogistics.com';
  select id into v_admin from auth.users where email = 'admin@tradehub.com';
  select id into v_auditor from auth.users where email = 'auditor@pulse.com';
  select id into v_finance from auth.users where email = 'finance@ubuntuimports.com';
  select id into v_warehouse from auth.users where email = 'warehouse@sclogistics.com';
  select id into v_transport from auth.users where email = 'transport@sclogistics.com';
  select id into v_customs from auth.users where email = 'customs@sclogistics.com';

  -- Pulse auditor + buyer demo alerts (parity with mockApi).
  if v_auditor is not null then
    insert into public.rate_subscriptions (user_id, plan, status, current_period_end)
    values (v_auditor, 'pro', 'active', now() + interval '30 days')
    on conflict (user_id) do update set
      plan = 'pro', status = 'active', current_period_end = excluded.current_period_end;
  end if;

  if v_buyer is not null and to_regclass('public.price_alerts') is not null then
    if not exists (
      select 1 from public.price_alerts
      where user_id = v_buyer and lane = 'Durban Port → Johannesburg' and direction = 'below'
    ) then
      insert into public.price_alerts (user_id, lane, mode, threshold, direction) values
        (v_buyer, 'Durban Port → Johannesburg', 'Sea', 175000, 'below'),
        (v_buyer, 'Cape Town Port → Johannesburg', 'Sea', 210000, 'above');
    end if;
  end if;

  if to_regclass('public.notifications') is null then
    return;
  end if;

  if v_buyer is not null and not exists (
    select 1 from public.notifications where user_id = v_buyer and title = 'Demo dataset loaded'
  ) then
    insert into public.notifications (user_id, sender_id, type, kind, title, body, link, read_at, metadata) values
      (v_buyer, null, 'status_update', 'info', 'Demo dataset loaded', '125 TradeHub shipments are available in your workspace.', '/transactions', null, '{}'::jsonb),
      (v_buyer, v_provider, 'status_update', 'info', 'Quote received', 'Southern Cross quoted TXN-1002 — R128,800 all-in.', '/transactions', null, '{"reference":"TXN-1002"}'::jsonb),
      (v_buyer, v_provider, 'message', 'info', 'Message from Sarah Naidoo', 'Vessel ETA updated for TXN-1001 — please confirm warehouse slot.', '/transactions', null, '{"reference":"TXN-1001"}'::jsonb),
      (v_buyer, v_provider, 'status_update', 'warning', 'Customs inspection hold', 'SARS hold on TXN-1004 — documentation review required.', '/transactions', now() - interval '2 days', '{"reference":"TXN-1004"}'::jsonb),
      (v_buyer, v_provider, 'approval_request', 'info', 'POD approval requested', 'Southern Cross uploaded POD for TXN-1003.', '/transactions', null, '{"reference":"TXN-1003"}'::jsonb);
  end if;

  if v_provider is not null and not exists (
    select 1 from public.notifications where user_id = v_provider and title = 'Quote accepted'
  ) then
    insert into public.notifications (user_id, sender_id, type, kind, title, body, link, read_at, metadata) values
      (v_provider, v_buyer, 'task_assigned', 'info', 'Task assigned by Michael Dlamini', 'Review customs docs for TXN-1004 before Friday.', '/transactions', null, '{"reference":"TXN-1004"}'::jsonb),
      (v_provider, v_buyer, 'message', 'info', 'Message from Michael Dlamini', 'Can you confirm container availability for TXN-1002?', '/transactions', null, '{"reference":"TXN-1002"}'::jsonb),
      (v_provider, v_buyer, 'status_update', 'success', 'Quote accepted', 'Ubuntu accepted your quote on TXN-1001.', '/transactions', null, '{"reference":"TXN-1001"}'::jsonb),
      (v_provider, null, 'status_update', 'info', 'Transport scheduled', 'TXN-1002 moved to transport — vehicle CA 123-456.', '/transactions', now() - interval '3 days', '{"reference":"TXN-1002"}'::jsonb),
      (v_provider, v_buyer, 'approval_request', 'info', 'Document signature requested', 'Please sign the service agreement for TXN-1001.', '/transactions', null, '{"reference":"TXN-1001"}'::jsonb);
  end if;

  if v_admin is not null and not exists (
    select 1 from public.notifications where user_id = v_admin and title = 'Registration pending review'
  ) then
    insert into public.notifications (user_id, sender_id, type, kind, title, body, link, read_at, metadata) values
      (v_admin, null, 'approval_request', 'warning', 'Registration pending review', 'New demand company awaiting approval.', '/admin/registrations', null, '{}'::jsonb),
      (v_admin, v_buyer, 'message', 'info', 'Message from Michael Dlamini', 'Please expedite TXN-1004 customs clearance.', '/transactions', null, '{"reference":"TXN-1004"}'::jsonb),
      (v_admin, null, 'status_update', 'info', 'Demo dataset loaded', '125 TradeHub shipments are available.', '/transactions', now() - interval '7 days', '{}'::jsonb);
  end if;

  if v_auditor is not null and not exists (
    select 1 from public.notifications where user_id = v_auditor and title = 'Pulse demo active'
  ) then
    insert into public.notifications (user_id, sender_id, type, kind, title, body, link, read_at, metadata) values
      (v_auditor, v_admin, 'status_update', 'info', 'Audit export ready', 'Weekly compliance audit bundle is available.', '/admin/audit', null, '{}'::jsonb),
      (v_auditor, v_provider, 'status_update', 'warning', 'Exception flagged', 'Delay reported on TXN-1004 customs step.', '/transactions', null, '{"reference":"TXN-1004"}'::jsonb),
      (v_auditor, null, 'status_update', 'info', 'Pulse demo active', 'Rate intelligence dashboards are unlocked.', '/pulse', now() - interval '1 day', '{}'::jsonb);
  end if;

  if v_finance is not null and not exists (
    select 1 from public.notifications where user_id = v_finance and title = 'Invoice generated'
  ) then
    insert into public.notifications (user_id, sender_id, type, kind, title, body, link, read_at, metadata) values
      (v_finance, v_provider, 'status_update', 'success', 'Invoice generated', 'INV-5001 issued for TXN-1001.', '/payments', null, '{"reference":"TXN-1001"}'::jsonb),
      (v_finance, v_buyer, 'message', 'info', 'Message from Michael Dlamini', 'Please approve payment for TXN-1001 this week.', '/payments', null, '{}'::jsonb),
      (v_finance, null, 'status_update', 'info', 'Payment verified', 'INV-5001 (R203,000) settled.', '/payments', now() - interval '4 days', '{}'::jsonb);
  end if;

  if v_warehouse is not null and not exists (
    select 1 from public.notifications where user_id = v_warehouse and title = 'Goods received'
  ) then
    insert into public.notifications (user_id, sender_id, type, kind, title, body, link, read_at, metadata) values
      (v_warehouse, v_buyer, 'task_assigned', 'info', 'Task assigned by Michael Dlamini', 'Prepare inbound slot for TXN-1002 textiles.', '/warehouse', null, '{"reference":"TXN-1002"}'::jsonb),
      (v_warehouse, v_provider, 'status_update', 'info', 'Goods received', 'TXN-1001 cargo checked into JHB DC.', '/warehouse', null, '{"reference":"TXN-1001"}'::jsonb),
      (v_warehouse, null, 'status_update', 'info', 'Warehouse capacity alert', 'DC at 82% — plan overflow for peak week.', '/warehouse', now() - interval '6 hours', '{}'::jsonb);
  end if;

  if v_transport is not null and not exists (
    select 1 from public.notifications where user_id = v_transport and title = 'Trip dispatched'
  ) then
    insert into public.notifications (user_id, sender_id, type, kind, title, body, link, read_at, metadata) values
      (v_transport, v_buyer, 'message', 'info', 'Message from Michael Dlamini', 'Confirm delivery window for TXN-1003.', '/transport', null, '{"reference":"TXN-1003"}'::jsonb),
      (v_transport, v_provider, 'task_assigned', 'info', 'Task assigned by Sarah Naidoo', 'Schedule last-mile for TXN-1002.', '/transport', null, '{"reference":"TXN-1002"}'::jsonb),
      (v_transport, null, 'status_update', 'info', 'Trip dispatched', 'CA 123-456 departed Durban port.', '/transport', null, '{}'::jsonb);
  end if;

  if v_customs is not null and not exists (
    select 1 from public.notifications where user_id = v_customs and title = 'Clearance released'
  ) then
    insert into public.notifications (user_id, sender_id, type, kind, title, body, link, read_at, metadata) values
      (v_customs, v_buyer, 'approval_request', 'warning', 'Clearance approval needed', 'TXN-1004 SARS hold — upload amended docs.', '/transactions', null, '{"reference":"TXN-1004"}'::jsonb),
      (v_customs, v_provider, 'message', 'info', 'Message from Sarah Naidoo', 'SARS query on TXN-1004 — need HS code confirmation.', '/transactions', null, '{"reference":"TXN-1004"}'::jsonb),
      (v_customs, null, 'status_update', 'success', 'Clearance released', 'TXN-1003 customs cleared.', '/transactions', now() - interval '12 hours', '{"reference":"TXN-1003"}'::jsonb);
  end if;
end $$;
