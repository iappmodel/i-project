#!/usr/bin/env bash
# Enable Stripe live mode in app/.env.local when owner keys exist in .env.local.stack.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STACK="$ROOT/.env.local.stack"
ENV_LOCAL="$ROOT/app/.env.local"

if [[ ! -f "$STACK" ]]; then
  echo "SKIP: no .env.local.stack — run ./scripts/start_local_stack.sh first"
  exit 0
fi

# shellcheck disable=SC1090
source "$STACK"

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "SKIP: STRIPE_SECRET_KEY not in .env.local.stack"
  echo "Add test keys to .env.local.stack (see .env.local.stack.example)"
  exit 0
fi

API_URL="${API_URL:-http://127.0.0.1:54321}"
CHECKOUT_URL="${API_URL}/functions/v1/create-checkout"

touch "$ENV_LOCAL"
grep -q '^VITE_STRIPE_CHECKOUT_URL=' "$ENV_LOCAL" 2>/dev/null || \
  echo "VITE_STRIPE_CHECKOUT_URL=$CHECKOUT_URL" >>"$ENV_LOCAL"
grep -q '^VITE_STRIPE_FUNCTIONS_READY=' "$ENV_LOCAL" 2>/dev/null || \
  echo "VITE_STRIPE_FUNCTIONS_READY=true" >>"$ENV_LOCAL"

echo "Stripe live env enabled for app"
echo "  VITE_STRIPE_CHECKOUT_URL=$CHECKOUT_URL"
echo "Next: ./scripts/deploy_stripe_functions_local.sh"
