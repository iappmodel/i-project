#!/usr/bin/env bash
# Resolve POP_VALIDATOR_URL and WALLET_APP_URL for a connected Android device.
# Source:  source scripts/android_device_urls.sh
# Print:   ./scripts/android_device_urls.sh
set -euo pipefail

export PATH="${PATH:-}:$HOME/Library/Android/sdk/platform-tools"

DEVICE_ID="$(adb devices 2>/dev/null | awk 'NR>1 && $2=="device" { print $1; exit }')" || true
ANDROID_DEVICE_MODE="none"
POP_URL="http://10.0.2.2:8787"
WALLET_URL="http://10.0.2.2:5173"

if [[ -n "$DEVICE_ID" ]]; then
  if [[ "$DEVICE_ID" == emulator-* ]]; then
    ANDROID_DEVICE_MODE="emulator"
    POP_URL="http://10.0.2.2:8787"
    WALLET_URL="http://10.0.2.2:5173"
  elif adb get-state >/dev/null 2>&1; then
    adb reverse tcp:8787 tcp:8787 >/dev/null 2>&1 || true
    adb reverse tcp:5173 tcp:5173 >/dev/null 2>&1 || true
    ANDROID_DEVICE_MODE="usb-reverse"
    POP_URL="http://127.0.0.1:8787"
    WALLET_URL="http://127.0.0.1:5173"
  else
    LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
    if [[ -n "$LAN_IP" ]]; then
      ANDROID_DEVICE_MODE="lan"
      POP_URL="http://${LAN_IP}:8787"
      WALLET_URL="http://${LAN_IP}:5173"
    fi
  fi
fi

export POP_URL WALLET_URL ANDROID_DEVICE_MODE DEVICE_ID

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "device: ${DEVICE_ID:-(none)}"
  echo "mode: $ANDROID_DEVICE_MODE"
  echo "POP_URL=$POP_URL"
  echo "WALLET_URL=$WALLET_URL"
fi
