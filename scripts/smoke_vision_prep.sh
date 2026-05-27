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
[[ -f "$APP/src/lib/visionCalibration/profile.ts" ]] || {
  echo "FAIL: visionCalibration/profile.ts missing" >&2
  exit 1
}
[[ -f "$APP/src/lib/logger.ts" ]] || {
  echo "FAIL: logger.ts missing for vision adapter imports" >&2
  exit 1
}
[[ -f "$APP/src/lib/skinToneFallback.ts" ]] || {
  echo "FAIL: skinToneFallback.ts missing for vision adapter imports" >&2
  exit 1
}
[[ -f "$APP/src/vision-unified/hooks/useVisionEngine.ts" ]] || {
  echo "FAIL: useVisionEngine.ts missing from vision-unified slice" >&2
  exit 1
}
[[ -f "$APP/src/vision-unified/workers/visionSample.worker.ts" ]] || {
  echo "FAIL: visionSample.worker.ts missing for active vision slice" >&2
  exit 1
}

if ! grep -q "VITE_VISION_ENGINE" "$APP/src/lib/visionEngine.ts"; then
  echo "FAIL: vision feature flag not wired" >&2
  exit 1
fi
if ! grep -q "useWebVisionEngine" "$APP/src/screens/EarnScreen.tsx"; then
  echo "FAIL: Earn screen is not wired to the vision slice" >&2
  exit 1
fi
[[ -f "$APP/src/hooks/useEyeTracking.ts" ]] || {
  echo "FAIL: useEyeTracking bridge missing" >&2
  exit 1
}
[[ -f "$APP/src/lib/attentionScoring.ts" ]] || {
  echo "FAIL: attentionScoring bridge missing" >&2
  exit 1
}
if ! grep -q "useWebEyeTracking" "$APP/src/screens/WatchVerifyScreen.tsx"; then
  echo "FAIL: Watch screen is not wired to eye-tracking slice" >&2
  exit 1
fi
[[ -f "$APP/src/lib/visionGestureBridge.ts" ]] || {
  echo "FAIL: visionGestureBridge.ts missing" >&2
  exit 1
}
if ! grep -q "useWebGestureDispatch" "$APP/src/screens/WatchVerifyScreen.tsx"; then
  echo "FAIL: Watch screen is not wired to gesture dispatch slice" >&2
  exit 1
fi
[[ -f "$APP/src/hooks/useScreenTargets.ts" ]] || {
  echo "FAIL: useScreenTargets bridge missing" >&2
  exit 1
}
[[ -f "$APP/src/lib/visionScreenTargets.ts" ]] || {
  echo "FAIL: visionScreenTargets.ts missing" >&2
  exit 1
}
if ! grep -q "VisionTargetOverlay" "$APP/src/App.tsx"; then
  echo "FAIL: App must mount VisionTargetOverlay for gaze-dwell target UI" >&2
  exit 1
fi
[[ -f "$APP/src/styles/vision-target-overlay.css" ]] || {
  echo "FAIL: vision-target-overlay.css missing" >&2
  exit 1
}

if ! grep -q "vision-unified/\\*\\*" "$APP/tsconfig.app.json"; then
  echo "FAIL: tsconfig.app.json must exclude src/vision-unified/** until wired" >&2
  exit 1
fi

cd "$APP"
npm run typecheck --silent
npm run build --silent

echo "PASS: vision prep smoke"
