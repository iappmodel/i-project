#!/usr/bin/env bash
# Phase C foundation — production readiness + optional Supabase spine (no fake metrics).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== Investor Phase C smoke =="

[[ -f "$ROOT/docs/investor/PILOT_METRICS_TEMPLATE.csv" ]] || {
  echo "FAIL: missing PILOT_METRICS_TEMPLATE.csv" >&2
  exit 1
}

"$ROOT/scripts/smoke_production_readiness.sh"

if [[ -f "$ROOT/.env.local.stack" ]]; then
  # shellcheck disable=SC1090
  source "$ROOT/.env.local.stack"
  if [[ -n "${API_URL:-}" ]]; then
    echo "== Supabase spine (stack env present) =="
    "$ROOT/scripts/smoke_pop_wallet_loop_supabase.sh" || {
      echo "WARN: supabase spine smoke failed — start ./scripts/dev_stack.sh" >&2
      exit 1
    }
  else
    echo "SKIP supabase spine — API_URL unset in .env.local.stack"
  fi
else
  echo "SKIP supabase spine — no .env.local.stack (run dev_stack first)"
fi

echo ""
echo "PASS: investor Phase C smoke"
