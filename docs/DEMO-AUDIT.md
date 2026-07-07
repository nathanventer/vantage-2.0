# Phase 0 Audit — demo/e2e-transaction-fixes (2026-07-07)

## 1. Repo map
- Vite 8 + React 19 + TypeScript + Tailwind v4 (dark-only tokens in `src/styles.css`), TanStack Start/Router/Query, shadcn/ui, Recharts, Leaflet. Runtime/PM: **Bun** (no node/npm on machine).
- Routes: file-based in `src/routes/` (`_app.*` = authed shell). Demo-path routes: `_app.transactions.new.tsx`, `_app.transactions.index.tsx`, `_app.transactions.$id.tsx`, `_app.requests.tsx` (Source inbox), `_app.documents.tsx`, `_app.payments.tsx`, `_app.tracking.$tripId.tsx`, `_app.pulse.tsx`, `_app.reports.tsx`, admin under `_app.admin.*`.
- Scripts (package.json): `dev`, `build`, `lint` (eslint), `format`, `test` (vitest), `test:e2e` (playwright), `test:integration`.

## 2. Data layer map
- Port: `src/services/DataService.ts`; impls `mockApi.ts` (from `src/data/mock.ts`) and `supabaseApi.ts`; switch in `src/services/index.ts` via `VITE_DATA_BACKEND` (**currently `supabase`**, `VITE_EDGE_LIVE=on`).
- Supabase client: `src/lib/supabaseClient.ts` (anon key). Adapters in `src/adapters/` call edge functions via `src/lib/edge.ts`.
- Mock sources on demo path: **none** — `supabaseApi.ts` contains zero `mockApi` delegation (only a stale comment at line 352). mockApi remains as the offline backend (kept intentionally).

## 3. Schema map (live, verified via SQL)
- `shipments`: id, reference, demand_company_id, source_company_id, created_by, shipment_type, cargo_description, origin_port, destination_port, final_delivery_location, **container_type**, quantity, weight_kg, cargo_value, currency, required_services, required_date, special_handling, budget, status (`shipment_status`), current_step, source_override_reason, notes, created_at, updated_at. **No vessel columns** (FIX 8 migration needed).
- `quotes`: id, reference (`QTE-####`), shipment_id, source_company_id, freight/customs/warehouse/transport/other_cost, vat_amount, total, estimated_transit_days, validity_date, 5 score cols, total_score, status (`quote_status`), created_at. **No rejection columns** (FIX 5 migration needed).
- `shipment_events`: id, shipment_id, event_type, location, notes, created_by, created_at, step, note, payload, trip_ref. No separate `event_timestamp` — `created_at` is the event time.
- Enums (verbatim): `quote_status` = submitted | shortlisted | **selected** | **rejected** | withdrawn; `shipment_status` = draft | submitted | quoted | approved | in_progress | completed | invoiced | paid | cancelled | disputed | archived; `doc_status` = draft | generated | uploaded | submitted | approved | rejected | archived.
- Other demo tables live + populated: `shipment_documents` (1.5k), `invoices` (amount_cents; **no line-items table** — pro-forma line items live in document `payload`), `payments`, `trips`+`trip_waypoints`, `companies`, `profiles`, `lane_rates` (72), `rate_subscriptions`, `audit_logs`. RPCs: `select_shipment_quote`, `next_ref`, `pulse_executive_summary` (verified).

## 4. Demo-path trace
| Step | Handler today | State |
|---|---|---|
| Create shipment | `_app.transactions.new.tsx` → `api.createShipment` → `scoreQuotes` → `selectQuote` (RPC `select_shipment_quote`) | WORKING |
| Source sees request | `_app.requests.tsx` → `api.listShipmentRequests` | WORKING (read-only) |
| Source submits quote | — | **MISSING** (no `submitQuote` on the port; requests page has no write) |
| Demand accepts on detail page | `_app.transactions.$id.tsx` Quotes tab → `setAcceptedId` local state + toast | **BROKEN (split-brain: client-only, not persisted)** |
| Demand rejects w/ reason | — | **MISSING** |
| Lifecycle events | OpsConsole → `api.listShipmentEvents` (ordered `created_at DESC`, no id tiebreak) | WORKING (ordering hardening needed) |
| Documents / invoice | `_app.documents.tsx`, `_app.payments.tsx` → live tables, linked by shipment reference | WORKING |
| Vessel tracking | Transaction detail shows `containerNo` only; no vessel fields anywhere | MISSING |
| Pulse | `_app.pulse.tsx` → `listLaneRates`/`listRateBenchmarks`/`listPriceAlerts`/`getRateSubscription` | WORKING (verify data) |
| Reports | `_app.reports.tsx` (5 tabs, computed KPIs, CSV/XLSX/PDF export) | WORKING; **no Management Overview** |

## 5. RLS check (pg_policies, verified)
- `shipments`: demand-scoped read/insert/update + admin ALL + SECURITY DEFINER helpers (`my_quote_shipment_ids`, `my_demand_shipment_ids`) — recursion-safe. Source reads assigned/quoted shipments (proven by `scripts/rls-proof.ts`, 6/6).
- `quotes`: `p_quote_read` (both sides of the shipment), `p_quote_write` INSERT (source for own company), `p_quote_upd`/`p_quote_demand_update` UPDATE (demand side can update status). Adequate for submit/accept/reject.
- `shipment_events`: select + insert policies present.

## 6. Gap list → fixes
1. **FIX 5 migration**: `quotes` + `rejection_reason text, rejected_at timestamptz, rejected_by uuid` (`ADD COLUMN IF NOT EXISTS`).
2. **FIX 8 migration**: `shipments` + `vessel_name, vessel_imo, vessel_mmsi, vesselfinder_url` (all text).
3. **Port additions**: `submitQuote(shipmentId, input)` (Source), `rejectQuote(shipmentId, quoteId, reason)` (Demand) — both impls (supabase + mock).
4. **UI**: wire detail-page Accept → `selectQuote`; Reject dialog (trim ≥3 chars) → `rejectQuote`; show Rejected chip + reason both sides; Submit-quote dialog on `_app.requests.tsx`.
5. **Mapper**: `quoteStatus()` currently maps everything ≠ selected to "Quoted" — must map `rejected` → "Rejected"; `QuoteStatus` UI type gains "Rejected".
6. **FIX 2**: add `.order("id", …)` tiebreaks to `listShipmentEvents` + `listAuditEvents` (created_at is the event timestamp; no nullable timestamp column exists).
7. **FIX 6**: user-facing label "Container type" in `transactions.new` + "Container" rows in `$id` detail → "Cargo Configuration"; options add Bulk / Break Bulk / Tanker (values stored in existing `container_type` text column — no DB rename).
8. **FIX 7**: new `src/lib/invoice.ts` (Number-coerced, currency-rounded totals) + unit test; used by PaperDocument + pro-forma payload line items.
9. **FIX 11**: new "Management Overview" tab in `_app.reports.tsx` from live port data.
10. **Seed**: `supabase/seed_demo_transaction.sql` — idempotent known-good demo transaction (2 quotes: selected + rejected-with-reason, staggered lifecycle events, documents incl. pro-forma with 2 line items, vessel data).

Status model (final, existing values only): shipment `draft→submitted→quoted→approved→in_progress→completed→invoiced→paid`; quote `submitted→selected | rejected` (selected sets shipment.source_company_id via RPC `select_shipment_quote`).
