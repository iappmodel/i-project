#!/usr/bin/env bash
# Smoke check for web-vision promotion scaffolding (flag default off).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"

echo "== Vision prep smoke =="

[[ -f "$APP/src/lib/visionEngine.ts" ]] || {
  echo "FAIL: visionEngine.ts missing" >&2
  exit 1
}

if ! grep -q "VITE_VISION_ENGINE" "$APP/src/lib/visionEngine.ts"; then
  echo "FAIL: vision feature flag not wired" >&2
  exit 1
fi

if ! grep -q "vision-unified/\\*\\*" "$APP/tsconfig.app.json"; then
  echo "FAIL: tsconfig.app.json must exclude src/vision-unified/** until wired" >&2
  exit 1
fi

cd "$APP"
npm run typecheck --silent
npm run build --silent

echo "PASS: vision prep smoke"
