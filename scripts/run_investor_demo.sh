#!/usr/bin/env bash
# Start dev stack and open investor B1 demo (?investor=1).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_LOCAL="$ROOT/app/.env.local"

echo "== Investor demo launcher =="

"$ROOT/scripts/dev_stack.sh" &
STACK_PID=$!

cleanup() {
  kill "$STACK_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 2
for _ in $(seq 1 40); do
  curl -sf http://localhost:5173/ >/dev/null 2>&1 && break
  sleep 0.5
done

grep -q '^VITE_INVESTOR_DEMO=' "$ENV_LOCAL" 2>/dev/null && \
  sed -i.bak 's/^VITE_INVESTOR_DEMO=.*/VITE_INVESTOR_DEMO=true/' "$ENV_LOCAL" 2>/dev/null || \
  echo 'VITE_INVESTOR_DEMO=true' >>"$ENV_LOCAL"
rm -f "$ENV_LOCAL.bak" 2>/dev/null || true

URL="http://localhost:5173/?investor=1"

cat <<EOF

== Investor B1 script (90s) ==
  1. Tap splash → immersive feed (Nike hero card)
  2. Watch & earn → consent → watch → verify → reward
  3. See wallet: pending → settled (POP live when validator up)

  URL: $URL

EOF

if [[ "$(uname -s)" == "Darwin" ]]; then
  open "$URL"
else
  xdg-open "$URL" 2>/dev/null || echo "Open: $URL"
fi

echo "Press Ctrl+C to stop (dev_stack keeps running in background until trap)."
wait "$STACK_PID" 2>/dev/null || true
