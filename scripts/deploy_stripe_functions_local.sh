#!/usr/bin/env bash
# Deploy Stripe edge functions to local Supabase (requires owner keys).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin"
export PATH="$DOCKER_BIN:$PATH"

if [[ -z "${STRIPE_SECRET_KEY:-}" && -f "$ROOT/.env.local.stack" ]]; then
  # shellcheck disable=SC1090
  source "$ROOT/.env.local.stack"
fi

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "SKIP: STRIPE_SECRET_KEY not set."
  echo "Promote functions: ./scripts/promote_stripe_functions.sh"
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "SKIP: Docker not running." >&2
  exit 0
fi

if [[ ! -f "$ROOT/app/supabase/functions/stripe-webhook/index.ts" ]]; then
  echo "Run ./scripts/promote_stripe_functions.sh first" >&2
  exit 1
fi

echo "Deploying Stripe functions to local Supabase..."
cd "$ROOT/app"
supabase functions serve stripe-webhook create-checkout customer-portal request-payout \
  --env-file "$ROOT/.env.local.stack" 2>/dev/null || {
  echo "Note: supabase functions serve requires secrets in .env.local.stack"
  echo "Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET, then retry."
  exit 0
}
