#!/usr/bin/env bash
# Smoke: dependency-safe Blink Remote panel (Phase 42) — combos + matcher.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"

echo "== Blink remote lite smoke =="

[[ -f "$APP/src/lib/gestureComboStore.ts" ]] || {
  echo "FAIL: gestureComboStore.ts missing" >&2
  exit 1
}
[[ -f "$APP/src/hooks/useGestureComboMatcher.ts" ]] || {
  echo "FAIL: useGestureComboMatcher.ts missing" >&2
  exit 1
}
[[ -f "$APP/src/components/GestureComboMatcherHost.tsx" ]] || {
  echo "FAIL: GestureComboMatcherHost.tsx missing" >&2
  exit 1
}

if ! grep -q "GestureComboMatcherHost" "$APP/src/App.tsx"; then
  echo "FAIL: App must mount GestureComboMatcherHost" >&2
  exit 1
fi
if ! grep -q "vision-blink-remote" "$APP/src/components/VisionBlinkRemoteLite.tsx"; then
  echo "FAIL: VisionBlinkRemoteLite must expose tabbed panel" >&2
  exit 1
fi
if ! grep -q "loadGestureCombos" "$APP/src/components/VisionBlinkRemoteLite.tsx"; then
  echo "FAIL: Blink remote panel must list gesture combos" >&2
  exit 1
fi
if ! grep -q "immersive-promo" "$APP/src/lib/visionScreenTargets.ts"; then
  echo "FAIL: promoFeed command must route to immersive-promo" >&2
  exit 1
fi
if ! grep -q "GestureComboBuilderSheet" "$APP/src/components/VisionBlinkRemoteLite.tsx"; then
  echo "FAIL: Blink remote panel must open combo builder" >&2
  exit 1
fi
if ! grep -q "vision-blink-remote" "$APP/src/styles/gesture-buttons.css"; then
  echo "FAIL: blink remote CSS missing" >&2
  exit 1
fi
[[ -f "$APP/src/components/GestureComboBuilderSheet.tsx" ]] || {
  echo "FAIL: GestureComboBuilderSheet.tsx missing" >&2
  exit 1
}
[[ -f "$APP/src/components/UnifiedVisionCalibrationWizard.tsx" ]] || {
  echo "FAIL: UnifiedVisionCalibrationWizard.tsx missing" >&2
  exit 1
}
if ! grep -q "UnifiedVisionCalibrationWizard" "$APP/src/components/VisionCalibrationHost.tsx"; then
  echo "FAIL: VisionCalibrationHost must mount UnifiedVisionCalibrationWizard" >&2
  exit 1
fi
if ! grep -q "isWebVisionEnabled" "$APP/src/components/VisionCalibrationHost.tsx"; then
  echo "FAIL: calibration host must gate on VITE_VISION_ENGINE" >&2
  exit 1
fi
if ! grep -q "VITE_VISION_ENGINE" "$APP/src/lib/visionEngine.ts"; then
  echo "FAIL: visionEngine must read VITE_VISION_ENGINE flag" >&2
  exit 1
fi

cd "$APP"
npm run typecheck --silent

echo "PASS: blink remote lite smoke"
