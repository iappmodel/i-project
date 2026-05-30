#!/usr/bin/env bash
# Verify investor presenter open script (no browser launch in CI).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$ROOT/scripts/open_investor_presenter.sh"
DECK="$ROOT/06_feed_earning_loops/investor_presenter_deck.html"

echo "== Open investor presenter smoke =="

[[ -x "$SCRIPT" ]] || { echo "FAIL: open_investor_presenter.sh must be executable" >&2; exit 1; }
[[ -f "$DECK" ]] || { echo "FAIL: missing presenter deck" >&2; exit 1; }
bash -n "$SCRIPT"

echo "PASS: open investor presenter smoke"
