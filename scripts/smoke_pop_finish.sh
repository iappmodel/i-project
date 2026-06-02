#!/usr/bin/env bash
# POP finish plan regression smoke — keystone file assertions + targeted Flutter tests.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FLUTTER="$ROOT/integrations/eye-tracking/flutter-runtime"
APP="$ROOT/app"

echo "== POP finish smoke =="

required=(
  "$FLUTTER/lib/core/intent_os/pop_action_executor.dart"
  "$FLUTTER/lib/gaze_coordinate_space.dart"
  "$FLUTTER/lib/core/signal_stale_policy.dart"
  "$FLUTTER/lib/replay/pop_replay_driver.dart"
  "$FLUTTER/POP_FINISH_DELETION_MANIFEST.md"
  "$FLUTTER/POP_PRIVACY_BOUNDARIES.md"
  "$FLUTTER/lib/proof/pop_privacy_gate.dart"
  "$APP/src/lib/popFeatureFlags.ts"
  "$APP/src/lib/demoProofPacket.ts"
  "$APP/supabase/migrations/20260529120000_pops_sessions.sql"
)

for f in "${required[@]}"; do
  [[ -f "$f" ]] || { echo "FAIL: missing $f" >&2; exit 1; }
  echo "OK $f"
done

if ! grep -q "_requestZoneSelect" "$FLUTTER/lib/main.dart"; then
  echo "FAIL: main.dart must route zone select via _requestZoneSelect" >&2
  exit 1
fi
if ! grep -q "PopActionExecutor" "$FLUTTER/lib/main.dart"; then
  echo "FAIL: main.dart must use PopActionExecutor" >&2
  exit 1
fi
if ! grep -q "resolveZoneFromGaze" "$FLUTTER/lib/main.dart"; then
  echo "FAIL: main.dart must use resolveZoneFromGaze" >&2
  exit 1
fi
if grep -q "_trySelectZoneOnMeanEarClosedEdge(" "$FLUTTER/lib/main.dart"; then
  echo "FAIL: legacy meanEar blink commit path must be removed" >&2
  exit 1
fi

if ! command -v flutter >/dev/null 2>&1; then
  echo "SKIP: flutter not in PATH (file assertions passed)"
  exit 0
fi

cd "$FLUTTER"
flutter test \
  test/bypass_paths_test.dart \
  test/pop_finish_plan_test.dart \
  test/pop_action_executor_test.dart \
  test/governance_kernel_test.dart \
  test/pop_replay_harness_test.dart \
  test/high_risk_action_lane_test.dart \
  test/pop_privacy_gate_test.dart \
  test/pop_stage9_ship_gate_test.dart

echo ""
echo ""
echo "For full Android MVP gate run: ./scripts/smoke_pop_ship_gate.sh"
echo "PASS: POP finish smoke"
