# POP durable settlement (v2)

Production validators should treat **Supabase** as the authoritative store for pending holds and `pops_sessions`, not JSON files under `POP_VALIDATOR_DATA_DIR`.

## Modes

| `POP_SETTLEMENT_PRIMARY` | Hold authority | Local JSON |
|--------------------------|----------------|------------|
| *(unset)* / `local-json` | File-backed `JsonFilePendingHoldStore` | Required for validate path |
| `supabase` | `pop_pending_holds` upsert on validate | Optional mirror |

When `POP_SETTLEMENT_PRIMARY=supabase`:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are **required** (validator fails to start otherwise).
- Hold upsert failures **fail** the validate request (no silent skip).
- `GET /health` reports `settlementPrimary: "supabase-primary"`.
- Validate responses include `settlementStore` and `supabase.storeMode`.

## Optional: skip local hold files

```bash
POP_SETTLEMENT_PRIMARY=supabase
POP_SETTLEMENT_SKIP_LOCAL_JSON=true
```

Uses `InMemoryPendingHoldStore` in-process only; holds survive via Supabase. Proof reviews still use `JsonFileProofReviewStore` unless a future slice adds Supabase review storage.

## Reads / settle

With Supabase configured, list/get/settle already prefer Supabase (`hold-query.ts`). Primary mode makes **writes** durable and mandatory on validate.

## Trust tiers

Tiered `release_eligible_at` and t2-only server auto-settle are unchanged; see `docs/POP_TRUST_TIERS_V2.md`.

## Smoke

```bash
./scripts/smoke_pop_ship_gate.sh
```

Validator unit tests cover `settlement-store-mode` and `pending-hold-persist`.
