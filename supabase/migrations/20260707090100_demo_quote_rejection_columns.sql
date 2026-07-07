-- FIX 5: mandatory rejection reason on quotes. Idempotent.
-- Applied to live via MCP as `demo_quote_rejection_columns`.
alter table public.quotes
  add column if not exists rejection_reason text,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid;
