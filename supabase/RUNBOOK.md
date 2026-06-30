# Vantage Phase 2 — go-live runbook

Everything in Phase 2 ships **offline-safe**: the app runs on the mock backend and
sandbox adapters until you apply the migrations, deploy the edge functions, set the
secrets, and flip two env flags. Nothing here drops Phase-1 data — every migration is
additive and idempotent.

## 0. Prerequisites (one-time)

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref qzckmlhaoehsngxjlgfk
```

## 1. Apply migrations (additive, idempotent, ordered)

```bash
supabase db push        # applies everything in supabase/migrations in order
```

Phase-2 migrations, in apply order:

| Migration                              | Adds                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `20260630130000_ops_execution.sql`     | `shipment_events`, doc columns, `can_see_shipment()`, RLS + audit trig  |
| `20260630140000_pulse_rate_intelligence.sql` | `rate_cards`, `lane_rates`, `market_benchmarks`, `rate_subscriptions`, `price_alerts`, `has_active_pulse()` + RLS |
| `20260630150000_notifications.sql`     | `notifications`, `notification_preferences`, RLS, realtime publication  |
| `20260630160000_pulse_aggregates.sql`  | `mv_cost_by_route`, `refresh_pulse_aggregates()`, summary/trend RPCs     |
| `20260630170000_rbac_roles.sql`        | granular `user_role` enum values + scoped admin helpers                 |

## 2. Seed Phase-2 demo data (optional, idempotent)

```bash
supabase db execute --file supabase/seed.sql
```

Adds a provider rate card + 12 months of lane rates, an active Pulse subscriber
(`buyer@ubuntuimports.com`), and sample ops events on `TXN-1003`. The Phase-2 block
self-skips if the tables are not present.

## 3. Deploy edge functions + set secrets

See [`functions/README.md`](./functions/README.md) for the full table. Summary:

```bash
supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... \
  PULSE_PRICE_STANDARD=price_... PULSE_PRICE_PRO=price_... \
  RESEND_API_KEY=... EMAIL_FROM="Vantage <noreply@yourdomain.co.za>" \
  APP_URL=https://app.vantage.co.za MAPS_API_KEY=...
supabase functions deploy create-payment-intent create-checkout-session \
  create-checkout-session send-email verify-compliance sign-doc render-pdf fleet-position
supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe is unauthenticated
```

Register the Stripe webhook endpoint (`/functions/v1/stripe-webhook`) and copy its
signing secret into `STRIPE_WEBHOOK_SECRET`.

## 4. Schedule the cron report (optional)

```sql
select cron.schedule('pulse-weekly', '0 6 * * 1',
  $$ select net.http_post(
       url := 'https://qzckmlhaoehsngxjlgfk.functions.supabase.co/scheduled-reports',
       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_token'))
     ); $$);
```

## 5. Generate DB types (replaces hand-written casts)

```bash
bun run types:gen      # → src/types/supabase.ts
```

## 6. Flip to live

```bash
# client .env.local
VITE_DATA_BACKEND=supabase
VITE_EDGE_LIVE=on
```

`VITE_EDGE_LIVE=on` swaps each adapter (payment / compliance / notifier / renderer /
fleet) from its mock impl to the edge-backed impl. Ports are unchanged, so the swap is
transparent to every component.

## 7. Verify

- **RLS matrix** — sign in as each role and confirm visibility:
  `super_admin`, `operations_admin`, `finance_admin`, `compliance_admin`,
  `demand_user`, `source_user`, `subscriber`.
- **Payments** — settle a sandbox invoice → `stripe-webhook` marks it paid (never the client).
- **Pulse** — checkout a plan → `rate_subscriptions` row → Pulse unlocks.
- **Realtime** — write a `shipment_events` row → dashboard updates live.
- **Notifications** — trigger an approval → in-app row + Resend email.
- **Bundle hygiene** — `bun run build && grep -rE "sk_test|re_[0-9A-Za-z]|service_role" dist/`
  must return nothing (secrets are server-only).

## Rollback

Functions are independently re-deployable. Enum values cannot be removed without
recreating the type; helper functions and policies can be dropped individually.
Flipping `VITE_EDGE_LIVE=off` (or `VITE_DATA_BACKEND=mock`) instantly returns the app
to the sandbox path with no data change.
