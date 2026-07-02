#!/bin/sh
# share-demo — launch the password-protected public demo link.
# Requires SHARE_PASSWORD in .env.local. Ctrl-C stops everything.
set -e
cd "$(dirname "$0")/.."
BUN="$HOME/.bun/bin/bun"

echo "[share-demo] starting app server (:8080)…"
curl -s -o /dev/null --max-time 2 http://localhost:8080/ || { "$BUN" run dev & }
until curl -s -o /dev/null --max-time 2 http://localhost:8080/; do sleep 1; done

echo "[share-demo] starting password gateway (:8090)…"
SHARE_TARGET=http://localhost:8080 "$BUN" scripts/secure-share.ts &

echo "[share-demo] opening Cloudflare tunnel…"
exec "$BUN" x cloudflared tunnel --url http://localhost:8090
