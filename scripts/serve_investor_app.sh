#!/usr/bin/env bash
# Keep investor app + validator running until Ctrl+C (macOS-safe; npm wrapper exits early).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_LOCAL="$ROOT/app/.env.local"

if [[ ! -f "$ENV_LOCAL" ]]; then
  cat >"$ENV_LOCAL" <<EOF
VITE_POP_VALIDATOR_URL=http://127.0.0.1:8787
VITE_DEMO_USER_ID=00000000-0000-4000-8000-000000000001
VITE_AUTO_SETTLE=true
VITE_INVESTOR_DEMO=true
EOF
fi

if [[ -f "$ROOT/.env.local.stack" ]]; then
  ANON_KEY="$(grep '^ANON_KEY=' "$ROOT/.env.local.stack" | cut -d= -f2- | tr -d '"')"
  API_URL="$(grep '^API_URL=' "$ROOT/.env.local.stack" | cut -d= -f2- | tr -d '"')"
  grep -q '^VITE_SUPABASE_URL=' "$ENV_LOCAL" 2>/dev/null || echo "VITE_SUPABASE_URL=$API_URL" >>"$ENV_LOCAL"
  grep -q '^VITE_SUPABASE_ANON_KEY=' "$ENV_LOCAL" 2>/dev/null || echo "VITE_SUPABASE_ANON_KEY=$ANON_KEY" >>"$ENV_LOCAL"
fi

cleanup() {
  jobs -p | xargs kill 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "== Investor app server =="
echo "  App:       http://127.0.0.1:5173/?investor=1"
echo "  Validator: http://127.0.0.1:8787/health"
echo "  Press Ctrl+C to stop"
echo ""

cd "$ROOT/integrations/pop-core/validator"
node --import tsx src/server.ts &
VALIDATOR_PID=$!

cd "$ROOT/app"
./node_modules/.bin/vite --host 127.0.0.1 &
VITE_PID=$!

wait "$VALIDATOR_PID" "$VITE_PID" 2>/dev/null || wait
