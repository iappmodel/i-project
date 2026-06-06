#!/usr/bin/env bash
# POP Stage 9 — Android MVP ship gate (test matrix + rollout flags).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FLUTTER="$ROOT/integrations/eye-tracking/flutter-runtime"
APP="$ROOT/app"
POP_CORE="$ROOT/integrations/pop-core"

echo "== POP ship gate (Stage 9) =="

"$ROOT/scripts/smoke_pop_finish.sh"

if command -v flutter >/dev/null 2>&1; then
  cd "$FLUTTER"
  flutter test \
    test/pop_stage9_ship_gate_test.dart \
    test/pop_privacy_gate_test.dart \
    test/pop_ios_vision_contract_test.dart \
    test/external_os_control_policy_test.dart \
    test/proof_packet_emission_test.dart \
    test/frame_perf_metrics_test.dart
  if [[ -f "$FLUTTER/ios/Runner/VisionProcessor.swift" ]] && [[ -f "$FLUTTER/ios/Runner/face_landmarker.task" ]]; then
    echo "OK iOS vision_channel native stack"
  else
    echo "FAIL: missing iOS VisionProcessor or face_landmarker.task" >&2
    exit 1
  fi
fi

if [[ -f "$POP_CORE/fixtures/PP-000001.json" ]]; then
  echo "OK PP-000001 fixture"
else
  echo "FAIL: missing PP-000001.json" >&2
  exit 1
fi

if [[ -d "$POP_CORE/validator" ]] && command -v npm >/dev/null 2>&1; then
  echo "-- pop-core validator tests --"
  (cd "$POP_CORE/validator" && npm test -- --run 2>&1 | tail -5)
  echo "-- pop-core backend tests --"
  (cd "$POP_CORE/backend" && npm test -- --run 2>&1 | tail -5)
fi

if [[ -d "$APP/node_modules" ]] || [[ -f "$APP/package-lock.json" ]]; then
  echo "-- app vitest (POP Stage 9) --"
  (cd "$APP" && npx vitest run \
    src/lib/popPrivacyGate.test.ts \
    src/lib/popFeatureFlags.test.ts \
    src/lib/pp000001Golden.test.ts \
    src/lib/popRlsContract.test.ts \
    src/lib/demoProofPacket.test.ts \
    src/lib/popDemoLite/fusion.test.ts \
    src/lib/pendingRewardExplainer.test.ts 2>&1 | tail -8)
fi

echo ""
echo "PASS: POP ship gate"
