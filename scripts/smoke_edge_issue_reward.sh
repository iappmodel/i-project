#!/usr/bin/env bash
# Smoke: issue-reward edge function is deployed locally.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin"
export PATH="$DOCKER_BIN:$PATH"

if ! docker info >/dev/null 2>&1; then
  echo "SKIP: Docker not running" >&2
  exit 0
fi

cd "$ROOT/app"
eval "$(supabase status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY)=')"

# OPTIONS preflight — function exists and responds
code="$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS \
  "$FUNCTIONS_URL/issue-reward" \
  -H "Access-Control-Request-Method: POST")"

if [[ "$code" != "200" && "$code" != "204" ]]; then
  echo "FAIL: issue-reward OPTIONS returned $code" >&2
  exit 1
fi

echo "PASS: issue-reward edge function reachable ($code)"
