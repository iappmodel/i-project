#!/usr/bin/env bash
# Promote Stripe edge functions from eye-earn-sparkle-archive (no secrets required).
#
# Usage:
#   ./scripts/promote_stripe_functions.sh
#   ARCHIVE_ROOT=/path/to/eye-earn-sparkle-archive ./scripts/promote_stripe_functions.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_ROOT="${ARCHIVE_ROOT:-$HOME/Desktop/IVAULT/DEMOS:REPOS/eye-earn-sparkle-archive}"
if [[ ! -d "$ARCHIVE_ROOT/supabase/functions" ]]; then
  ARCHIVE_ROOT="$HOME/Desktop/IVAULT/i-project-rescue/github-source-repos/eye-earn-sparkle-archive"
fi
DEST="$ROOT/app/supabase/functions"

if [[ ! -d "$ARCHIVE_ROOT/supabase/functions" ]]; then
  echo "Archive functions dir not found under: $ARCHIVE_ROOT" >&2
  exit 1
fi

echo "Promoting Stripe functions from: $ARCHIVE_ROOT"
mkdir -p "$DEST"

for fn in stripe-webhook create-checkout customer-portal request-payout; do
  src="$ARCHIVE_ROOT/supabase/functions/$fn"
  if [[ -d "$src" ]]; then
    rm -rf "$DEST/$fn"
    cp -R "$src" "$DEST/$fn"
    echo "  + $fn"
  else
    echo "  skip missing: $fn" >&2
  fi
done

if [[ -d "$ARCHIVE_ROOT/supabase/functions/_shared" ]]; then
  cp -R "$ARCHIVE_ROOT/supabase/functions/_shared" "$DEST/"
  echo "  + _shared"
fi

cat > "$DEST/STRIPE_PROMOTED.md" <<EOF
# Stripe edge functions (promoted)

**Promoted:** $(date -u +%Y-%m-%d)
**Source:** \`eye-earn-sparkle-archive\` @ \`$ARCHIVE_ROOT\`

Functions: \`stripe-webhook\`, \`create-checkout\`, \`customer-portal\`, \`request-payout\`

## Deploy (owner keys required)

\`\`\`bash
# Set secrets in Supabase project or local stack
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_...

./scripts/smoke_stripe_webhook.sh
\`\`\`

See \`docs/technical/STRIPE_PHASE2.md\`.
EOF

echo ""
echo "Done. See $DEST/STRIPE_PROMOTED.md"
