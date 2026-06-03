#!/usr/bin/env bash
# Start full local [ i ] stack: Supabase + POP validator + Vite app.
#
# Usage:
#   ./scripts/dev_stack.sh           # start all (no db reset)
#   ./scripts/dev_stack.sh --reset   # reset Supabase + seed, then start all

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin"
export PATH="$DOCKER_BIN:$PATH"

RESET_FLAG=""
if [[ "${1:-}" == "--reset" ]]; then
  RESET_FLAG="--reset"
fi

PID_DIR="$ROOT/.dev-stack"
mkdir -p "$PID_DIR"
VALIDATOR_PID="$PID_DIR/validator.pid"
APP_PID="$PID_DIR/app.pid"

stop_if_running() {
  local pid_file="$1"
  local label="$2"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      echo "Stopping existing $label (pid $pid)..."
      kill "$pid" 2>/dev/null || true
      sleep 1
    fi
    rm -f "$pid_file"
  fi
}

stop_if_running "$VALIDATOR_PID" "validator"
stop_if_running "$APP_PID" "app"

echo "== Starting Supabase =="
"$ROOT/scripts/start_local_stack.sh" $RESET_FLAG

# shellcheck disable=SC1090
source "$ROOT/.env.local.stack"
export SUPABASE_URL="${API_URL:?}"
export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:?}"

echo ""
echo "== Starting POP validator =="
cd "$ROOT/integrations/pop-core/validator"
nohup node --import tsx src/server.ts >>"$PID_DIR/validator.log" 2>&1 &
echo $! >"$VALIDATOR_PID"

for _ in $(seq 1 30); do
  curl -sf http://127.0.0.1:8787/health >/dev/null 2>&1 && break
  sleep 0.3
done

if ! curl -sf http://127.0.0.1:8787/health >/dev/null 2>&1; then
  echo "Validator failed to start — see $PID_DIR/validator.log" >&2
  tail -20 "$PID_DIR/validator.log" >&2 || true
  exit 1
fi

echo ""
echo "== Starting app =="
if [[ ! -f "$ROOT/app/.env.local" ]]; then
  cat >"$ROOT/app/.env.local" <<EOF
VITE_POP_VALIDATOR_URL=http://127.0.0.1:8787
VITE_DEMO_USER_ID=00000000-0000-4000-8000-000000000001
VITE_AUTO_SETTLE=true
VITE_INVESTOR_DEMO=true
EOF
fi

# Merge Supabase auth vars for app (idempotent append)
ANON_KEY="$(grep '^ANON_KEY=' "$ROOT/.env.local.stack" | cut -d= -f2- | tr -d '"')"
API_URL="$(grep '^API_URL=' "$ROOT/.env.local.stack" | cut -d= -f2- | tr -d '"')"
ENV_LOCAL="$ROOT/app/.env.local"
grep -q '^VITE_INVESTOR_DEMO=' "$ENV_LOCAL" 2>/dev/null || echo 'VITE_INVESTOR_DEMO=true' >>"$ENV_LOCAL"
grep -q '^VITE_SUPABASE_URL=' "$ENV_LOCAL" 2>/dev/null || echo "VITE_SUPABASE_URL=$API_URL" >>"$ENV_LOCAL"
grep -q '^VITE_SUPABASE_ANON_KEY=' "$ENV_LOCAL" 2>/dev/null || echo "VITE_SUPABASE_ANON_KEY=$ANON_KEY" >>"$ENV_LOCAL"
grep -q '^VITE_STRIPE_FUNCTIONS_READY=' "$ENV_LOCAL" 2>/dev/null || echo "VITE_STRIPE_FUNCTIONS_READY=true" >>"$ENV_LOCAL"
grep -q '^VITE_APP_BASE_URL=' "$ENV_LOCAL" 2>/dev/null || echo "VITE_APP_BASE_URL=http://localhost:5173" >>"$ENV_LOCAL"

"$ROOT/scripts/enable_stripe_live_env.sh" 2>/dev/null || true

cd "$ROOT/app"
nohup ./node_modules/.bin/vite --host 127.0.0.1 >>"$PID_DIR/app.log" 2>&1 &
echo $! >"$APP_PID"

for _ in $(seq 1 30); do
  curl -sf http://localhost:5173/ >/dev/null 2>&1 && break
  sleep 0.3
done

cat <<EOF

== Dev stack ready ==

  App:        http://localhost:5173
  Validator:  http://127.0.0.1:8787/health
  Studio:     http://127.0.0.1:54323

  Logs:
    $PID_DIR/validator.log
    $PID_DIR/app.log

  Smoke:
    ./scripts/smoke_organism_spine.sh
    ./scripts/run_android_dev_loop.sh

  Stop:
    kill \$(cat $VALIDATOR_PID) \$(cat $APP_PID) 2>/dev/null; rm -f $VALIDATOR_PID $APP_PID

EOF
