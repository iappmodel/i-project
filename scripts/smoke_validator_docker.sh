#!/usr/bin/env bash
# Build and smoke POP validator container locally.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin"
export PATH="$DOCKER_BIN:$PATH"

if ! docker info >/dev/null 2>&1; then
  echo "SKIP: Docker not running."
  exit 0
fi

IMAGE="pop-validator-smoke:local"
CONTAINER="pop-validator-smoke-$$"

echo "== Validator docker smoke =="
docker build \
  -f "$ROOT/integrations/pop-core/validator/Dockerfile" \
  -t "$IMAGE" \
  "$ROOT/integrations/pop-core"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --name "$CONTAINER" -p 8877:8787 "$IMAGE" >/dev/null

for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:8877/health" >/dev/null 2>&1; then
    echo "PASS: validator container health check"
    exit 0
  fi
  sleep 0.25
done

echo "FAIL: validator container did not become healthy" >&2
docker logs "$CONTAINER" >&2 || true
exit 1
