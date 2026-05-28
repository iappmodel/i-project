#!/usr/bin/env bash
# Smoke: vision → proof packet hint bridge (flag default off).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"

echo "== Vision proof bridge smoke =="

[[ -f "$APP/src/lib/visionProofBridge.ts" ]] || {
  echo "FAIL: visionProofBridge.ts missing" >&2
  exit 1
}
if ! grep -q "visionHints" "$APP/src/lib/demoProofPacket.ts"; then
  echo "FAIL: demoProofPacket must accept vision hints" >&2
  exit 1
fi
if ! grep -q "publishVisionProofSnapshot" "$APP/src/screens/WatchVerifyScreen.tsx"; then
  echo "FAIL: Watch must publish vision proof snapshots" >&2
  exit 1
fi
if ! grep -q "VisionSourceBadge" "$APP/src/screens/EarnScreen.tsx"; then
  echo "FAIL: Earn must show vision source badge" >&2
  exit 1
fi
[[ -f "$ROOT/docs/technical/VISION_PROOF_BRIDGE_ADR.md" ]] || {
  echo "FAIL: VISION_PROOF_BRIDGE_ADR.md missing" >&2
  exit 1
}

cd "$APP"
npm run typecheck --silent

echo "PASS: vision proof bridge smoke"
