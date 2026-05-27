#!/usr/bin/env bash
# Print orchestrated Android dev loop commands (Flutter Seal Proof + Capacitor WebView).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

"$ROOT/scripts/smoke_android_env.sh" || true

# shellcheck source=android_device_urls.sh
source "$ROOT/scripts/android_device_urls.sh"

cat <<EOF

== Android dev loop (manual device/emulator) ==

Detected: device=${DEVICE_ID:-none} mode=$ANDROID_DEVICE_MODE
URLs: POP=$POP_URL  WALLET=$WALLET_URL

One-shot deploy + logcat (physical USB):
  ./scripts/run_android_device_test.sh

Terminal 1 — full stack:
  ./scripts/dev_stack.sh

Terminal 2 — Flutter Seal Proof:
  cd integrations/eye-tracking/flutter-runtime
  flutter run \\
    --dart-define=POP_VALIDATOR_URL=$POP_URL \\
    --dart-define=WALLET_APP_URL=$WALLET_URL

Terminal 3 — Capacitor WebView (optional, after --add):
  ./scripts/setup_capacitor_shell.sh --add
  cd app
  CAPACITOR_SERVER_URL=$WALLET_URL npx cap run android

Logcat (Seal Proof):
  adb logcat -s flutter | grep -E 'PROOF_SEAL|PROOF_VALIDAT|WALLET_DEEP_LINK'

Verify hold after tap:
  ./scripts/smoke_android_seal_postcheck.sh

Open wallet deep link on device:
  ./scripts/open_wallet_on_device.sh <session_id>

Physical device tip: USB + adb reverse (auto) avoids WiFi "No route to host".
Emulator: uses 10.0.2.2 to reach host localhost.

EOF
