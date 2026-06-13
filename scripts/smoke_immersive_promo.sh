#!/usr/bin/env bash
# Smoke: immersive promo marketplace tab (Phase 41).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"

echo "== Immersive promo smoke =="

[[ -f "$APP/src/screens/ImmersivePromoScreen.tsx" ]] || {
  echo "FAIL: ImmersivePromoScreen missing" >&2
  exit 1
}
[[ -f "$APP/src/data/promoOffers.ts" ]] || {
  echo "FAIL: promoOffers.ts missing" >&2
  exit 1
}
[[ -f "$ROOT/MASTER_BRAIN/UX/PROMO_MARKETPLACE.md" ]] || {
  echo "FAIL: PROMO_MARKETPLACE.md missing" >&2
  exit 1
}

if ! grep -q "immersive-promo" "$APP/src/App.tsx"; then
  echo "FAIL: App must route immersive-promo" >&2
  exit 1
fi
if ! grep -q "immersive-promo" "$APP/src/components/AppShell.tsx"; then
  echo "FAIL: AppShell must hide titlebar on immersive-promo" >&2
  exit 1
fi
if ! grep -q "immersive-promo" "$APP/src/screens/ImmersiveFeedScreen.tsx"; then
  echo "FAIL: Feed promo tab must navigate to immersive-promo" >&2
  exit 1
fi
if ! grep -q "beginImmersiveWatch" "$APP/src/screens/ImmersivePromoScreen.tsx"; then
  echo "FAIL: Promo cards must start watch flow" >&2
  exit 1
fi
if ! grep -q "immersive-promo" "$APP/src/styles/gesture-buttons.css"; then
  echo "FAIL: promo CSS missing" >&2
  exit 1
fi
[[ -f "$APP/src/components/immersive/ImmersivePromoReviewSheet.tsx" ]] || { echo "FAIL: promo review sheet missing" >&2; exit 1; }
[[ -f "$APP/src/components/immersive/ImmersivePromoMapSheet.tsx" ]] || { echo "FAIL: promo map sheet missing" >&2; exit 1; }
grep -q "ImmersivePromoMapSheetBody" "$APP/src/screens/ImmersivePromoScreen.tsx" || { echo "FAIL: map sheet not wired" >&2; exit 1; }

cd "$APP"
npm run typecheck --silent

echo "PASS: immersive promo smoke"
