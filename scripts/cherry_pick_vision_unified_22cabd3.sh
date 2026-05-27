#!/usr/bin/env bash
# Copy the audited web vision-unified subset (22cabd3) from the source repo
# into this repo under app/src/vision-unified/ (namespaced; safe-by-default).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_REPO="${VISION_SOURCE_REPO:-$HOME/Desktop/IVAULT/i-project-rescue/github-source-repos/eye-earn-sparkle-archive}"
SRC_DIR="$SRC_REPO/src"
DEST_DIR="$ROOT/app/src/vision-unified"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "FAIL: source repo missing at $SRC_DIR" >&2
  echo "Set VISION_SOURCE_REPO to override." >&2
  exit 1
fi

mkdir -p "$DEST_DIR"

copy() {
  local rel="$1"
  local from="$SRC_DIR/$rel"
  local to="$DEST_DIR/$rel"
  mkdir -p "$(dirname "$to")"
  cp -f "$from" "$to"
}

echo "== Cherry-pick web vision subset (22cabd3) =="

copy "components/BlinkRemoteControl.tsx"
copy "components/TargetEditor.tsx"
copy "components/TargetOverlay.tsx"
copy "components/vision/UnifiedVisionCalibrationWizard.tsx"
copy "constants/attention.ts"
copy "contexts/VisionContext.tsx"
copy "contexts/VisionStreamContext.tsx"
copy "hooks/useBlinkRemoteControl.ts"
copy "hooks/useEyeTracking.ts"
copy "hooks/useScreenTargets.ts"
copy "hooks/useVisionEngine.ts"
copy "lib/visionCalibration/profile.ts"
copy "services/calibration.service.ts"

echo "Copied into: $DEST_DIR"
echo "PASS: cherry-pick vision subset"
