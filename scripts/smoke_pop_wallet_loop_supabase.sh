#!/usr/bin/env bash
# Full smoke: Supabase ledger settle (requires Docker Desktop engine running).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin"
export PATH="$DOCKER_BIN:$PATH"

if ! docker info >/dev/null 2>&1; then
  echo "SKIP: Docker daemon not running. Start Docker Desktop first." >&2
  echo "Then: ./scripts/start_local_stack.sh --reset && ./scripts/smoke_pop_wallet_loop_supabase.sh" >&2
  exit 1
fi

"$ROOT/scripts/start_local_stack.sh" --reset

ENV_FILE="$ROOT/.env.local.stack"
# shellcheck disable=SC1090
source "$ENV_FILE"

export SUPABASE_URL="${API_URL:?}"
export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:?}"
export POP_VALIDATOR_PORT="${POP_VALIDATOR_PORT:-9877}"
export POP_VALIDATOR_DATA_DIR="$(mktemp -d /tmp/pop-supabase-smoke-XXXXXX)/data"
BASE="http://127.0.0.1:${POP_VALIDATOR_PORT}"
SESSION_ID="sess_supabase_smoke_$(date +%s)"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

cd "$ROOT/integrations/pop-core/validator"
node --import tsx src/server.ts &
SERVER_PID=$!

for _ in $(seq 1 30); do
  curl -sf "$BASE/health" >/dev/null 2>&1 && break
  sleep 0.2
done

health="$(curl -sf "$BASE/health")"
echo "health: $health"
echo "$health" | grep -q '"enabled":true' || {
  echo "FAIL: Supabase not enabled on validator" >&2
  exit 1
}

packet="$ROOT/integrations/pop-core/fixtures/PP-000001.json"
validate_body="$(node -e "
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('$packet','utf8'));
p.sessionId = '$SESSION_ID';
console.log(JSON.stringify({ packet: p, mode: 'pending', artifactId: 'SB-SMOKE-001' }));
")"

curl -sf -X POST "$BASE/v1/proof-packets/validate" \
  -H 'content-type: application/json' \
  -d "$validate_body" >/dev/null

settle="$(curl -sf -X POST "$BASE/v1/pending-holds/${SESSION_ID}/settle" \
  -H 'content-type: application/json' \
  -d '{"userId":"00000000-0000-4000-8000-000000000001"}')"
echo "settle: $settle"
echo "$settle" | grep -q '"source":"supabase"' || {
  echo "FAIL: expected supabase settlement" >&2
  exit 1
}
echo "$settle" | grep -q '"success":true' || {
  echo "FAIL: settlement not successful" >&2
  exit 1
}

echo ""
echo "PASS: Supabase ledger settle smoke"
