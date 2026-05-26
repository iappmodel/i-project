#!/usr/bin/env bash
# Check Stripe secrets present for live checkout (no API calls).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STACK="$ROOT/.env.local.stack"

echo "== Stripe env smoke =="

if [[ ! -f "$STACK" ]]; then
  echo "SKIP: .env.local.stack missing"
  exit 0
fi

# shellcheck disable=SC1090
source "$STACK"

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "SKIP: STRIPE_SECRET_KEY not set (demo mode OK)"
  exit 0
fi

if [[ -z "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  echo "WARN: STRIPE_WEBHOOK_SECRET missing — webhook tests will skip"
fi

if [[ ! -f "$ROOT/app/supabase/functions/stripe-webhook/index.ts" ]]; then
  echo "FAIL: promote stripe functions first" >&2
  exit 1
fi

echo "PASS: Stripe secrets present; run ./scripts/enable_stripe_live_env.sh"
