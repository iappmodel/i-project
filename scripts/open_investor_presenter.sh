#!/usr/bin/env bash
# Open the consolidated investor presenter deck (17 explainers, auto-advance).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DECK="$ROOT/06_feed_earning_loops/investor_presenter_deck.html"

[[ -f "$DECK" ]] || { echo "FAIL: missing $DECK" >&2; exit 1; }

if [[ "$(uname -s)" == "Darwin" ]]; then
  open "$DECK"
else
  xdg-open "$DECK" 2>/dev/null || sensible-browser "$DECK" 2>/dev/null || {
    echo "Open in browser: file://$DECK"
  }
fi

echo "Presenter deck: file://$DECK"
echo "Keys: ← → · Space · A (auto) · F (fullscreen)"
