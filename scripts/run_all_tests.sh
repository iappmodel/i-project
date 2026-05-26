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
echo "== App typecheck + build =="
cd "$ROOT/app"
npm run typecheck
npm run build

echo ""
echo "== Flutter runtime tests =="
if command -v flutter >/dev/null 2>&1; then
  cd "$ROOT/integrations/eye-tracking/flutter-runtime"
  flutter test
else
  echo "SKIP: flutter not in PATH"
fi

echo ""
echo "PASS: run_all_tests"
