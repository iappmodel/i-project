#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"
echo "== Merchant pay smoke =="
[[ -f "$APP/src/features/merchantCheckout/types.ts" ]] || { echo "FAIL: merchantCheckout types missing" >&2; exit 1; }
[[ -f "$APP/src/features/merchantCheckout/mockResolver.ts" ]] || { echo "FAIL: mockResolver missing" >&2; exit 1; }
[[ -f "$APP/src/components/immersive/ImmersivePaySheet.tsx" ]] || { echo "FAIL: ImmersivePaySheet missing" >&2; exit 1; }
for fn in merchant-checkout-resolve merchant-checkout-draft merchant-checkout-confirm; do
  [[ -f "$APP/supabase/functions/$fn/index.ts" ]] || { echo "FAIL: $fn missing" >&2; exit 1; }
done
grep -q "onPay" "$APP/src/components/immersive/ImmersiveWalletSheet.tsx" || { echo "FAIL: wallet Pay CTA missing" >&2; exit 1; }
grep -q "ImmersivePaySheet" "$APP/src/screens/ImmersiveFeedScreen.tsx" || { echo "FAIL: pay sheet not on feed" >&2; exit 1; }
cd "$APP" && npm run typecheck --silent
echo "PASS: merchant pay smoke"
