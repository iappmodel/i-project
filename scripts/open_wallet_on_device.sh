#!/usr/bin/env bash
# Open React wallet deep link on a connected Android device (Flutter return-path test).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${PATH:-}:$HOME/Library/Android/sdk/platform-tools"

SESSION_ID="${1:-}"
if [[ -z "$SESSION_ID" ]]; then
  echo "Usage: $0 <session_id>" >&2
  echo "Example: $0 sess_8f3c2a1b-4e5d-6a7b-8c9d-0e1f2a3b4c5d" >&2
  exit 1
fi

# shellcheck source=android_device_urls.sh
source "$ROOT/scripts/android_device_urls.sh"

if [[ -z "${DEVICE_ID:-}" ]]; then
  echo "FAIL: no Android device connected" >&2
  adb devices -l >&2 || true
  exit 1
fi

URL="${WALLET_URL%/}/?proofSession=${SESSION_ID}"
echo "device: $DEVICE_ID ($ANDROID_DEVICE_MODE)"
echo "Opening on device: $URL"

adb shell am start -a android.intent.action.VIEW -d "$URL" >/dev/null

echo "PASS: wallet deep link sent to device"
echo "Expected: Wallet tab opens with proofSession flash banner"
