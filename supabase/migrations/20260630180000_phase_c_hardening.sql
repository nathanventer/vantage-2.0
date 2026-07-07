-- Phase C hardening: compliance file_path, POPIA erasure requests, admin storage
-- read, performance indexes. Idempotent + additive.

begin;

-- ── 1. Compliance document file paths ───────────────────────────────────────
alter table public.compliance_documents add column if not exists file_path text;

-- ── 2. POPIA data-subject erasure requests ──────────────────────────────────
create table if not exists public.data_subject_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  request_type  text not null check (request_type in ('erasure')),
  reason        text,
  status        text not null default 'pending'
                check (status in ('pending','approved','rejected','completed')),
  created_at    timestamptz not null default now()
);

create index if not exists data_subject_requests_user_idx
  on public.data_subject_requests (user_id, created_at desc);

alter table public.data_subject_requests enable row level security;

drop policy if exists dsr_owner_read on public.data_subject_requests;
create policy dsr_owner_read on public.data_subject_requests
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists dsr_owner_insert on public.data_subject_requests;
create policy dsr_owner_insert on public.data_subject_requests
  for insert to authenticated with check (user_id = auth.uid());

-- ── 3. Admin storage read (admins verify cross-company uploads) ─────────────
do $$
declare
  b text;
begin
  foreach b in array array['compliance-docs', 'transaction-docs'] loop
    execute format('drop policy if exists %I on storage.objects', b || '_admin_read');
    execute format($f$
      create policy %I on storage.objects for select to authenticated
      using (bucket_id = %L and public.is_admin())
    $f$, b || '_admin_read', b);
  end loop;
end $$;

-- ── 4. Performance indexes for common list filters ──────────────────────────
create index if not exists shipments_demand_status_idx
  on public.shipments (demand_company_id, status, created_at desc);

create index if not exists shipments_source_idx
  on public.shipments (source_company_id, created_at desc);

create index if not exists quotes_shipment_idx
  on public.quotes (shipment_id, status);

create index if not exists shipment_documents_shipment_idx
  on public.shipment_documents (shipment_id, created_at desc);

create index if not exists compliance_documents_company_idx
  on public.compliance_documents (company_id, doc_type);

create index if not exists audit_logs_created_idx
  on public.audit_logs (created_at desc);

commit;

-- Rollback (manual): drop table data_subject_requests; drop admin storage policies;
-- drop indexes individually if needed.
