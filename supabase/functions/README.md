# Vantage Edge Functions — deploy & secrets runbook

All real third-party integrations run **server-side** in these Supabase Edge
Functions. Provider secrets live **only** in function env (never in the client
bundle). The client calls them through the adapter ports via
`src/lib/edge.ts` → `supabase.functions.invoke()`.

The app runs on **mock/sandbox** until you flip the flag:

```
# client .env.local
VITE_EDGE_LIVE=on        # switch adapters from mock → edge-backed
```

## Prerequisites

```bash
# install the Supabase CLI (not available in the build sandbox)
brew install supabase/tap/supabase
supabase login
supabase link --project-ref qzckmlhaoehsngxjlgfk
```

## Functions

| Function                  | Purpose                                              | Secrets |
|---------------------------|------------------------------------------------------|---------|
| `create-payment-intent`   | Stripe PaymentIntent for an invoice                  | `STRIPE_SECRET_KEY` |
| `stripe-webhook`          | Confirms settlement / activates subscription (trusted) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `create-checkout-session` | Pulse subscription checkout                          | `STRIPE_SECRET_KEY`, `PULSE_PRICE_STANDARD`, `PULSE_PRICE_PRO`, `APP_URL` |
| `send-email`              | Templated transactional email                        | `RESEND_API_KEY`, `EMAIL_FROM` |
| `verify-compliance`       | CIPC/SARS/bank/VAT/B-BBEE verification (sandbox fallback) | `COMPLIANCE_API_BASE`, `COMPLIANCE_API_KEY` |
| `sign-doc`                | Finalise e-signature + audit                         | `SIGNATURE_WEBHOOK_SECRET` (optional) |
| `render-pdf`              | Branded PDF → transaction-docs bucket                | platform `SUPABASE_*` only |
| `fleet-position`          | Latest GPS/ETA for a trip                            | `MAPS_API_KEY` |
| `scheduled-reports`       | Cron Pulse report email + snapshot                   | `RESEND_API_KEY`, `EMAIL_FROM` |

## Set secrets

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  PULSE_PRICE_STANDARD=price_... \
  PULSE_PRICE_PRO=price_... \
  RESEND_API_KEY=re_... \
  EMAIL_FROM="Vantage <noreply@yourdomain.co.za>" \
  APP_URL=https://app.vantage.co.za \
  MAPS_API_KEY=...
# COMPLIANCE_API_* only once an accredited CIPC/SARS provider is contracted.
```

## Deploy

```bash
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe calls it unauthenticated
supabase functions deploy create-checkout-session
supabase functions deploy send-email
supabase functions deploy verify-compliance
supabase functions deploy sign-doc
supabase functions deploy render-pdf
supabase functions deploy fleet-position
supabase functions deploy scheduled-reports
```

Register the Stripe webhook endpoint (`/functions/v1/stripe-webhook`) in the
Stripe dashboard and copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

## Generate DB types (replaces hand-written casts)

```bash
bun run types:gen   # supabase gen types ... > src/types/supabase.ts
```
