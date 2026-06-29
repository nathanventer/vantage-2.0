-- Manual verification: admins tick a checklist and approve/reject companies
-- (no automated SARS/bank/VAT/BBBEE checks in Phase 1).
alter table public.companies add column if not exists verification_checklist jsonb not null default '{}'::jsonb;
alter table public.companies add column if not exists rejection_reason text;
alter table public.companies alter column approval_status set default 'pending';
