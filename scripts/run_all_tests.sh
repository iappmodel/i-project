#!/usr/bin/env bash
# Run all automated tests for the migration archive spine.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin"
export PATH="$DOCKER_BIN:$PATH"

echo "== POP validator tests =="
cd "$ROOT/integrations/pop-core/validator"
npm test

echo ""
echo "== Organism spine smoke =="
"$ROOT/scripts/smoke_organism_spine.sh"

echo ""
echo "== POP finish regression smoke =="
"$ROOT/scripts/smoke_pop_finish.sh"

echo ""
echo "== Capacitor prep smoke =="
"$ROOT/scripts/smoke_capacitor_prep.sh"

echo ""
echo "== Flutter seal prep (optional) =="
"$ROOT/scripts/smoke_flutter_seal_prep.sh"

echo ""
echo "== App typecheck + build =="
cd "$ROOT/app"
npm run typecheck
npm run build

echo ""
echo "== Auth demo smoke (optional Docker) =="
if docker info >/dev/null 2>&1; then
  "$ROOT/scripts/smoke_auth_demo.sh"
else
  echo "SKIP: Docker not running"
fi

echo ""
echo "== Stripe env smoke (optional keys) =="
"$ROOT/scripts/smoke_stripe_env.sh"

echo ""
echo "== Stripe webhook smoke (optional keys) =="
"$ROOT/scripts/smoke_stripe_webhook.sh"

echo ""
echo "== Flutter runtime tests =="
if command -v flutter >/dev/null 2>&1; then
  cd "$ROOT/integrations/eye-tracking/flutter-runtime"
  flutter test
else
  echo "SKIP: flutter not in PATH"
fi

echo ""
echo "== Android env smoke (optional) =="
"$ROOT/scripts/smoke_android_env.sh"

echo ""
echo "== Production deploy templates =="
[[ -f "$ROOT/docs/technical/PRODUCTION_DEPLOY_RUNBOOK.md" ]] || {
  echo "FAIL: PRODUCTION_DEPLOY_RUNBOOK.md missing" >&2
  exit 1
}
echo "deploy runbook: OK"
echo "Pre-deploy full check: ./scripts/smoke_production_readiness.sh"

echo ""
echo "== Vision prep smoke =="
"$ROOT/scripts/smoke_vision_prep.sh"

echo ""
echo "== Vision proof bridge smoke =="
"$ROOT/scripts/smoke_vision_proof_bridge.sh"

echo ""
echo "== Immersive shell smoke (Phases 35–38) =="
"$ROOT/scripts/smoke_immersive_shell.sh"

echo ""
echo "== Immersive promo smoke (Phase 41) =="
"$ROOT/scripts/smoke_immersive_promo.sh"

echo ""
echo "== Investor explainer smoke =="
"$ROOT/scripts/smoke_investor_explainers.sh"

echo ""
echo "== Open investor presenter smoke =="
"$ROOT/scripts/smoke_open_investor_presenter.sh"

echo ""
echo "== ELO presence smoke =="
"$ROOT/scripts/smoke_elo_presence.sh"

echo ""
echo "== Production artifacts build =="
"$ROOT/scripts/build_production_artifacts.sh"

echo ""
echo "PASS: run_all_tests"
