-- Demo Pulse activation when Stripe checkout is unavailable (no price secrets).
-- Mirrors mockApi.startPulseCheckout local entitlement grant.

create or replace function public.activate_pulse_demo(p_plan text default 'standard')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_plan not in ('standard', 'pro') then
    raise exception 'invalid plan: %', p_plan;
  end if;

  insert into public.rate_subscriptions (user_id, plan, status, current_period_end)
  values (auth.uid(), p_plan, 'active', now() + interval '30 days')
  on conflict (user_id) do update set
    plan = excluded.plan,
    status = 'active',
    current_period_end = excluded.current_period_end;
end;
$$;

revoke all on function public.activate_pulse_demo(text) from public;
grant execute on function public.activate_pulse_demo(text) to authenticated;
