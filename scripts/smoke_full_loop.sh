#!/usr/bin/env bash
# Unified smoke — local-json wallet loop + proof-events SSE.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== smoke_full_loop (local-json) =="
"$ROOT/scripts/smoke_pop_wallet_loop.sh"
echo ""
"$ROOT/scripts/smoke_proof_events.sh"

echo ""
echo "PASS: smoke_full_loop"
