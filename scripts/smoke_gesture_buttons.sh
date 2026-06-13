#!/usr/bin/env bash
# Smoke check for immersive gesture button system (Picture 2).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"

echo "== Gesture buttons smoke =="

required=(
  "$APP/src/hooks/useGestureButton.ts"
  "$APP/src/hooks/useOfferSession.ts"
  "$APP/src/hooks/useContentLike.ts"
  "$APP/src/lib/gestureButtons/offerService.ts"
  "$APP/src/lib/gestureButtons/layoutStore.ts"
  "$APP/src/services/tipCreator.ts"
  "$APP/src/components/gestureButtons/OfferReviewSheet.tsx"
  "$APP/src/components/gestureButtons/GestureButtonBuilderSheet.tsx"
  "$APP/src/screens/ImmersiveFeedScreen.tsx"
  "$APP/supabase/functions/tip-creator/index.ts"
)

for f in "${required[@]}"; do
  [[ -f "$f" ]] || {
    echo "FAIL: missing $f" >&2
    exit 1
  }
done

if ! grep -q "onOfferReview" "$APP/src/screens/ImmersiveFeedScreen.tsx"; then
  echo "FAIL: ImmersiveFeedScreen not wired to offer session" >&2
  exit 1
fi

if ! grep -qE "useContentLike|useFeedInteraction" "$APP/src/screens/ImmersiveFeedScreen.tsx"; then
  echo "FAIL: like persistence hook not wired" >&2
  exit 1
fi

if grep -q "window.prompt" "$APP/src/screens/ImmersiveFeedScreen.tsx"; then
  echo "FAIL: window.prompt still used on immersive feed" >&2
  exit 1
fi

if ! grep -q "builderHoldMs" "$APP/src/lib/gestureButtons/presets.ts"; then
  echo "FAIL: builder vs runtime hold not separated" >&2
  exit 1
fi

echo "OK: gesture button scaffolding present"
echo ""
echo "Manual checklist (immersive-feed):"
echo "  1. Tap heart → like toggles; count updates"
echo "  2. Hold 500ms → cross; swipe up/down → +amount; release → REWARD review sheet"
echo "  3. Send → validating pill → settled toast (demo) or tip-creator (live)"
echo "  4. Long-press CONTROLS 1s → builder sheet; per-gesture bindings persist"
echo "  5. Rail does not scroll feed while dragging on buttons"
