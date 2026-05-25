# app/supabase — promoted financial core

**Promoted:** 2026-05-25
**Source:** `eye-earn-sparkle-archive` @ `/Users/2023macbookpro/Desktop/IVAULT/i-project-rescue/github-source-repos/eye-earn-sparkle-archive`
**Script:** `scripts/promote_supabase_financial_core.sh`

## Contents

| Artifact | Count | Notes |
|----------|------:|-------|
| SQL migrations | 103 | Full ordered chain (profiles → wallet ledger → rewards) |
| Edge functions | 3 | `issue-reward`, `validate-attention`, `_shared` |

## Apply locally

```bash
# From repo root (Docker Desktop must show "Engine running"):
./scripts/start_local_stack.sh --reset
```

Or manually:

```bash
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
cd app/supabase
supabase start
supabase db reset   # migrations + seed.sql demo user
```

Demo user seeded: `00000000-0000-4000-8000-000000000001` (`demo-user-001@i.local`)

```bash
cd app/supabase
supabase start          # requires Supabase CLI
supabase db reset       # applies all migrations
supabase functions serve issue-reward validate-attention
```

## Wiring to POP validator

1. Device seals proof → POST `integrations/pop-core/validator` (`/v1/proof-packets/validate`)
2. Validator upserts `pop_pending_holds` when Supabase env is configured
3. `POST /v1/pending-holds/:sessionId/settle` → `settle_pop_pending_hold` → `wallet_ledger`

### i-project migration (not in archive)

| File | Purpose |
|------|---------|
| `20260525220000_pop_pending_holds.sql` | Pending holds table + settlement RPC |

Preserved when re-running `./scripts/promote_supabase_financial_core.sh`.

## Re-promote

When archive `main` changes:

```bash
./scripts/promote_supabase_financial_core.sh
```

Do **not** hand-edit promoted migrations — fix upstream in `eye-earn-sparkle-archive` and re-run.

## Currency note

Archive SQL uses `vicoin` / `icoin`. Demo app uses Tier-1 `a/i/v/e/o` labels per ADR-001 — map at integration boundary.
