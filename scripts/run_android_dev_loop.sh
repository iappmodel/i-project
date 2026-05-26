#!/usr/bin/env bash
# Print orchestrated Android dev loop commands (Flutter Seal Proof + Capacitor WebView).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

"$ROOT/scripts/smoke_android_env.sh" || true

cat <<'EOF'

== Android dev loop (manual device/emulator) ==

Terminal 1 — full stack:
  ./scripts/dev_stack.sh

Terminal 2 — Flutter Seal Proof:
  cd integrations/eye-tracking/flutter-runtime
  flutter run \
    --dart-define=POP_VALIDATOR_URL=http://10.0.2.2:8787 \
    --dart-define=WALLET_APP_URL=http://10.0.2.2:5173

Terminal 3 — Capacitor WebView (optional, after --add):
  ./scripts/setup_capacitor_shell.sh --add
  cd app
  CAPACITOR_SERVER_URL=http://10.0.2.2:5173 npx cap run android

Logcat (Seal Proof):
  adb logcat -s flutter | grep -E 'PROOF_SEAL|PROOF_VALIDAT|WALLET_DEEP_LINK'

Verify hold:
  curl 'http://127.0.0.1:8787/v1/pending-holds?localUserRef=demo-user-001'

EOF
