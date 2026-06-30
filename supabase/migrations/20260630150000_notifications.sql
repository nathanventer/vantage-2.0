-- Phase 2 §8 — Notifications + preferences. Idempotent + additive.
-- Owner-scoped RLS; realtime enabled for the in-app bell.

begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  body text,
  kind text not null default 'info' check (kind in ('info','success','warning','error')),
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications add column if not exists link text;
alter table public.notifications add column if not exists read_at timestamptz;
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create table if not exists public.notification_preferences (
  user_id uuid primary key,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── RLS (owner-scoped) ─────────────────────────────────────────────────────
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Inserts come from the service role (edge functions / triggers); also allow a
-- user to self-insert their own notifications (e.g. client-side notifier).
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert with check (user_id = auth.uid() or user_id is null);

drop policy if exists notif_prefs_rw on public.notification_preferences;
create policy notif_prefs_rw on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Realtime ───────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

commit;

-- Rollback (manual): drop policies, then notification_preferences + notifications.
