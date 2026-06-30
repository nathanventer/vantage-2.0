# Vantage RLS matrix — Phase C verification

Project: `qzckmlhaoehsngxjlgfk` · Schema: `public` + Storage buckets  
Pattern: deny-by-default; access via `SECURITY DEFINER` helpers (`is_admin()`, `my_company()`, `can_see_shipment()`).

## Legend

| Symbol | Meaning            |
| ------ | ------------------ |
| ✅     | Allowed (expected) |
| ❌     | Denied (expected)  |
| —      | N/A                |

## Table × role × CRUD (core entities)

| Table / bucket                             | demand_user                 | source_user     | subscriber      | super_admin | operations_admin | finance_admin | compliance_admin  |
| ------------------------------------------ | --------------------------- | --------------- | --------------- | ----------- | ---------------- | ------------- | ----------------- |
| **profiles** own row R                     | ✅                          | ✅              | ✅              | ✅ all      | ✅ all           | ✅ all        | ✅ all            |
| **profiles** other W                       | ❌                          | ❌              | ❌              | ✅          | ✅               | ❌            | ❌                |
| **companies** own R                        | ✅                          | ✅              | ✅              | ✅ all      | ✅ all           | ✅ all        | ✅ all            |
| **companies** other W                      | ❌                          | ❌              | ❌              | ✅          | ✅               | ❌            | ✅ approve/reject |
| **shipments** demand-side CRUD             | ✅ own co                   | ❌ write        | ✅ own co       | ✅ all      | ✅ all           | ✅ read       | ✅ read           |
| **shipments** source-side R                | ✅ if quoted/assigned       | ✅ assigned     | ✅ own RFQs     | ✅ all      | ✅ all           | ✅ read       | ✅ read           |
| **quotes** source W                        | ❌                          | ✅ own co       | ❌              | ✅ all      | ✅ all           | ❌            | ❌                |
| **quotes** demand R                        | ✅ on own shipment          | ❌ other        | ✅ own          | ✅ all      | ✅ all           | ✅ all        | ✅ all            |
| **compliance_documents** own co            | ✅ RW                       | ✅ RW           | ✅ RW           | ✅ all      | ✅ read          | ❌            | ✅ verify         |
| **compliance_documents** other co          | ❌                          | ❌              | ❌              | ✅          | ✅ read          | ❌            | ✅                |
| **shipment_documents**                     | ✅ via `can_see_shipment()` | ✅ via shipment | ✅ via shipment | ✅ all      | ✅ all           | ✅ read       | ✅ read           |
| **audit_logs**                             | ❌ insert client            | ❌              | ❌              | ✅ read     | ✅ read          | ✅ read       | ✅ read           |
| **audit_logs** delete                      | ❌ all roles                | ❌              | ❌              | ❌          | ❌               | ❌            | ❌                |
| **storage: compliance-docs** own prefix    | ✅ RW                       | ✅ RW           | ✅ RW           | ✅ read all | ✅ read all      | ❌            | ✅ read all       |
| **storage: compliance-docs** other prefix  | ❌                          | ❌              | ❌              | ✅ read     | ✅ read          | ❌            | ✅ read           |
| **storage: transaction-docs** own prefix   | ✅ RW                       | ✅ RW\*         | ✅ RW           | ✅ read all | ✅ read all      | ❌            | ✅ read           |
| **storage: transaction-docs** other prefix | ❌                          | ❌              | ❌              | ✅ read     | ✅ read          | ❌            | ✅ read           |

\* Source users read/write POD paths only when their company is the assigned provider on the shipment (enforced by uploading under demand company prefix today; cross-company denial tested in Phase C storage proof).

## Demo users (seed)

| Email                    | Role        | Company                  |
| ------------------------ | ----------- | ------------------------ |
| buyer@ubuntuimports.com  | demand_user | Ubuntu Retail Imports    |
| provider@sclogistics.com | source_user | Southern Cross Logistics |
| admin@tradehub.com       | super_admin | —                        |

Password: `Demo@123`

## Verification procedure

```bash
# 1. Apply migrations + seed
supabase db push
supabase db execute --file supabase/seed.sql

# 2. Manual spot-check (sign in as each role in the app)
#    - demand: sees Ubuntu shipments only
#    - source: sees assigned shipments / requests
#    - admin: sees all registrations + audit

# 3. Storage cross-company denial (browser console as buyer)
#    Attempt download of another company's object path → 403 / signed URL error

# 4. Advisors
supabase db lint   # or Dashboard → Database → Advisors
```

## Phase C storage policies added

Migration `20260630180000_phase_c_hardening.sql`:

- `compliance-docs_admin_read` / `transaction-docs_admin_read` — admins read all paths for verification
- Company-scoped read/write remains on `(storage.foldername(name))[1] = my_company()::text`

## Deferrals

| Item                                                 | Reason                                                               |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| Fine-grained finance_admin write scoping on invoices | Phase 2 invoices still mock-backed                                   |
| Automated 7-role SQL probe in CI                     | Requires live DB credentials in GitHub Actions (manual matrix above) |
