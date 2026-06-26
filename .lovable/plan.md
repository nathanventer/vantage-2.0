# VANTAGE — Phase 0 Frontend Plan

Build the complete clickable front end for the Integrated Trade & Logistics Platform for Southern Africa. **Mock data only — no backend, no Supabase, no auth.** All data flows through one swappable service layer so a real backend can be wired later.

## Foundation (built first, single batch)

**Design system** (`src/styles.css` + Tailwind theme tokens)
- Maritime navy `#0B2545` primary, flow teal `#1B9AAA` accent, surface `#F7F9FC`, ink `#0E1726` / muted `#5B6B7C`
- Status palette: success `#1A7F4B`, pending `#C97A0A`, error `#C0392B`, info `#2D6CDF`, neutral `#64748B`
- Fonts: Plus Jakarta Sans (headings) + Inter (body) loaded via `<link>` in `__root.tsx`
- Soft borders `#E3E8EF`, subtle shadows

**App shell**
- Collapsible left sidebar (role-aware nav) + top bar
- Top-bar **role switcher** (Demand / Source / Admin) labelled "Demo: switch role" — drives nav + visible modules via React Context
- Logo: save uploaded `Logo_Final.png` via lovable-assets, use in sidebar/topbar
- Loading skeletons, empty states, error states, toasts (sonner), responsive, AA contrast

**Code structure**
- `src/types/*.ts` — User, Registration, Transaction, Shipment, Quote, Document, WarehouseJob, ContainerJob, Trip, Invoice, Payment, ComplianceCheck, Report
- `src/data/*.ts` — 15–40 realistic Southern African records per entity (Durban/Cape Town/JHB routes, ZAR, SARS refs, vessels, containers)
- `src/services/mockApi.ts` — async functions with simulated latency; **only data access point**
- `src/contexts/RoleContext.tsx` — active role state
- Reusable: `StatCard`, `StatusBadge` (single source for status colors), `DataTable`, `LifecycleStepper`, `Wizard`, `DetailDrawer`

## Pages (built incrementally as TanStack routes)

```
/                          Login / landing (mock — any login proceeds)
/register                  8-step registration wizard
/dashboard                 Role-aware KPI dashboard
/transactions              List with filters (status/route/value/date)
/transactions/$id          16-step lifecycle stepper + Vessel→Delivery banner
/transactions/new          Create shipment request → matched providers → quotes
/requests                  Source: incoming requests queue
/warehouse                 Job board (Bonded/General/Clearing/Cross-dock) + workflow checklist
/containers                Receiving, dispatch, inspections, dwell-time
/cargo                     Bulk handling, weighbridge, condition reports
/transport                 Trips, fleet, mock GPS, POD
/documents                 Pipeline + template library (12 doc types)
/payments                  Invoices, settlement tracker, reconciliation
/reports                   Tabbed: Transaction / Cost / Operational / Compliance / Source-selection
/admin/registrations       Approval queue
/admin/compliance          Compliance dashboard + CAPA
/admin/audit               Audit log
```

## Key flows

- **Registration wizard (8 steps):** category → form → upload docs → auto-verification → admin review → approval/rejection → activation → service profiling. Governance checklist with Verified/Pending/Failed badges.
- **Transaction lifecycle (16 steps):** vertical stepper with timestamps, overlaid Vessel→Port→Clearing→Transport→Warehouse→Delivery macro banner showing current stage.
- **Document pipeline:** created → templates → uploaded → compliance → approval → SARS verify (mock) → e-sign → shared → archived.
- **Payment pipeline:** confirmed → invoice → request → bank gateway (mock) → processed → settled → reported → closed. Mock PCI/encrypted/fraud-check badges.

## Build order (per turn after foundation)

1. Foundation: tokens, fonts, types, mockApi skeleton, RoleContext, app shell, role switcher, logo, login landing
2. Registration wizard (5.1)
3. Role dashboards (5.2)
4. Transactions list + detail with 16-step stepper + create flow (5.3)
5. Source ops: requests, warehouse, containers, cargo, transport (5.4)
6. Documents (5.5)
7. Payments (5.6)
8. Reports with recharts (5.7)
9. Admin & compliance (5.8)

## Hard guardrails

- ❌ No Supabase, no backend, no real auth, no external API calls, no edge functions
- ❌ No SARS/bank/ERP/GPS integrations — simulated badges only
- ❌ No features outside this spec (no AI chat, marketing fluff, extra modules)
- ✅ All data via `mockApi.ts`; components stay data-free
- ✅ Status colors consistent everywhere via single `StatusBadge` component
- ✅ Strong TypeScript types; loading/empty/error states on every list

## Technical notes

- TanStack Start v1 routing (`src/routes/*.tsx`), TanStack Query for the mockApi reads (Query already in template)
- shadcn/ui components, lucide-react icons, recharts for analytics
- The role switcher is a Context-driven UI affordance — no auth gating; all routes accessible
- Logo uploaded as Lovable asset, imported via JSON pointer
