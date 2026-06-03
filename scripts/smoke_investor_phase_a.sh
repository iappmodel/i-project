#!/usr/bin/env bash
# Phase A — investor materials + business pack file gates.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/06_feed_earning_loops"

echo "== Investor Phase A smoke =="

[[ -f "$ROOT/docs/INVESTOR_READINESS_CHECKLIST.md" ]] || {
  echo "FAIL: missing INVESTOR_READINESS_CHECKLIST.md" >&2
  exit 1
}
grep -q 'INVESTOR_READINESS_CHECKLIST.md' "$DIR/investor_explainer_index.html" || {
  echo "FAIL: index must link readiness checklist" >&2
  exit 1
}

REV="$ROOT/MASTER_BRAIN/CANONICAL/REVENUE_MODEL.md"
[[ -f "$REV" ]] || { echo "FAIL: missing REVENUE_MODEL.md" >&2; exit 1; }
grep -q '60' "$REV" && grep -q '30' "$REV" && grep -q '10' "$REV" || {
  echo "FAIL: REVENUE_MODEL must document 60/30/10" >&2
  exit 1
}

[[ -f "$ROOT/docs/POP_V2_RELEASE.md" ]] || {
  echo "FAIL: missing POP_V2_RELEASE.md" >&2
  exit 1
}

investor_docs=(
  README.md
  OBJECTION_LOG.md
  INTRO_LOG.md
  PILOT_LOI_TEMPLATE.md
  MICRO_CAMPAIGN_PLAYBOOK.md
  COMPLIANCE_BRIEF.md
  USE_OF_FUNDS_12MO.md
  OWNERSHIP_AND_GAPS.md
  TECHNICAL_DISCLOSE.md
  DEVICE_DEMO_RUNBOOK.md
  PILOT_METRICS_TEMPLATE.csv
  PILOT_METRICS_README.md
)
for f in "${investor_docs[@]}"; do
  [[ -f "$ROOT/docs/investor/$f" ]] || {
    echo "FAIL: missing docs/investor/$f" >&2
    exit 1
  }
done

[[ -f "$DIR/investor_pipeline_slide.html" ]] || {
  echo "FAIL: missing investor_pipeline_slide.html" >&2
  exit 1
}
grep -q 'investor_pipeline_slide.html' "$DIR/investor_explainer_index.html" || {
  echo "FAIL: index must link pipeline slide" >&2
  exit 1
}

grep -qi 'verified attention' "$DIR/investor_explainer_index.html" || {
  echo "FAIL: index must include thesis line" >&2
  exit 1
}

"$ROOT/scripts/smoke_investor_explainers.sh"
"$ROOT/scripts/smoke_open_investor_presenter.sh"
"$ROOT/scripts/smoke_open_app_ui_simulator.sh"

echo ""
echo "PASS: investor Phase A smoke"
