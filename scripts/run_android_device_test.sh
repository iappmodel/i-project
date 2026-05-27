#!/usr/bin/env bash
# Android physical device test — automated smokes + Flutter deploy with USB reverse.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin"
export PATH="$DOCKER_BIN:$PATH:$HOME/Library/Android/sdk/platform-tools"

# shellcheck source=android_device_urls.sh
source "$ROOT/scripts/android_device_urls.sh"

if [[ -z "${DEVICE_ID:-}" ]]; then
  echo "FAIL: no Android device in 'device' state — check USB debugging" >&2
  adb devices -l >&2 || true
  exit 1
fi

echo "== Android device test =="
echo "device: $DEVICE_ID"
echo "mode: $ANDROID_DEVICE_MODE"
echo "POP_VALIDATOR_URL: $POP_URL"
echo "WALLET_APP_URL: $WALLET_URL"
echo ""

echo "== 1/4 Automated smokes =="
"$ROOT/scripts/smoke_android_env.sh"
"$ROOT/scripts/smoke_flutter_seal_prep.sh"

echo "== 2/4 Stack health =="
curl -sf "http://127.0.0.1:8787/health" >/dev/null || {
  echo "FAIL: validator not running — run ./scripts/dev_stack.sh" >&2
  exit 1
}
if [[ "$ANDROID_DEVICE_MODE" == "lan" ]]; then
  curl -sf "$POP_URL/health" >/dev/null || {
    echo "FAIL: validator not reachable at $POP_URL — check Mac firewall or use USB" >&2
    exit 1
  }
  curl -sf "$WALLET_URL/" >/dev/null || {
    echo "FAIL: app not reachable at $WALLET_URL — restart dev_stack (Vite needs host: true)" >&2
    exit 1
  }
fi
echo "validator + app: OK"

echo ""
echo "== 3/4 Flutter unit tests =="
cd "$ROOT/integrations/eye-tracking/flutter-runtime"
flutter test test/wallet_deep_link_test.dart test/proof_validator_bridge_test.dart test/seal_proof_tap_test.dart

echo ""
echo "== 4/4 Deploy Flutter to device =="
echo "Building and installing on $DEVICE_ID (this may take several minutes)..."
echo ""
echo "ON DEVICE WHEN APP OPENS:"
echo "  1. Start a proof / tracking session"
echo "  2. Tap Seal Proof (debug UI)"
echo "  3. Watch for PROOF_VALIDATED + WALLET_DEEP_LINK in logcat"
echo ""

LOG="/tmp/android-seal-proof-logcat-$$.txt"
adb logcat -c 2>/dev/null || true
adb logcat -s flutter >"$LOG" &
LOGCAT_PID=$!
cleanup() { kill "$LOGCAT_PID" 2>/dev/null || true; }
trap cleanup EXIT

cd "$ROOT/integrations/eye-tracking/flutter-runtime"
flutter run -d "$DEVICE_ID" \
  --dart-define="POP_VALIDATOR_URL=$POP_URL" \
  --dart-define="WALLET_APP_URL=$WALLET_URL"

echo ""
echo "== Logcat highlights =="
grep -E 'PROOF_SEAL|PROOF_VALIDAT|WALLET_DEEP_LINK|PROOF_VALIDATION_FAILED' "$LOG" || echo "(no proof lines captured — tap Seal Proof while app runs)"

echo ""
echo "Verify hold on Mac:"
echo "  ./scripts/smoke_android_seal_postcheck.sh"
