-- Section F write-paths: reference generator, quote scoring columns, source
-- override reason, and company-scoped Storage RLS.
-- Idempotent + reversible. Safe to re-run.

-- ── 1. Reference generator ──────────────────────────────────────────────────
-- A small sequence table + SECURITY DEFINER function so any authenticated write
-- can mint a unique, human-readable reference (VTG-<PREFIX>-<n>) without needing
-- direct table privileges. Prefixes: TXN / RFQ / QTE / PO / INV / POP.
create table if not exists public.ref_sequences (
  prefix      text primary key,
  last_value  bigint not null default 1000
);

alter table public.ref_sequences enable row level security;

create or replace function public.next_ref(p_prefix text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next bigint;
begin
  insert into public.ref_sequences (prefix, last_value)
  values (p_prefix, 1001)
  on conflict (prefix)
    do update set last_value = public.ref_sequences.last_value + 1
  returning last_value into v_next;

  return 'VTG-' || p_prefix || '-' || v_next::text;
end;
$$;

revoke all on function public.next_ref(text) from public;
grant execute on function public.next_ref(text) to authenticated;

-- ── 2. Quote scoring columns (Optimizer: 25/25/20/15/15) ────────────────────
alter table public.quotes add column if not exists cost_score       numeric(6,2);
alter table public.quotes add column if not exists service_score    numeric(6,2);
alter table public.quotes add column if not exists compliance_score numeric(6,2);
alter table public.quotes add column if not exists capacity_score   numeric(6,2);
alter table public.quotes add column if not exists risk_score       numeric(6,2);
alter table public.quotes add column if not exists total_score      numeric(6,2);

-- ── 3. Source-selection override reason (POPIA/audit accountability) ────────
alter table public.shipments add column if not exists source_override_reason text;

-- ── 4. Storage RLS — authenticated users access only their company's paths ──
-- Object key convention: '<company_id>/<...>' in the private buckets.
do $$
declare
  b text;
begin
  foreach b in array array['compliance-docs', 'transaction-docs'] loop
    execute format('drop policy if exists %I on storage.objects', b || '_company_read');
    execute format('drop policy if exists %I on storage.objects', b || '_company_write');
    execute format('drop policy if exists %I on storage.objects', b || '_company_update');
    execute format('drop policy if exists %I on storage.objects', b || '_company_delete');

    execute format($f$
      create policy %I on storage.objects for select to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = public.my_company()::text)
    $f$, b || '_company_read', b);

    execute format($f$
      create policy %I on storage.objects for insert to authenticated
      with check (bucket_id = %L and (storage.foldername(name))[1] = public.my_company()::text)
    $f$, b || '_company_write', b);

    execute format($f$
      create policy %I on storage.objects for update to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = public.my_company()::text)
    $f$, b || '_company_update', b);

    execute format($f$
      create policy %I on storage.objects for delete to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = public.my_company()::text)
    $f$, b || '_company_delete', b);
  end loop;
end $$;

-- ── Rollback (manual) ───────────────────────────────────────────────────────
-- drop function if exists public.next_ref(text);
-- drop table if exists public.ref_sequences;
-- alter table public.quotes drop column if exists cost_score, ... ;
-- alter table public.shipments drop column if exists source_override_reason;
-- drop policy if exists compliance-docs_company_read on storage.objects;  -- etc.
