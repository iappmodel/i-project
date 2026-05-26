#!/usr/bin/env bash
# Initialize Capacitor native shells for app/ (Android + iOS).
#
# Usage:
#   ./scripts/setup_capacitor_shell.sh           # sync web build only
#   ./scripts/setup_capacitor_shell.sh --add     # also cap add android/ios if missing

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"
ADD_NATIVE=false
if [[ "${1:-}" == "--add" ]]; then
  ADD_NATIVE=true
fi

cd "$APP"

if [[ ! -f capacitor.config.ts ]]; then
  echo "FAIL: app/capacitor.config.ts missing" >&2
  exit 1
fi

echo "== Capacitor shell setup =="
npm run build

if [[ "$ADD_NATIVE" == true ]]; then
  if [[ ! -d android ]]; then
    echo "Adding Android platform..."
    npx cap add android
  fi
  if [[ ! -d ios ]]; then
    echo "Adding iOS platform..."
    npx cap add ios
  fi
fi

if [[ -d android ]] || [[ -d ios ]]; then
  npx cap sync
else
  echo "Skip cap sync — no native platforms yet (use --add)"
fi

cat <<EOF

Done. Native dirs (gitignored): app/android app/ios

Dev with live Vite (emulator → host):
  CAPACITOR_SERVER_URL=http://10.0.2.2:5173 npx cap run android

Or open IDE:
  cd app && npx cap open android

EOF
