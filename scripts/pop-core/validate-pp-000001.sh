#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RUNTIME="$ROOT/integrations/eye-tracking/flutter-runtime"
FIXTURE="$ROOT/integrations/pop-core/fixtures/PP-000001.json"
SCHEMA="$ROOT/integrations/pop-core/contracts/proof-packet-v0/proof_packet_v0.schema.json"

cd "$RUNTIME"
flutter pub get >/dev/null

if [[ ! -f "$FIXTURE" ]]; then
  flutter test test/generate_pp_000001_fixture_test.dart
fi

python3 - "$FIXTURE" "$SCHEMA" <<'PY'
import json
import sys

fixture_path, schema_path = sys.argv[1], sys.argv[2]
with open(fixture_path) as f:
    data = json.load(f)
with open(schema_path) as f:
    schema = json.load(f)

required = schema.get("required", [])
for key in required:
    if key not in data:
        raise SystemExit(f"missing required field: {key}")

if data.get("packetVersion") != "0":
    raise SystemExit("packetVersion must be 0")
if data.get("review", {}).get("status") != "pending":
    raise SystemExit("review.status must be pending")

print(f"Validated {fixture_path}")
PY
