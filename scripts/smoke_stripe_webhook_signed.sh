#!/usr/bin/env bash
# Stripe webhook signed-event smoke against local Supabase functions endpoint.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STACK="$ROOT/.env.local.stack"

if [[ -f "$STACK" ]]; then
  # shellcheck disable=SC1090
  source "$STACK"
fi

if [[ -z "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  echo "SKIP: STRIPE_WEBHOOK_SECRET missing."
  exit 0
fi
FUNCTIONS_URL="${FUNCTIONS_URL:-http://127.0.0.1:54321/functions/v1}"
WEBHOOK_URL="${FUNCTIONS_URL%/}/stripe-webhook"
TIMESTAMP="$(date +%s)"
SERVE_LOG="/tmp/stripe-webhook-serve.log"

PAYLOAD="$(cat <<'EOF'
{"id":"evt_smoke_signed_001","object":"event","type":"customer.subscription.updated","data":{"object":{"id":"sub_smoke_signed_001","object":"subscription","status":"active","metadata":{"user_id":"00000000-0000-4000-8000-000000000001"},"items":{"data":[{"price":{"product":"prod_TgTDyU5HXIH8hh"}}]},"current_period_end":4102444800,"current_period_start":1700000000,"cancel_at_period_end":false,"customer":"cus_smoke_signed_001"}}}
EOF
)"

SIGNED_PAYLOAD="${TIMESTAMP}.${PAYLOAD}"
SIGNATURE="$(python3 - <<'PY' "$STRIPE_WEBHOOK_SECRET" "$SIGNED_PAYLOAD"
import hashlib, hmac, sys
secret = sys.argv[1].encode()
payload = sys.argv[2].encode()
print(hmac.new(secret, payload, hashlib.sha256).hexdigest())
PY
)"

SIG_HEADER="t=${TIMESTAMP},v1=${SIGNATURE}"

# Serve only stripe-webhook with local secrets for deterministic smoke.
(
  cd "$ROOT/app"
  supabase functions serve stripe-webhook --env-file "$STACK" --no-verify-jwt >"$SERVE_LOG" 2>&1
) &
SERVE_PID=$!
cleanup() {
  kill "$SERVE_PID" 2>/dev/null || true
}
trap cleanup EXIT

READY=0
for _ in $(seq 1 100); do
  if grep -q "Serving functions on" "$SERVE_LOG" 2>/dev/null; then
    READY=1
    break
  fi
  sleep 0.2
done
if [[ "$READY" -ne 1 ]]; then
  echo "FAIL: supabase functions serve did not start stripe-webhook" >&2
  if [[ -f "$SERVE_LOG" ]]; then
    cat "$SERVE_LOG"
  fi
  exit 1
fi

STATUS="$(curl -sS -o /tmp/stripe-webhook-smoke.json -w "%{http_code}" \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: ${SIG_HEADER}" \
  --data "$PAYLOAD")"

if [[ "$STATUS" != "200" ]]; then
  echo "FAIL: signed webhook returned HTTP $STATUS" >&2
  echo "Response body:"
  cat /tmp/stripe-webhook-smoke.json
  exit 1
fi

if ! grep -q '"received"[[:space:]]*:[[:space:]]*true' /tmp/stripe-webhook-smoke.json; then
  echo "FAIL: webhook response missing received=true" >&2
  cat /tmp/stripe-webhook-smoke.json
  exit 1
fi

echo "PASS: signed Stripe webhook smoke ($WEBHOOK_URL)"
