#!/usr/bin/env bash
# Verify investor print bundle (no browser launch in CI).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE="$ROOT/06_feed_earning_loops/investor_print_bundle.html"
CSS="$ROOT/06_feed_earning_loops/investor_print.css"
SCRIPT="$ROOT/scripts/open_investor_print_bundle.sh"

echo "== Investor print bundle smoke =="

[[ -f "$BUNDLE" ]] || { echo "FAIL: missing print bundle" >&2; exit 1; }
[[ -f "$CSS" ]] || { echo "FAIL: missing investor_print.css" >&2; exit 1; }
[[ -x "$SCRIPT" ]] || { echo "FAIL: open_investor_print_bundle.sh must be executable" >&2; exit 1; }

head -n 3 "$BUNDLE" | grep -qi '<!DOCTYPE html' || { echo "FAIL: bundle must be HTML" >&2; exit 1; }
grep -q 'investor_print.css' "$BUNDLE" || { echo "FAIL: bundle must link print css" >&2; exit 1; }
grep -q 'window.print' "$BUNDLE" || { echo "FAIL: bundle must expose print action" >&2; exit 1; }
grep -q 'REWARD pill' "$BUNDLE" || { echo "FAIL: bundle must catalog walkthroughs" >&2; exit 1; }
grep -q 'POP' "$BUNDLE" || { echo "FAIL: bundle must include POP section" >&2; exit 1; }
grep -q 'pop-v2-complete' "$BUNDLE" || { echo "FAIL: bundle must reference POP v2 tag" >&2; exit 1; }

POP_EXPLAINER="$ROOT/06_feed_earning_loops/pop_feature_investor_explainer.html"
grep -q 'pop-v2-complete' "$POP_EXPLAINER" || { echo "FAIL: POP explainer must reference v2 tag" >&2; exit 1; }
grep -q 'POP_V2_RELEASE' "$POP_EXPLAINER" || { echo "FAIL: POP explainer must link v2 release doc" >&2; exit 1; }

INDEX="$ROOT/06_feed_earning_loops/investor_explainer_index.html"
grep -q 'investor_print_bundle.html' "$INDEX" || { echo "FAIL: index must link print bundle" >&2; exit 1; }
grep -q 'REVENUE_MODEL' "$BUNDLE" || { echo "FAIL: print bundle must link revenue model" >&2; exit 1; }
grep -qi 'verified attention' "$BUNDLE" || { echo "FAIL: print bundle must include thesis" >&2; exit 1; }

bash -n "$SCRIPT"
echo "PASS: investor print bundle smoke"
