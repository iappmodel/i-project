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
APP_DIR="$ROOT/app"
DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin"

export PATH="$DOCKER_BIN:$PATH"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI not found. Open Docker Desktop and retry." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Waiting for Docker daemon (open Docker Desktop → wait for 'Engine running')..."
  open -a Docker 2>/dev/null || true
  for _ in $(seq 1 45); do
    sleep 2
    if docker info >/dev/null 2>&1; then
      break
    fi
  done
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon not reachable. Quit and reopen Docker Desktop, then retry." >&2
  exit 1
fi

cd "$APP_DIR"

wait_for_supabase() {
  for _ in $(seq 1 60); do
    if supabase status >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

echo "Starting Supabase local stack (workdir: $APP_DIR)..."
if ! supabase start; then
  echo "First start attempt failed — retrying after stop..."
  supabase stop --no-backup 2>/dev/null || true
  sleep 3
  supabase start
fi

if ! wait_for_supabase; then
  echo "Supabase did not become healthy in time." >&2
  supabase status || true
  exit 1
fi

if [[ "${1:-}" == "--reset" ]]; then
  echo "Resetting database (migrations + seed)..."
  if ! supabase db reset; then
    echo "Reset returned non-zero — waiting and checking health..."
    sleep 5
    if ! wait_for_supabase; then
      echo "Retrying supabase start after reset..."
      supabase start
      wait_for_supabase
    fi
  fi
fi

if ! wait_for_supabase; then
  echo "Supabase unhealthy after reset." >&2
  exit 1
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
