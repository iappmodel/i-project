#!/usr/bin/env bash
# Open the integrated Picture 2 app UI simulator (touch + dock + rail).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SIM="$ROOT/06_feed_earning_loops/app_ui_simulator.html"

[[ -f "$SIM" ]] || { echo "FAIL: missing $SIM" >&2; exit 1; }

if [[ "$(uname -s)" == "Darwin" ]]; then
  open "$SIM"
else
  xdg-open "$SIM" 2>/dev/null || sensible-browser "$SIM" 2>/dev/null || {
    echo "Open in browser: file://$SIM"
  }
fi

echo "App UI simulator: file://$SIM"
echo "Tip: use dock tabs, HEART gestures, REWARD pill, Watch & earn, and ELO panel."
