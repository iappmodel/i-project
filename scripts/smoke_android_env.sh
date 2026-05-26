#!/usr/bin/env bash
# Check Android dev toolchain for Seal Proof + Capacitor (skip if missing).
set -euo pipefail

echo "== Android env check =="

missing=0

if command -v flutter >/dev/null 2>&1; then
  echo "flutter: $(flutter --version 2>/dev/null | head -1)"
else
  echo "flutter: MISSING"
  missing=1
fi

ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
if [[ -x "$ADB" ]] || command -v adb >/dev/null 2>&1; then
  echo "adb: ok"
  if command -v adb >/dev/null 2>&1; then
    adb devices 2>/dev/null | tail -n +2 | grep -v '^$' || echo "  (no devices attached)"
  fi
else
  echo "adb: MISSING (install Android SDK platform-tools)"
  missing=1
fi

if [[ -n "${ANDROID_HOME:-}" ]]; then
  echo "ANDROID_HOME: $ANDROID_HOME"
elif [[ -d "$HOME/Library/Android/sdk" ]]; then
  echo "ANDROID_HOME: (default) $HOME/Library/Android/sdk"
else
  echo "ANDROID_HOME: not set"
  missing=1
fi

if curl -sf http://127.0.0.1:8787/health >/dev/null 2>&1; then
  echo "validator: UP :8787"
else
  echo "validator: DOWN — ./scripts/dev_stack.sh"
fi

if [[ "$missing" -ne 0 ]]; then
  echo ""
  echo "SKIP: Android toolchain incomplete (install Flutter + Android SDK for device loop)"
  exit 0
fi

echo ""
echo "PASS: Android env ready for device/emulator loop"
echo "Next: ./scripts/run_android_dev_loop.sh"
