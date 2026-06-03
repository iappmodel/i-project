#!/usr/bin/env bash
# Phase B1 — 90-second magic moment static gates (+ optional validator health).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"

echo "== Investor B1 smoke =="

FEED="$APP/src/services/feed.service.ts"
grep -q "contentId: 'nike-pegasus-41'" "$FEED" || grep -q 'contentId: "nike-pegasus-41"' "$FEED" || {
  echo "FAIL: demo feed hero must use nike-pegasus-41 for live settlement" >&2
  exit 1
}

REWARD="$APP/src/screens/RewardRevealScreen.tsx"
grep -q 'pending validation' "$REWARD" || {
  echo "FAIL: RewardReveal must have live pending-first copy" >&2
  exit 1
}

grep -q 'investorPreview' "$APP/src/state/types.ts" || {
  echo "FAIL: DemoState must include investorPreview" >&2
  exit 1
}
grep -q 'startInvestorB1Tour' "$APP/src/state/demoContext.tsx" || {
  echo "FAIL: demoContext must export startInvestorB1Tour" >&2
  exit 1
}
grep -q 'investor-preview-banner' "$APP/src/components/AppShell.tsx" || {
  echo "FAIL: AppShell must render investor preview banner" >&2
  exit 1
}

SESSION="$APP/src/state/attentionSession.ts"
grep -q "status === 'validated'" "$SESSION" || {
  echo "FAIL: attentionSession must gate rewards on validated" >&2
  exit 1
}

TERMS="$ROOT/integrations/pop-core/backend/settlement/offer-settlement-terms.ts"
grep -q 'demo-1-watch' "$TERMS" || {
  echo "FAIL: offer-settlement-terms must register demo-1-watch" >&2
  exit 1
}

if curl -sf http://127.0.0.1:8787/health >/dev/null 2>&1; then
  echo "OK validator health (live B1 rehearsal available)"
else
  echo "SKIP validator not running — static B1 gates only"
fi

echo "PASS: investor B1 smoke"
