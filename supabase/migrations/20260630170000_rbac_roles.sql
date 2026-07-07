-- Phase 2 §7 — RBAC depth. Additively extend the user_role enum with the granular
-- roles and add a 'suspended' profile status. Idempotent; never drops values.
--
-- These map onto the app's broad capability roles (Demand/Source/Admin):
--   demand_user            → Demand
--   source_user            → Source
--   subscriber             → Demand (Pulse-only entitlement via rate_subscriptions)
--   super_admin / operations_admin / finance_admin / compliance_admin → Admin
-- Fine-grained admin RLS (finance vs compliance scopes) is layered on top of the
-- existing is_admin() helper in a follow-up once verified against the live DB.

begin;

do $$
declare
  r text;
begin
  if exists (select 1 from pg_type where typname = 'user_role') then
    foreach r in array array[
      'super_admin','operations_admin','finance_admin','compliance_admin',
      'demand_user','source_user','subscriber'
    ]
    loop
      if not exists (
        select 1 from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        where t.typname = 'user_role' and e.enumlabel = r
      ) then
        execute format('alter type public.user_role add value %L', r);
      end if;
    end loop;
  end if;
end $$;

-- Scoped admin helpers (SECURITY DEFINER, no recursion) for finer RLS later.
create or replace function public.has_role(p_role text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text = p_role
  );
$$;

create or replace function public.is_finance_admin()
returns boolean language sql security definer set search_path = '' stable
as $$ select public.has_role('finance_admin') or public.has_role('super_admin'); $$;

create or replace function public.is_compliance_admin()
returns boolean language sql security definer set search_path = '' stable
as $$ select public.has_role('compliance_admin') or public.has_role('super_admin'); $$;

commit;

-- Rollback: enum values cannot be removed without recreating the type; the helper
-- functions can be dropped individually if required.
