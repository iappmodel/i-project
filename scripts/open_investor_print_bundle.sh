#!/usr/bin/env bash
# Open the investor print bundle (browser Print -> Save as PDF).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE="$ROOT/06_feed_earning_loops/investor_print_bundle.html"

[[ -f "$BUNDLE" ]] || { echo "FAIL: missing $BUNDLE" >&2; exit 1; }

if [[ "$(uname -s)" == "Darwin" ]]; then
  open "$BUNDLE"
else
  xdg-open "$BUNDLE" 2>/dev/null || sensible-browser "$BUNDLE" 2>/dev/null || {
    echo "Open in browser: file://$BUNDLE"
  }
fi

echo "Print bundle: file://$BUNDLE"
echo "Use Save as PDF in the browser print dialog (Cmd/Ctrl+P)."
