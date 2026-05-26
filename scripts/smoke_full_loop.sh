#!/usr/bin/env bash
# Unified POP wallet loop smoke — local-json by default, optional Supabase.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "${1:-}" == "--supabase" ]]; then
  exec "$ROOT/scripts/smoke_pop_wallet_loop_supabase.sh"
fi

exec "$ROOT/scripts/smoke_pop_wallet_loop.sh"
