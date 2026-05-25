#!/usr/bin/env bash
# Promote Supabase financial core from eye-earn-sparkle-archive into app/supabase/.
#
# Usage:
#   ./scripts/promote_supabase_financial_core.sh
#   ARCHIVE_ROOT=/path/to/eye-earn-sparkle-archive ./scripts/promote_supabase_financial_core.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_ROOT="${ARCHIVE_ROOT:-$HOME/Desktop/IVAULT/i-project-rescue/github-source-repos/eye-earn-sparkle-archive}"
DEST="$ROOT/app/supabase"

if [[ ! -d "$ARCHIVE_ROOT/supabase" ]]; then
  echo "Archive supabase dir not found: $ARCHIVE_ROOT/supabase" >&2
  exit 1
fi

echo "Promoting Supabase from: $ARCHIVE_ROOT"
echo "Destination: $DEST"

rm -rf "$DEST"
mkdir -p "$DEST/migrations" "$DEST/functions"

# Preserve i-project-only migrations (pop_* etc.) before overwrite.
PRESERVE_DIR="$(mktemp -d)"
if [[ -d "$ROOT/app/supabase/migrations" ]]; then
  for f in "$ROOT/app/supabase/migrations/"*pop_*.sql; do
    [[ -f "$f" ]] && cp "$f" "$PRESERVE_DIR/"
  done
fi

# Full migration chain — wallet ledger depends on profiles from early migrations.
cp "$ARCHIVE_ROOT/supabase/config.toml" "$DEST/config.toml"
cp "$ARCHIVE_ROOT/supabase/migrations/"*.sql "$DEST/migrations/"

if compgen -G "$PRESERVE_DIR/*.sql" > /dev/null; then
  cp "$PRESERVE_DIR/"*.sql "$DEST/migrations/"
fi
rmdir "$PRESERVE_DIR" 2>/dev/null || rm -rf "$PRESERVE_DIR"

# Financial edge functions + shared middleware (P0 slice).
for fn in issue-reward validate-attention; do
  if [[ -d "$ARCHIVE_ROOT/supabase/functions/$fn" ]]; then
    cp -R "$ARCHIVE_ROOT/supabase/functions/$fn" "$DEST/functions/"
  fi
done

if [[ -d "$ARCHIVE_ROOT/supabase/functions/_shared" ]]; then
  cp -R "$ARCHIVE_ROOT/supabase/functions/_shared" "$DEST/functions/"
fi

MIGRATION_COUNT="$(ls -1 "$DEST/migrations" | wc -l | tr -d ' ')"
FN_COUNT="$(find "$DEST/functions" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"

cat > "$DEST/README.md" <<EOF
# app/supabase — promoted financial core

**Promoted:** $(date -u +%Y-%m-%d)
**Source:** \`eye-earn-sparkle-archive\` @ \`$ARCHIVE_ROOT\`
**Script:** \`scripts/promote_supabase_financial_core.sh\`

## Contents

| Artifact | Count | Notes |
|----------|------:|-------|
| SQL migrations | $MIGRATION_COUNT | Full ordered chain (profiles → wallet ledger → rewards) |
| Edge functions | $FN_COUNT | \`issue-reward\`, \`validate-attention\`, \`_shared\` |

## Apply locally

\`\`\`bash
cd app/supabase
supabase start          # requires Supabase CLI
supabase db reset       # applies all migrations
supabase functions serve issue-reward validate-attention
\`\`\`

## Wiring to POP validator

1. Device seals proof → POST \`integrations/pop-core/validator\` (\`/v1/proof-packets/validate\`)
2. Validator returns pending hold
3. On approval, \`issue-reward\` / ledger RPCs settle via this Supabase stack

## Re-promote

When archive \`main\` changes:

\`\`\`bash
./scripts/promote_supabase_financial_core.sh
\`\`\`

Do **not** hand-edit promoted migrations — fix upstream in \`eye-earn-sparkle-archive\` and re-run.

## Currency note

Archive SQL uses \`vicoin\` / \`icoin\`. Demo app uses Tier-1 \`a/i/v/e/o\` labels per ADR-001 — map at integration boundary.
EOF

echo "Done: $MIGRATION_COUNT migrations, $FN_COUNT function dirs → $DEST"
