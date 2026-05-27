#!/usr/bin/env bash
# Verify Capacitor native prep when android/ios platforms are generated.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"

echo "== Capacitor native prep smoke =="

if [[ ! -d "$APP/android" && ! -d "$APP/ios" ]]; then
  echo "SKIP: no native platforms generated yet (run ./scripts/setup_capacitor_shell.sh --add)"
  exit 0
fi

cd "$APP"
npm run build --silent
npx cap sync

if [[ -d android ]]; then
  [[ -f android/app/src/main/AndroidManifest.xml ]] || {
    echo "FAIL: Android manifest missing after cap sync" >&2
    exit 1
  }
fi

if [[ -d ios ]]; then
  [[ -f ios/App/App/Info.plist ]] || {
    echo "FAIL: iOS Info.plist missing after cap sync" >&2
    exit 1
  }
fi

echo "PASS: Capacitor native prep smoke"
