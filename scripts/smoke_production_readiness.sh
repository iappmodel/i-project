#!/usr/bin/env bash
# Pre-deploy checks: builds, env templates, optional Stripe/Capacitor prep.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin"
export PATH="$DOCKER_BIN:$PATH"

echo "== Production readiness smoke =="

required=(
  ".env.local.stack.example"
  "app/.env.example"
  "docs/technical/PRODUCTION_DEPLOY_RUNBOOK.md"
  "scripts/smoke_organism_spine.sh"
  "scripts/deploy_stripe_functions_local.sh"
  "scripts/enable_stripe_live_env.sh"
)

for f in "${required[@]}"; do
  [[ -f "$ROOT/$f" ]] || { echo "FAIL: missing $f" >&2; exit 1; }
done

echo "env templates: OK"

echo ""
echo "== POP validator tests =="
cd "$ROOT/integrations/pop-core/validator"
npm test

echo ""
echo "== App typecheck + build =="
cd "$ROOT/app"
npm run typecheck --silent
npm run build --silent

echo ""
echo "== Capacitor prep =="
"$ROOT/scripts/smoke_capacitor_prep.sh"

echo ""
echo "== Stripe env (optional keys) =="
"$ROOT/scripts/smoke_stripe_env.sh"

echo ""
echo "== Organism spine (local-json) =="
"$ROOT/scripts/smoke_full_loop.sh"

if docker info >/dev/null 2>&1; then
  echo ""
  echo "== Supabase ledger smoke =="
  "$ROOT/scripts/smoke_pop_wallet_loop_supabase.sh"
else
  echo ""
  echo "SKIP: Supabase smoke (Docker not running)"
fi

echo ""
echo "PASS: production readiness smoke"
echo "Next: docs/technical/PRODUCTION_DEPLOY_RUNBOOK.md"
