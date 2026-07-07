-- ─────────────────────────────────────────────────────────────────────────
-- Demo transaction seed (idempotent, re-runnable). Resets ONE known-good
-- end-to-end transaction to a demo-ready state without deleting other data.
-- Fixed UUIDs keep it idempotent; ON CONFLICT upserts the whole graph.
--   Demand : Ubuntu Retail Imports  (11111111-…)
--   Source : Southern Cross Logistics (22222222-…)
-- Run:  psql "$DATABASE_URL" -f supabase/seed_demo_transaction.sql
-- ─────────────────────────────────────────────────────────────────────────

-- The demo shipment (reference DEMO-1001). Cargo Configuration = Break Bulk,
-- vessel data + VesselFinder link, awarded to Southern Cross, mid-lifecycle.
insert into public.shipments (
  id, reference, demand_company_id, source_company_id, shipment_type,
  cargo_description, origin_port, destination_port, final_delivery_location,
  container_type, vessel_name, vessel_imo, vessel_mmsi, vesselfinder_url,
  quantity, weight_kg, cargo_value, currency, required_date,
  status, current_step, created_at, updated_at
) values (
  'de0d0000-0000-4000-8000-000000000001', 'DEMO-1001',
  '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
  'sea_freight', 'Steel coils — 240 t', 'Port of Durban', 'City Deep Terminal, JHB',
  'Johannesburg', 'Break Bulk', 'MSC Sinfonia', '9210562', '636019825',
  null, 12, 240000, 3400000, 'ZAR', (now() + interval '6 days')::date,
  'in_progress', 11, now() - interval '9 days', now()
)
on conflict (id) do update set
  source_company_id = excluded.source_company_id,
  container_type = excluded.container_type,
  vessel_name = excluded.vessel_name, vessel_imo = excluded.vessel_imo,
  vessel_mmsi = excluded.vessel_mmsi, vesselfinder_url = excluded.vesselfinder_url,
  cargo_description = excluded.cargo_description, cargo_value = excluded.cargo_value,
  status = excluded.status, current_step = excluded.current_step, updated_at = now();

-- Two quotes: one AWARDED (selected), one REJECTED with a saved reason.
insert into public.quotes (
  id, reference, shipment_id, source_company_id,
  freight_cost, customs_cost, warehouse_cost, transport_cost, other_cost, vat_amount,
  estimated_transit_days, status, rejection_reason, rejected_at, created_at
) values
  ('de0d0000-0000-4000-8000-0000000000a1', 'QTE-DEMO-A',
   'de0d0000-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222',
   1200000, 180000, 90000, 140000, 40000, 247500, 9, 'selected', null, null,
   now() - interval '8 days'),
  ('de0d0000-0000-4000-8000-0000000000a2', 'QTE-DEMO-B',
   'de0d0000-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222',
   1650000, 210000, 120000, 190000, 60000, 333750, 13, 'rejected',
   'Rate exceeds the approved budget for the Durban–JHB lane', now() - interval '7 days',
   now() - interval '8 days')
on conflict (id) do update set
  status = excluded.status, rejection_reason = excluded.rejection_reason,
  rejected_at = excluded.rejected_at;

-- Lifecycle events with staggered timestamps (newest LAST here; the UI sorts
-- newest-first, so "Departed Durban port" must appear at the TOP).
insert into public.shipment_events (id, shipment_id, event_type, step, note, created_at) values
  ('de0d0000-0000-4000-8000-0000000000e1', 'de0d0000-0000-4000-8000-000000000001', 'created',        1,  'Shipment request created',            now() - interval '9 days'),
  ('de0d0000-0000-4000-8000-0000000000e2', 'de0d0000-0000-4000-8000-000000000001', 'quote_selected', 4,  'Southern Cross Logistics awarded',    now() - interval '7 days'),
  ('de0d0000-0000-4000-8000-0000000000e3', 'de0d0000-0000-4000-8000-000000000001', 'documents',      6,  'Commercial documents uploaded',       now() - interval '5 days'),
  ('de0d0000-0000-4000-8000-0000000000e4', 'de0d0000-0000-4000-8000-000000000001', 'customs',        9,  'Customs cleared at Durban',           now() - interval '2 days'),
  ('de0d0000-0000-4000-8000-0000000000e5', 'de0d0000-0000-4000-8000-000000000001', 'transport',      11, 'Departed Durban port for City Deep',  now() - interval '6 hours')
on conflict (id) do update set note = excluded.note, created_at = excluded.created_at, step = excluded.step;

-- Linked documents incl. a Pro-forma invoice with 2 line items in payload.
insert into public.shipment_documents (id, shipment_id, doc_type, reference, status, version, payload, created_at) values
  ('de0d0000-0000-4000-8000-0000000000d1', 'de0d0000-0000-4000-8000-000000000001', 'purchase_order',   'PO-DEMO-1001',  'approved',  1, '{}'::jsonb, now() - interval '8 days'),
  ('de0d0000-0000-4000-8000-0000000000d2', 'de0d0000-0000-4000-8000-000000000001', 'bill_of_lading',   'BOL-DEMO-1001', 'submitted', 1, '{}'::jsonb, now() - interval '5 days'),
  ('de0d0000-0000-4000-8000-0000000000d3', 'de0d0000-0000-4000-8000-000000000001', 'proforma_invoice', 'PI-DEMO-1001',  'generated', 1,
    jsonb_build_object(
      'counterparty', 'Ubuntu Retail Imports (Pty) Ltd',
      'taxRate', 0.15,
      'lines', jsonb_build_array(
        jsonb_build_object('label','Ocean freight — Durban to City Deep','quantity',1,'unitPriceZAR',1200000),
        jsonb_build_object('label','Break-bulk handling & customs','quantity',1,'unitPriceZAR',450000)
      )
    ), now() - interval '4 days')
on conflict (id) do update set status = excluded.status, payload = excluded.payload;

-- Report readback (safe): confirm the graph.
select
  (select reference from shipments where id='de0d0000-0000-4000-8000-000000000001') as shipment,
  (select count(*) from quotes where shipment_id='de0d0000-0000-4000-8000-000000000001') as quotes,
  (select count(*) from quotes where shipment_id='de0d0000-0000-4000-8000-000000000001' and status='rejected' and rejection_reason is not null) as rejected_with_reason,
  (select count(*) from shipment_events where shipment_id='de0d0000-0000-4000-8000-000000000001') as events,
  (select count(*) from shipment_documents where shipment_id='de0d0000-0000-4000-8000-000000000001') as documents;
