#!/usr/bin/env bash
# Phase C verification — run from repo root after `bun install`
set -euo pipefail

echo "==> Typecheck"
bun run typecheck

echo "==> Lint"
bun run lint

echo "==> Unit tests"
bun run test

echo "==> Production build (mock backend)"
VITE_DATA_BACKEND=mock \
VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-http://localhost:54321}" \
VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-anon-placeholder}" \
bun run build

echo "==> Bundle secret grep (must be empty)"
if grep -rE 'service_role|sk_live|sk_test|re_[0-9A-Za-z]{10,}' dist/ 2>/dev/null; then
  echo "FAIL: suspected secret in dist/" >&2
  exit 1
fi
echo "OK: no service-role / Stripe secrets in client bundle"

echo "==> Phase C checks passed"
