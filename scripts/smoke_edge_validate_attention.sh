#!/usr/bin/env bash
# Smoke: validate-attention edge function is deployed locally.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin"
export PATH="$DOCKER_BIN:$PATH"

if ! docker info >/dev/null 2>&1; then
  echo "SKIP: Docker not running" >&2
  exit 0
fi

cd "$ROOT/app"
eval "$(supabase status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY|FUNCTIONS_URL)=')"

code="$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS \
  "$FUNCTIONS_URL/validate-attention" \
  -H "Access-Control-Request-Method: POST")"

if [[ "$code" != "200" && "$code" != "204" ]]; then
  echo "FAIL: validate-attention OPTIONS returned $code" >&2
  exit 1
fi

echo "PASS: validate-attention edge function reachable ($code)"
