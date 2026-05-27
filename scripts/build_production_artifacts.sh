#!/usr/bin/env bash
# Build reproducible production artifacts (no deployment).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.artifacts"
STAMP="$(date +%Y%m%d-%H%M%S)"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "== Build production artifacts =="

cd "$ROOT/app"
npm run typecheck --silent
npm run build --silent

tar -czf "$OUT/app-dist-${STAMP}.tar.gz" -C "$ROOT/app" dist
cp "$ROOT/docs/technical/PRODUCTION_DEPLOY_RUNBOOK.md" "$OUT/PRODUCTION_DEPLOY_RUNBOOK.md"

echo "Artifacts:"
ls -1 "$OUT"
echo "PASS: build production artifacts"
