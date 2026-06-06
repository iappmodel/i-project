#!/usr/bin/env bash
# smoke_app_ui_simulator.sh — integrated Picture 2 touch simulator integrity
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/06_feed_earning_loops"
SIM="$DIR/app_ui_simulator.html"
INDEX="$DIR/investor_explainer_index.html"

echo "== App UI simulator smoke =="

[[ -f "$SIM" ]] || { echo "FAIL: missing $SIM" >&2; exit 1; }
head -n 3 "$SIM" | grep -qi '<!DOCTYPE html' || { echo "FAIL: simulator must start with HTML doctype" >&2; exit 1; }
echo "OK app_ui_simulator.html"

grep -q 'href="app_ui_simulator.html"' "$INDEX" || {
  echo "FAIL: investor index must link to app_ui_simulator.html" >&2
  exit 1
}
echo "OK index link"

required_markers=(
  'id="screen"'
  'id="rewardBtn"'
  'id="watchBtn"'
  'id="eloBtn"'
  'id="gestureCross"'
  'id="rewardSheet"'
  'id="controlsSheet"'
  'id="stateList"'
  'data-tab="wallet"'
  'data-tab="promo"'
  'data-bind="double"'
  'function runWatch'
  'function openElo'
  'function boostClip'
  'Triple tap resolved'
  'immersive-sunset.svg'
  'POP Demo Lite'
  'parsePopDemoLiteVoice'
  'computeFusionAttentionScore'
  'id="voiceToggle"'
  'emitPopLiteProofPacket'
)

for marker in "${required_markers[@]}"; do
  grep -q "$marker" "$SIM" || { echo "FAIL: simulator must include $marker" >&2; exit 1; }
done
echo "OK interactive wiring markers"

echo ""
echo "PASS: app UI simulator smoke"
