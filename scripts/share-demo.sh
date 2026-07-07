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

echo "[share-demo] opening share tunnel (localhost.run)…"
echo "[share-demo] your link appears below as https://….lhr.life — send it with the access code."
# Connect WITH the SSH key (not nokey@) so the URL is STABLE across reconnects.
exec ssh -i "$HOME/.ssh/id_ed25519" -o StrictHostKeyChecking=accept-new \
  -o ServerAliveInterval=20 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes \
  -R 80:localhost:8090 localhost.run
