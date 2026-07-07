-- FIX 8: vessel tracking fields on shipments. Idempotent.
-- Applied to live via MCP as `demo_shipment_vessel_columns`.
alter table public.shipments
  add column if not exists vessel_name text,
  add column if not exists vessel_imo text,
  add column if not exists vessel_mmsi text,
  add column if not exists vesselfinder_url text;
