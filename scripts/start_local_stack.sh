#!/usr/bin/env bash
# Start local Supabase + export env for POP validator.
#
# Requires Docker Desktop running. Uses Docker.app binary (fixes broken /usr/local/bin/docker symlink).
#
# Usage:
#   ./scripts/start_local_stack.sh
#   ./scripts/start_local_stack.sh --reset   # db reset + seed demo user

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SUPABASE_DIR="$ROOT/app/supabase"
DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin"

export PATH="$DOCKER_BIN:$PATH"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI not found. Open Docker Desktop and retry." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Waiting for Docker daemon (open Docker Desktop → wait for 'Engine running')..."
  for _ in $(seq 1 30); do
    sleep 2
    if docker info >/dev/null 2>&1; then
      break
    fi
  done
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon not reachable." >&2
  echo "Fix:" >&2
  echo "  1. Quit and reopen Docker Desktop" >&2
  echo "  2. Wait until bottom bar shows 'Engine running'" >&2
  echo "  3. Delete stale exited containers if needed (e.g. busy_lederberg)" >&2
  echo "  4. Re-run: ./scripts/start_local_stack.sh --reset" >&2
  echo "" >&2
  echo "Note: /usr/local/bin/docker may point to a broken symlink." >&2
  echo "This script uses: $DOCKER_BIN/docker" >&2
  exit 1
fi

cd "$SUPABASE_DIR"

echo "Starting Supabase local stack..."
supabase start

if [[ "${1:-}" == "--reset" ]]; then
  echo "Resetting database (migrations + seed)..."
  supabase db reset
fi

echo ""
echo "== Local stack ready =="
supabase status

ENV_FILE="$ROOT/.env.local.stack"
supabase status -o env > "$ENV_FILE"

API_URL="$(grep '^API_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')"
SERVICE_KEY="$(grep '^SERVICE_ROLE_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')"

cat <<EOF

Export for POP validator:
  export SUPABASE_URL=$API_URL
  export SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY

Export for app (.env.local):
  VITE_POP_VALIDATOR_URL=http://127.0.0.1:8787
  VITE_DEMO_USER_ID=00000000-0000-4000-8000-000000000001

Start validator:
  cd integrations/pop-core/validator && npm start

Start app:
  cd app && npm run dev

Full env written to: $ENV_FILE
EOF
