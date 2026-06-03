#!/usr/bin/env bash
# Print device URLs and run Android investor prep smokes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== Investor device demo =="

cat <<'EOF'
B1 on device:
  - Real gaze: Flutter Seal Proof (USB) — not default WebView mock gaze
  - Host IP: validator must reach laptop LAN IP, not 127.0.0.1 on phone
EOF

if [[ -x "$ROOT/scripts/android_device_urls.sh" ]]; then
  "$ROOT/scripts/android_device_urls.sh"
fi

echo ""
echo "Runbook: docs/investor/DEVICE_DEMO_RUNBOOK.md"
echo ""

if command -v flutter >/dev/null 2>&1; then
  "$ROOT/scripts/smoke_android_env.sh" 2>/dev/null || echo "WARN: android env smoke skipped"
else
  echo "SKIP flutter not installed"
fi

echo ""
echo "Next: ./scripts/run_android_device_test.sh"
echo "Then: ./scripts/smoke_android_seal_postcheck.sh"
