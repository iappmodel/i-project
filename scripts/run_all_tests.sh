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
echo "== Proof events SSE smoke =="
"$ROOT/scripts/smoke_proof_events.sh"

echo ""
echo "== Local-json wallet smoke =="
"$ROOT/scripts/smoke_pop_wallet_loop.sh"

echo ""
echo "== Full loop smoke =="
"$ROOT/scripts/smoke_full_loop.sh"

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
echo "PASS: run_all_tests"
