#!/usr/bin/env bash
# Master investor readiness gate — Phase A always; flags for product/spine/supabase/phase-c.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PRODUCT=false
SPINE=false
SUPABASE=false
PHASE_C=false

for arg in "$@"; do
  case "$arg" in
    --product) PRODUCT=true ;;
    --spine) SPINE=true ;;
    --supabase) SUPABASE=true ;;
    --phase-c) PHASE_C=true ;;
    -h|--help)
      echo "Usage: $0 [--product] [--spine] [--supabase] [--phase-c]"
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg" >&2
      exit 1
      ;;
  esac
done

echo "== Investor readiness =="

"$ROOT/scripts/smoke_investor_phase_a.sh"

if $PRODUCT; then
  "$ROOT/scripts/smoke_immersive_shell.sh"
  "$ROOT/scripts/smoke_investor_b1.sh"
fi

if $SPINE; then
  "$ROOT/scripts/smoke_pop_ship_gate.sh"
  "$ROOT/scripts/smoke_pop_wallet_loop.sh"
fi

if $SUPABASE; then
  if [[ -f "$ROOT/.env.local.stack" ]]; then
    "$ROOT/scripts/smoke_pop_wallet_loop_supabase.sh"
  else
    echo "SKIP --supabase: no .env.local.stack" >&2
  fi
fi

if $PHASE_C; then
  "$ROOT/scripts/smoke_investor_phase_c.sh"
fi

echo ""
echo "PASS: investor readiness"
