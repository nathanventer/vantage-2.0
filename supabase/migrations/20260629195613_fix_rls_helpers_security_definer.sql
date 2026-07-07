-- Root RLS fix. is_admin()/my_company() query `profiles`, and every table policy
-- (including profiles' own) calls them. As SECURITY INVOKER they recurse through
-- profiles' policy on every authenticated read (42P17 / stack depth). SECURITY
-- DEFINER makes their profiles lookups bypass RLS (owner `postgres` has BYPASSRLS),
-- breaking the recursion. Function bodies are unchanged.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin','operations_admin','finance_admin','compliance_admin')
  );
$$;

create or replace function public.my_company()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid();
$$;
