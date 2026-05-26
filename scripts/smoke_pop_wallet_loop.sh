#!/usr/bin/env bash
# End-to-end smoke for proof → validator → pending hold → settle (no Docker required).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VALIDATOR_DIR="$ROOT/integrations/pop-core/validator"
APP_DIR="$ROOT/app"
SMOKE_DIR="$(mktemp -d /tmp/pop-smoke-XXXXXX)"
PORT="${POP_VALIDATOR_PORT:-9876}"
BASE="http://127.0.0.1:${PORT}"
SESSION_ID="sess_smoke_$(date +%s)"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$SMOKE_DIR"
}
trap cleanup EXIT

echo "== POP wallet loop smoke =="
echo "data: $SMOKE_DIR"
echo "port: $PORT"

cd "$VALIDATOR_DIR"
npm test --silent

export POP_VALIDATOR_PORT="$PORT"
export POP_VALIDATOR_DATA_DIR="$SMOKE_DIR/data"
node --import tsx src/server.ts &
SERVER_PID=$!

for _ in $(seq 1 30); do
  if curl -sf "$BASE/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

health="$(curl -sf "$BASE/health")"
echo "health: $health"

cors_code="$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "$BASE/health" \
  -H 'Origin: http://localhost:5173' \
  -H 'Access-Control-Request-Method: POST')"
echo "cors-preflight: $cors_code"
[[ "$cors_code" == "204" ]] || { echo "FAIL: CORS preflight expected 204" >&2; exit 1; }

packet="$ROOT/integrations/pop-core/fixtures/PP-000001.json"
validate_body="$(node -e "
const fs = require('fs');
const packet = JSON.parse(fs.readFileSync('$packet','utf8'));
packet.sessionId = '$SESSION_ID';
console.log(JSON.stringify({ packet, mode: 'pending', artifactId: 'SMOKE-001' }));
")"

validate="$(curl -sf -X POST "$BASE/v1/proof-packets/validate" \
  -H 'content-type: application/json' \
  -d "$validate_body")"
echo "validate: $validate"

list="$(curl -sf "$BASE/v1/pending-holds?localUserRef=demo-user-001")"
echo "list: $list"
echo "$list" | grep -q '"hold_status":"pending"' || {
  echo "FAIL: expected pending hold in list" >&2
  exit 1
}

settle="$(curl -sf -X POST "$BASE/v1/pending-holds/${SESSION_ID}/settle-demo")"
echo "settle: $settle"
echo "$settle" | grep -q '"source":"local"' || {
  echo "FAIL: expected local settlement" >&2
  exit 1
}

list2="$(curl -sf "$BASE/v1/pending-holds?localUserRef=demo-user-001")"
echo "list-after-settle: $list2"
echo "$list2" | grep -q '"hold_status":"settled"' || {
  echo "FAIL: expected settled hold" >&2
  exit 1
}

cd "$APP_DIR"
npm run typecheck --silent
npm run build --silent

echo ""
echo "PASS: POP wallet loop smoke (local-json mode, no Docker)"
echo "Session: $SESSION_ID"
