#!/usr/bin/env bash
# Full organism spine smoke — local-json + optional Supabase when Docker runs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin"
export PATH="$DOCKER_BIN:$PATH"

echo "== Organism spine smoke =="

"$ROOT/scripts/smoke_full_loop.sh"

if docker info >/dev/null 2>&1 && command -v supabase >/dev/null 2>&1; then
  echo ""
  echo "== Supabase ledger smoke =="
  "$ROOT/scripts/smoke_pop_wallet_loop_supabase.sh"
else
  echo ""
  echo "SKIP: Supabase smoke (Docker or Supabase CLI not available)"
fi

echo ""
echo "PASS: organism spine smoke"
