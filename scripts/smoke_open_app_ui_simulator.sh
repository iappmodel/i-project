#!/usr/bin/env bash
# Verify app UI simulator open script (no browser launch in CI).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$ROOT/scripts/open_app_ui_simulator.sh"
SIM="$ROOT/06_feed_earning_loops/app_ui_simulator.html"

echo "== Open app UI simulator smoke =="

[[ -x "$SCRIPT" ]] || { echo "FAIL: open_app_ui_simulator.sh must be executable" >&2; exit 1; }
[[ -f "$SIM" ]] || { echo "FAIL: missing app_ui_simulator.html" >&2; exit 1; }
bash -n "$SCRIPT"

echo "PASS: open app UI simulator smoke"
