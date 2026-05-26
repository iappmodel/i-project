#!/usr/bin/env bash
# Smoke: validator SSE proof-events stream receives proof-sealed on validate.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VALIDATOR_DIR="$ROOT/integrations/pop-core/validator"
SMOKE_DIR="$(mktemp -d /tmp/proof-events-smoke-XXXXXX)"
PORT="${POP_VALIDATOR_PORT:-9878}"
BASE="http://127.0.0.1:${PORT}"
SESSION_ID="sess_events_$(date +%s)"
OUT="$SMOKE_DIR/events.txt"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$SMOKE_DIR"
}
trap cleanup EXIT

echo "== Proof events SSE smoke =="
echo "port: $PORT"

cd "$VALIDATOR_DIR"
export POP_VALIDATOR_PORT="$PORT"
export POP_VALIDATOR_DATA_DIR="$SMOKE_DIR/data"
unset SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
node --import tsx src/server.ts &
SERVER_PID=$!

for _ in $(seq 1 30); do
  curl -sf "$BASE/health" >/dev/null 2>&1 && break
  sleep 0.2
done

curl -sf "$BASE/health" >/dev/null

curl -N -s --max-time 5 "$BASE/v1/proof-events/stream" >"$OUT" &
SSE_PID=$!
sleep 0.4

packet="$ROOT/integrations/pop-core/fixtures/PP-000001.json"
validate_body="$(node -e "
const fs = require('fs');
const packet = JSON.parse(fs.readFileSync('$packet','utf8'));
packet.sessionId = '$SESSION_ID';
console.log(JSON.stringify({ packet, mode: 'pending', artifactId: 'EVENTS-001' }));
")"

curl -sf -X POST "$BASE/v1/proof-packets/validate" \
  -H 'content-type: application/json' \
  -d "$validate_body" >/dev/null

wait "$SSE_PID" 2>/dev/null || true

if ! grep -q '"type":"proof-sealed"' "$OUT"; then
  echo "FAIL: expected proof-sealed SSE event" >&2
  cat "$OUT" >&2 || true
  exit 1
fi

if ! grep -q "$SESSION_ID" "$OUT"; then
  echo "FAIL: SSE missing session id" >&2
  exit 1
fi

echo "PASS: proof-events SSE smoke"
echo "Session: $SESSION_ID"
