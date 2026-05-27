#!/usr/bin/env bash
# Stripe webhook smoke — requires STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# shellcheck disable=SC1090
if [[ -f "$ROOT/.env.local.stack" ]]; then
  source "$ROOT/.env.local.stack"
fi

if [[ -z "${STRIPE_SECRET_KEY:-}" || -z "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  echo "SKIP: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET not set."
  echo "Promote functions first: ./scripts/promote_stripe_functions.sh"
  exit 0
fi

if [[ ! -f "$ROOT/app/supabase/functions/stripe-webhook/index.ts" ]]; then
  echo "FAIL: stripe-webhook not promoted — run ./scripts/promote_stripe_functions.sh" >&2
  exit 1
fi

"$ROOT/scripts/smoke_stripe_webhook_signed.sh"
