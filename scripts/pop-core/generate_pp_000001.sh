#!/usr/bin/env bash
# Generates integrations/pop-core/fixtures/PP-000001.json from the deterministic builder.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RUNTIME="$ROOT/integrations/eye-tracking/flutter-runtime"
FIXTURE="$ROOT/integrations/pop-core/fixtures/PP-000001.json"

cd "$RUNTIME"
flutter pub get >/dev/null

dart run "$ROOT/scripts/pop-core/generate_pp_000001.dart" > "$FIXTURE"
echo "Wrote $FIXTURE"
