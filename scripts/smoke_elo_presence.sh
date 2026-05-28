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
  "$APP/src/hooks/useEloWakeWord.ts"
  "$APP/src/lib/elo/types.ts"
  "$APP/src/lib/elo/expressionEngine.ts"
  "$APP/src/state/eloContext.tsx"
  "$APP/src/styles/elo-presence.css"
  "$ROOT/MASTER_BRAIN/UX/ELO_PRESENCE_LAYER.md"
)

if ! grep -q "EloEvokePrompt" "$APP/src/screens/ImmersiveFeedScreen.tsx"; then
  echo "FAIL: ImmersiveFeedScreen must mount EloPresenceLayer" >&2
  exit 1
fi
if ! grep -q "armVoice" "$APP/src/hooks/useEloWakeWord.ts"; then
  echo "FAIL: useEloWakeWord must support opt-in armed voice" >&2
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
