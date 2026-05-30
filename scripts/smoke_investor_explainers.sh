#!/usr/bin/env bash
# Investor explainer HTML series — file presence + index link integrity.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/06_feed_earning_loops"

echo "== Investor explainer smoke =="

required=(
  "investor_explainer_index.html"
  "reward_feature_explainer.html"
  "controls_button_explainer.html"
  "share_button_explainer.html"
  "message_button_explainer.html"
  "love_hold_creator_offer_explainer.html"
  "elo_presence_explainer.html"
  "feed_dock_explainer.html"
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
  if ! grep -q "href=\"$name\"" "$index"; then
    echo "FAIL: index must link to $name" >&2
    exit 1
  fi
done
echo "OK index links (14 walkthroughs)"

echo ""
echo "PASS: investor explainer smoke"
