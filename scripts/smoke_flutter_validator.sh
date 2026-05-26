#!/usr/bin/env bash
# Flutter proof + validator bridge tests.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v flutter >/dev/null 2>&1; then
  echo "SKIP: flutter not in PATH" >&2
  exit 0
fi

cd "$ROOT/integrations/eye-tracking/flutter-runtime"
flutter test test/seal_proof_tap_test.dart
flutter test test/proof_validator_bridge_test.dart 2>/dev/null || flutter test

echo "PASS: flutter proof smoke"
