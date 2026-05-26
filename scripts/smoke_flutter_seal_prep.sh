#!/usr/bin/env bash
# Prep check for Flutter Seal Proof → validator → wallet deep link (no device required).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== Flutter Seal Proof prep =="

if ! command -v flutter >/dev/null 2>&1; then
  echo "SKIP: flutter not in PATH" >&2
  exit 0
fi

cd "$ROOT/integrations/eye-tracking/flutter-runtime"
flutter test test/wallet_deep_link_test.dart test/proof_validator_bridge_test.dart

if curl -sf http://127.0.0.1:8787/health >/dev/null 2>&1; then
  echo "Validator: UP (http://127.0.0.1:8787)"
else
  echo "Validator: DOWN — run ./scripts/dev_stack.sh"
fi

cat <<'EOF'

Device run (when ready):
  cd integrations/eye-tracking/flutter-runtime
  flutter run \
    --dart-define=POP_VALIDATOR_URL=http://10.0.2.2:8787 \
    --dart-define=WALLET_APP_URL=http://10.0.2.2:5173

After Seal Proof, logcat should show WALLET_DEEP_LINK: http://10.0.2.2:5173?proofSession=…
EOF

echo ""
echo "PASS: flutter seal proof prep"
