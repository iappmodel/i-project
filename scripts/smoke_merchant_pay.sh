#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"
echo "== Merchant pay smoke (depth M9+M10) =="
[[ -f "$APP/src/features/merchantCheckout/types.ts" ]] || { echo "FAIL: merchantCheckout types missing" >&2; exit 1; }
[[ -f "$APP/src/features/merchantCheckout/mockResolver.ts" ]] || { echo "FAIL: mockResolver missing" >&2; exit 1; }
[[ -f "$APP/src/features/merchantCheckout/MerchantCheckoutSheet.tsx" ]] || { echo "FAIL: MerchantCheckoutSheet missing" >&2; exit 1; }
[[ -f "$APP/src/services/merchantCheckout.service.ts" ]] || { echo "FAIL: merchantCheckout.service missing" >&2; exit 1; }
[[ -f "$APP/src/hooks/useMerchantCheckoutPreferences.ts" ]] || { echo "FAIL: useMerchantCheckoutPreferences missing" >&2; exit 1; }
[[ -f "$APP/src/components/immersive/ImmersivePaySheet.tsx" ]] || { echo "FAIL: ImmersivePaySheet missing" >&2; exit 1; }
for fn in merchant-checkout-resolve merchant-checkout-draft merchant-checkout-confirm merchant-checkout-tip merchant-checkout-event merchant-checkout-preferences merchant-checkout-payment-status merchant-checkout-funnel; do
  [[ -f "$APP/supabase/functions/$fn/index.ts" ]] || { echo "FAIL: $fn missing" >&2; exit 1; }
done
grep -q "merchantCheckoutService" "$APP/src/services/merchantCheckout.service.ts" || { echo "FAIL: service class missing" >&2; exit 1; }
grep -q "resolve\|patchDraft\|confirm\|submitPostPayTip" "$APP/src/services/merchantCheckout.service.ts" || { echo "FAIL: full checkout flow methods missing" >&2; exit 1; }
grep -q "MerchantCheckoutSheet" "$APP/src/components/immersive/ImmersivePaySheet.tsx" || { echo "FAIL: pay sheet not wired to full checkout" >&2; exit 1; }
grep -q "ENTER_AMOUNT\|AUTHENTICATE\|POST_PAY_TIP" "$APP/src/features/merchantCheckout/MerchantCheckoutSheet.tsx" || { echo "FAIL: checkout funnel screens missing" >&2; exit 1; }
grep -q "onPay" "$APP/src/components/immersive/ImmersiveWalletSheet.tsx" || { echo "FAIL: wallet Pay CTA missing" >&2; exit 1; }
grep -q "ImmersivePaySheet" "$APP/src/screens/ImmersiveFeedScreen.tsx" || { echo "FAIL: pay sheet not on feed" >&2; exit 1; }
wc -l "$APP/src/features/merchantCheckout/MerchantCheckoutSheet.tsx" | awk '{ if ($1 < 1500) { print "FAIL: MerchantCheckoutSheet too thin (" $1 " lines)" > "/dev/stderr"; exit 1 } }'
cd "$APP" && npm run typecheck --silent
echo "PASS: merchant pay depth smoke"
