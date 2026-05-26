#!/usr/bin/env bash
# Verify Capacitor packages, config, and web build (no native SDK required).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"

echo "== Capacitor prep smoke =="

[[ -f "$APP/capacitor.config.ts" ]] || { echo "FAIL: capacitor.config.ts missing" >&2; exit 1; }

grep -q '"@capacitor/core"' "$APP/package.json" || {
  echo "FAIL: @capacitor/core not in package.json" >&2
  exit 1
}

cd "$APP"
npm run typecheck --silent
npm run build --silent

echo "PASS: Capacitor prep smoke"
