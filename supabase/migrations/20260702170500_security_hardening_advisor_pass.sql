-- Security hardening from advisor pass (2026-07-02). Idempotent.
-- Applied to live via MCP as `security_hardening_advisor_pass`.

-- 1. Pin search_path on flagged functions (prevents search-path hijack).
alter function public.set_updated_at() set search_path = public;
alter function public.next_ref(text) set search_path = public;
alter function public.pulse_executive_summary() set search_path = public;
alter function public.pulse_transit_trend() set search_path = public;

-- 2. Materialized view: signed-in users only (was readable by anon).
revoke select on public.mv_cost_by_route from anon;

-- 3. companies INSERT policy was WITH CHECK (true) for everyone —
--    restrict to signed-in users (onboarding still works; anon cannot insert).
drop policy if exists p_companies_insert on public.companies;
create policy p_companies_insert on public.companies
  for insert to authenticated
  with check (auth.uid() is not null);

-- 4. Public branding bucket: object URLs don't need a listing policy — drop it
--    so the bucket contents can't be enumerated.
drop policy if exists "public read branding" on storage.objects;

-- 5. SECURITY DEFINER functions: not callable by anonymous visitors.
--    (authenticated keeps EXECUTE — RLS policies and app RPCs depend on them;
--     trigger functions don't need caller EXECUTE at all.)
revoke execute on function public.audit_shipment_event() from anon, authenticated;
revoke execute on function public.audit_trigger() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.set_updated_at() from anon, authenticated;
revoke execute on function public.can_see_shipment(uuid) from anon;
revoke execute on function public.current_company() from anon;
revoke execute on function public.has_active_pulse() from anon;
revoke execute on function public.has_role(text) from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_compliance_admin() from anon;
revoke execute on function public.is_finance_admin() from anon;
revoke execute on function public.match_providers_for_shipment(uuid) from anon;
revoke execute on function public.my_company() from anon;
revoke execute on function public.my_demand_shipment_ids() from anon;
revoke execute on function public.my_quote_shipment_ids() from anon;
revoke execute on function public.next_ref(text) from anon;
revoke execute on function public.refresh_pulse_aggregates() from anon;
revoke execute on function public.select_shipment_quote(uuid, uuid, text) from anon;
revoke execute on function public.pulse_executive_summary() from anon;
revoke execute on function public.pulse_transit_trend() from anon;
