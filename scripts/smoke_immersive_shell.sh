#!/usr/bin/env bash
# Smoke: immersive wallet/profile sheets, out-profile engine, loop1 watch path (Phases 35–38).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"

echo "== Immersive shell smoke =="

for f in \
  ImmersiveGlassSheet.tsx \
  ImmersiveWalletSheet.tsx \
  ImmersiveProfileSheet.tsx; do
  [[ -f "$APP/src/components/immersive/$f" ]] || {
    echo "FAIL: missing immersive/$f" >&2
    exit 1
  }
done

[[ -f "$APP/src/lib/outProfileEngine.ts" ]] || {
  echo "FAIL: outProfileEngine.ts missing" >&2
  exit 1
}
[[ -f "$ROOT/MASTER_BRAIN/UX/OUT_PROFILE_ENGINE.md" ]] || {
  echo "FAIL: OUT_PROFILE_ENGINE.md missing" >&2
  exit 1
}
[[ -f "$APP/src/components/VisionBlinkRemoteLite.tsx" ]] || {
  echo "FAIL: VisionBlinkRemoteLite.tsx missing" >&2
  exit 1
}

if ! grep -q "beginImmersiveWatch" "$APP/src/screens/ImmersiveFeedScreen.tsx"; then
  echo "FAIL: ImmersiveFeed must use beginImmersiveWatch" >&2
  exit 1
fi
if ! grep -q "consent-camera-gate" "$APP/src/state/demoContext.tsx"; then
  echo "FAIL: beginImmersiveWatch must route to consent gate" >&2
  exit 1
fi
if ! grep -q "ImmersiveWalletSheet" "$APP/src/screens/ImmersiveFeedScreen.tsx"; then
  echo "FAIL: wallet sheet not wired on immersive feed" >&2
  exit 1
fi
if ! grep -q "onPress" "$APP/src/components/immersive/OutProfileChip.tsx"; then
  echo "FAIL: OutProfileChip must support tap" >&2
  exit 1
fi
if ! grep -q "VisionBlinkRemoteLite" "$APP/src/components/VisionControlPanel.tsx"; then
  echo "FAIL: VisionControlPanel must include Blink Remote lite" >&2
  exit 1
fi
if ! grep -q "immersive-glass-sheet" "$APP/src/styles/gesture-buttons.css"; then
  echo "FAIL: glass sheet CSS missing" >&2
  exit 1
fi

cd "$APP"
npm run typecheck --silent

echo "PASS: immersive shell smoke"
