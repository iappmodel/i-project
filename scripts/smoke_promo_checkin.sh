#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"
echo "== Promo check-in smoke =="
[[ -f "$APP/supabase/functions/verify-checkin/index.ts" ]] || { echo "FAIL: verify-checkin edge missing" >&2; exit 1; }
[[ -f "$APP/src/services/checkin.service.ts" ]] || { echo "FAIL: checkin.service missing" >&2; exit 1; }
[[ -f "$APP/src/hooks/useCheckInStatus.ts" ]] || { echo "FAIL: useCheckInStatus missing" >&2; exit 1; }
[[ -f "$APP/src/components/immersive/QuickCheckInSheet.tsx" ]] || { echo "FAIL: QuickCheckInSheet missing" >&2; exit 1; }
grep -q "QuickCheckInSheet" "$APP/src/screens/ImmersivePromoScreen.tsx" || { echo "FAIL: promo screen check-in not wired" >&2; exit 1; }
cd "$APP" && npm run typecheck --silent
echo "PASS: promo check-in smoke"
