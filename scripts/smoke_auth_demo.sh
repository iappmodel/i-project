#!/usr/bin/env bash
# Smoke: Supabase Auth demo user sign-in (local stack).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin"
export PATH="$DOCKER_BIN:$PATH"

if ! docker info >/dev/null 2>&1; then
  echo "SKIP: Docker not running" >&2
  exit 0
fi

# shellcheck disable=SC1090
source "$ROOT/.env.local.stack" 2>/dev/null || {
  cd "$ROOT/app" && eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY)=')"
}

EMAIL="demo-user-001@i.local"
PASSWORD="demo-local-password"

res="$(curl -sf "$API_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"

echo "$res" | grep -q '"access_token"' || {
  echo "FAIL: no access_token in auth response" >&2
  echo "$res" >&2
  exit 1
}

uid="$(echo "$res" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])")"
echo "PASS: demo auth sign-in uid=$uid"
