#!/usr/bin/env bash
# smoke_elo_presence.sh — verify ELO presence module files and app typecheck
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"

echo "== ELO presence smoke =="

required=(
  "$APP/src/components/elo/EloPresenceLayer.tsx"
  "$APP/src/components/elo/EloFaceMembrane.tsx"
  "$APP/src/components/elo/EloEvokePrompt.tsx"
  "$APP/src/components/elo/EloSessionGreeting.tsx"
  "$APP/src/hooks/useEloWakeWord.ts"
  "$APP/src/hooks/useEloFaceMirror.ts"
  "$APP/src/lib/elo/types.ts"
  "$APP/src/lib/elo/expressionEngine.ts"
  "$APP/src/lib/elo/sessionOpenings.ts"
  "$APP/src/lib/elo/eloReplyService.ts"
  "$APP/src/lib/elo/eloRuntimeEngine.ts"
  "$APP/src/lib/elo/eloDoctrine.ts"
  "$APP/src/lib/elo/visualForms.ts"
  "$APP/src/components/elo/EloSessionScope.tsx"
  "$APP/src/state/eloContext.tsx"
  "$APP/src/styles/elo-presence.css"
  "$ROOT/MASTER_BRAIN/CHAT_RECOVERY/EXTRACTED/conversations/143_elo_personal_intelligence_companion.md"
  "$ROOT/MASTER_BRAIN/UX/ELO_PRESENCE_LAYER.md"
)

if ! grep -q "elo-membrane__svg" "$APP/src/components/elo/EloFaceMembrane.tsx"; then
  echo "FAIL: EloFaceMembrane must render procedural SVG membrane" >&2
  exit 1
fi
if ! grep -q "paths" "$APP/src/components/elo/EloPresenceLayer.tsx"; then
  echo "FAIL: EloPresenceLayer must wire face contour paths" >&2
  exit 1
fi

if ! grep -q "EloPresenceLayer" "$APP/src/screens/ImmersiveFeedScreen.tsx"; then
  echo "FAIL: ImmersiveFeedScreen must mount EloPresenceLayer" >&2
  exit 1
fi
if ! grep -q "EloEvokePrompt" "$APP/src/components/elo/EloPresenceLayer.tsx"; then
  echo "FAIL: EloPresenceLayer must mount EloEvokePrompt" >&2
  exit 1
fi
if ! grep -q "armVoice" "$APP/src/hooks/useEloWakeWord.ts"; then
  echo "FAIL: useEloWakeWord must support opt-in armed voice" >&2
  exit 1
fi
if ! grep -q "useEloFaceMirror" "$APP/src/components/elo/EloPresenceLayer.tsx"; then
  echo "FAIL: EloPresenceLayer must mirror POP face landmarks via useEloFaceMirror" >&2
  exit 1
fi
if ! grep -q "openPanel()" "$APP/src/components/elo/EloPresenceLayer.tsx"; then
  echo "FAIL: EloPresenceLayer must auto-open panel after evoke session" >&2
  exit 1
fi
if ! grep -q "getSessionGreetingShort" "$APP/src/components/elo/EloSessionGreeting.tsx"; then
  echo "FAIL: EloSessionGreeting must use sessionOpenings copy" >&2
  exit 1
fi
if ! grep -q "dismissSession" "$APP/src/state/eloContext.tsx"; then
  echo "FAIL: eloContext must expose dismissSession for session scope" >&2
  exit 1
fi
if ! grep -q "resolveEloReplyAsync" "$APP/src/components/elo/EloPresencePanel.tsx"; then
  echo "FAIL: EloPresencePanel must use async eloRuntimeEngine" >&2
  exit 1
fi
if ! grep -q "fetchFoundationReply" "$APP/src/services/eloReply.ts"; then
  echo "FAIL: eloReply service must invoke elo-reply edge function" >&2
  exit 1
fi
if ! grep -q "useEloPanelVoice" "$APP/src/components/elo/EloPresencePanel.tsx"; then
  echo "FAIL: EloPresencePanel must support panel voice input" >&2
  exit 1
fi
if [[ ! -f "$APP/supabase/functions/elo-reply/index.ts" ]]; then
  echo "FAIL: elo-reply edge function missing" >&2
  exit 1
fi
if ! grep -q "evaluateDoctrineInput" "$APP/src/lib/elo/eloDoctrine.ts"; then
  echo "FAIL: eloDoctrine must enforce POP safety rails" >&2
  exit 1
fi
if ! grep -q "visualForm" "$APP/src/components/elo/EloOnboardingSheet.tsx"; then
  echo "FAIL: onboarding must let user pick visualForm" >&2
  exit 1
fi
if ! grep -q "elo-membrane__socket" "$APP/src/components/elo/EloFaceMembrane.tsx"; then
  echo "FAIL: EloFaceMembrane must render sculptural glass eye sockets" >&2
  exit 1
fi
if ! grep -q "eyeCenters" "$APP/src/hooks/useEloFaceMirror.ts"; then
  echo "FAIL: useEloFaceMirror must export POP-aligned eye centers" >&2
  exit 1
fi
if ! grep -q "EloSessionScope" "$APP/src/App.tsx"; then
  echo "FAIL: App must mount EloSessionScope for immersive session reset" >&2
  exit 1
fi
if ! grep -q "elo-manifest-enter" "$APP/src/styles/elo-presence.css"; then
  echo "FAIL: elo-presence.css must animate membrane manifest from rail" >&2
  exit 1
fi

for f in "${required[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "MISSING: $f"
    exit 1
  fi
  echo "OK $f"
done

echo "== Typecheck =="
cd "$APP"
npm run build

echo "== ELO presence smoke passed =="
