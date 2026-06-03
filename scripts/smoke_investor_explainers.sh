#!/usr/bin/env bash
# Investor explainer HTML series — file presence + index link integrity.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/06_feed_earning_loops"

echo "== Investor explainer smoke =="

required=(
  "investor_explainer_index.html"
  "investor_presenter_deck.html"
  "reward_feature_explainer.html"
  "controls_button_explainer.html"
  "share_button_explainer.html"
  "message_button_explainer.html"
  "love_hold_creator_offer_explainer.html"
  "like_tap_explainer.html"
  "save_double_tap_explainer.html"
  "boost_triple_tap_explainer.html"
  "elo_presence_explainer.html"
  "feed_dock_explainer.html"
  "loop1_spine_explainer.html"
  "wallet_dock_explainer.html"
  "promo_dock_explainer.html"
  "create_studio_explainer.html"
  "profile_dock_explainer.html"
  "pop_feature_investor_explainer.html"
  "out_profile_explainer.html"
  "timer_line_explainer.html"
)

for name in "${required[@]}"; do
  path="$DIR/$name"
  [[ -f "$path" ]] || { echo "FAIL: missing $path" >&2; exit 1; }
  if ! head -n 3 "$path" | grep -qi '<!DOCTYPE html'; then
    echo "FAIL: $name must start with HTML doctype" >&2
    exit 1
  fi
  echo "OK $name"
done

index="$DIR/investor_explainer_index.html"
for name in "${required[@]}"; do
  [[ "$name" == "investor_explainer_index.html" ]] && continue
  [[ "$name" == "investor_presenter_deck.html" ]] && continue
  if ! grep -q "href=\"$name\"" "$index"; then
    echo "FAIL: index must link to $name" >&2
    exit 1
  fi
done
echo "OK index links (18 walkthroughs)"

deck="$DIR/investor_presenter_deck.html"
grep -q 'href="investor_presenter_deck.html"' "$index" || { echo "FAIL: index must link to presenter deck" >&2; exit 1; }
grep -q 'investor_presenter_title.html' "$deck" || { echo "FAIL: presenter deck must include title slide" >&2; exit 1; }
[[ -f "$DIR/investor_presenter_title.html" ]] || { echo "FAIL: missing investor_presenter_title.html" >&2; exit 1; }
echo "OK presenter title slide"
for name in "${required[@]}"; do
  [[ "$name" == "investor_explainer_index.html" ]] && continue
  [[ "$name" == "investor_presenter_deck.html" ]] && continue
  if ! grep -q "$name" "$deck"; then
    echo "FAIL: presenter deck must reference $name" >&2
    exit 1
  fi
done
echo "OK presenter deck references all walkthroughs"
grep -q 'app_ui_simulator.html' "$deck" || {
  echo "FAIL: presenter deck must include app_ui_simulator slide" >&2
  exit 1
}
echo "OK presenter deck includes touch simulator"

elo="$DIR/elo_presence_explainer.html"
grep -q 'eloManifestEnter' "$elo" || { echo "FAIL: elo explainer must show rail-to-center manifest" >&2; exit 1; }
grep -q 'elo-reply' "$elo" || { echo "FAIL: elo explainer must document elo-reply runtime" >&2; exit 1; }
grep -q 'speechEnergy' "$elo" || { echo "FAIL: elo explainer must document speech reactions" >&2; exit 1; }
grep -q 'voice-out' "$elo" || { echo "FAIL: elo explainer must document voice-out TTS" >&2; exit 1; }
echo "OK elo_presence_explainer content checks"

boost="$DIR/boost_triple_tap_explainer.html"
grep -q 'triple_tap' "$boost" || { echo "FAIL: boost explainer must document triple_tap trigger" >&2; exit 1; }
grep -q 'custom:boost' "$boost" || { echo "FAIL: boost explainer must document custom:boost action" >&2; exit 1; }
echo "OK boost_triple_tap_explainer content checks"

"$ROOT/scripts/smoke_app_ui_simulator.sh"
"$ROOT/scripts/smoke_investor_print_bundle.sh"

echo ""
echo "PASS: investor explainer smoke"
