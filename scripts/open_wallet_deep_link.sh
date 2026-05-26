#!/usr/bin/env bash
# Open React wallet deep link in default browser (manual Flutter return-path test).
set -euo pipefail

SESSION_ID="${1:-sess_manual_$(date +%s)}"
BASE="${VITE_APP_BASE_URL:-http://localhost:5173}"
URL="${BASE%/}/?proofSession=${SESSION_ID}"

echo "Opening: $URL"
if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
else
  echo "Open manually: $URL"
fi
