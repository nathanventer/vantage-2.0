# Vantage — Claude Code project guide

Integrated Trade & Logistics Platform for Southern Africa. Two-sided marketplace
(TradeHub = transactional core, Pulse = reporting/rate intelligence) with a
16-step shipment lifecycle: Vessel → Port → Clearing → Transport → Warehouse → Delivery.

## Commands (Bun — there is NO node/npm/npx on this machine)

```bash
bun install                    # deps
bun run dev                    # dev server → http://localhost:8080
bun x tsc --noEmit             # typecheck
bun run build                  # production build (vite + nitro)
bun run test                   # unit tests (vitest)
bun run lint                   # eslint
bun run scripts/rls-proof.ts   # per-role RLS assertions against the live DB
```

## Backend

- Supabase project ref `qzckmlhaoehsngxjlgfk` (eu-west-1). Postgres + GoTrue auth +
  Storage + 9 deployed edge functions (sources in `supabase/functions/`).
- `.env.local`: `VITE_DATA_BACKEND` = `mock` (offline) | `supabase` (live);
  `VITE_EDGE_LIVE` = `on` routes adapters through edge functions.
- Demo logins (password `Demo@123`): admin@tradehub.com, auditor@pulse.com,
  buyer|finance@ubuntuimports.com, provider|warehouse|transport|customs@sclogistics.com.
- `doc_status` enum: draft|generated|uploaded|submitted|approved|rejected|archived —
  there is NO `verified`; signing writes `submitted` + signature columns.

## Architecture invariants (do not regress)

- ALL data access goes through the port: `src/services/{DataService,mockApi,supabaseApi,index}.ts`.
  UI imports `{ api } from "@/services"`. ZERO raw `supabase.from()`/`supabase.auth`
  in components/pages. Auth via `src/adapters/auth.ts`.
- `mockApi` must keep implementing the full `DataService` — the backend toggles both ways.
- Integration seams live in `src/adapters/` (paymentGateway, complianceVerifier, notifier,
  signatureProvider, documentRenderer, fleetTracker, optimizer); real impls call edge
  functions via `src/lib/edge.ts`. Provider secrets live ONLY in edge-function env —
  the service-role key never enters the client bundle.
- RLS: `is_admin()`/`my_company()` are SECURITY DEFINER; shipments↔quotes policies use
  SECURITY DEFINER helper fns (recursion-safe). `handle_new_user()` keeps
  `set search_path=''`. `audit_logs` is append-only.
- Money is integer cents (`amount_cents`) / numeric in DB, `formatZAR` + `tabular-nums`
  in UI. Never float.
- Dark-only design system (`src/styles.css` tokens). Paper documents (invoice/quote/all
  doc types) render through `src/components/PaperDocument.tsx` — one design language.
- Migrations in `supabase/migrations/` are idempotent; never rewrite pushed git history
  (Lovable edits this repo in parallel — expect files to change between sessions).

## Knowledge base

The long-form product brain lives in the Obsidian vault
`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/VANTAGE 2.0/VANTAGE2.0/`
(notes: Vantage — Home, Product Overview, Accounts & Roles, Platform Workflow,
Architecture, Roadmap & Phases, Demo Readiness). Cursor shares this brain via
`.cursor/rules/vantage-build-rules.mdc` + `.cursor/mcp.json` (bunx filesystem MCP).
Keep vault notes updated when the build changes materially.
