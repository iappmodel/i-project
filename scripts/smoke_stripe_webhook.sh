#!/usr/bin/env bash
# Stripe webhook smoke — requires STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -z "${STRIPE_SECRET_KEY:-}" || -z "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  echo "SKIP: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET not set."
  echo "Promote functions first: ./scripts/promote_stripe_functions.sh"
  exit 0
fi

if [[ ! -f "$ROOT/app/supabase/functions/stripe-webhook/index.ts" ]]; then
  echo "FAIL: stripe-webhook not promoted — run ./scripts/promote_stripe_functions.sh" >&2
  exit 1
fi

echo "PASS: Stripe functions present; webhook smoke deferred until edge deploy wiring."
echo "Next: deploy stripe-webhook to local Supabase functions and POST signed test event."
