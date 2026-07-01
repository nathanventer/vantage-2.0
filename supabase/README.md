# Supabase — schema, migrations & demo seed

Project ref: `qzckmlhaoehsngxjlgfk` (region eu-west-1).

## Apply order (fresh database)

1. **Base schema** — `VANTAGE_PHASE1_FINAL_SETUP.sql` (the canonical 8 tables / 9
   enums, RLS, audit triggers, `handle_new_user`). This is the authority document;
   keep it at the repo root or in this folder.
2. **Migrations** (`./migrations`, in filename order):
   - `20260629195025_fix_rls_recursion_shipments_quotes.sql` — breaks the
     `shipments`↔`quotes` mutual RLS recursion using `SECURITY DEFINER` helpers.
   - `20260629195613_fix_rls_helpers_security_definer.sql` — makes
     `is_admin()` / `my_company()` `SECURITY DEFINER` (root recursion fix; required
     for any authenticated read to work).
3. **Demo data** — `./seed.sql` (idempotent; safe to re-run).

Both migrations are already applied to the live project (see `list_migrations`).

## Demo logins

All demo accounts use password **`Demo@123`** (created by `seed.sql`):

| Email                     | Role             | Company                  |
| ------------------------- | ---------------- | ------------------------ |
| admin@tradehub.com        | super_admin      | — (platform)             |
| auditor@pulse.com         | compliance_admin | — (Pulse)                |
| buyer@ubuntuimports.com   | demand_user      | Ubuntu Retail Imports    |
| finance@ubuntuimports.com | demand_user      | Ubuntu Retail Imports    |
| provider@sclogistics.com  | source_user      | Southern Cross Logistics |
| warehouse@sclogistics.com | source_user      | Southern Cross Logistics |
| transport@sclogistics.com | source_user      | Southern Cross Logistics |
| customs@sclogistics.com   | source_user      | Southern Cross Logistics |

Seeded data: 2 companies, 8 users, **125 shipments** (TXN-1001..1125), matching quotes,
shipment documents, notifications (Phase 3), Pulse lane rates, and verified compliance
documents. Source: `TradeHub_Pulse_Demo_Workbook.xlsx` +
`DEMO TradeHub Demo Participants for Pulse Reporting.docx` + `src/data/demoDataset.ts`.

After seeding, verify counts:

```bash
supabase db query --linked -f supabase/verify-demo-seed.sql
```

## Notes

- The frontend selects the backend via `VITE_DATA_BACKEND` (`mock` | `supabase`)
  in `.env.local`; only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` ship to the
  client. The service-role key must never be in client code.
- `seed.sql` creates auth users directly in `auth.users` (with `''` token columns
  so GoTrue can authenticate them) and relies on `handle_new_user` to create the
  matching `profiles` row.
