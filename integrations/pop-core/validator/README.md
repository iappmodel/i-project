# POP Validator Stub (P0 → P1)

Minimal HTTP service that accepts `ProofPacketV0`, runs POP review + pending hold, and optionally persists to Supabase.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness + Supabase config status |
| `POST` | `/v1/proof-packets/validate` | Ingest proof packet |
| `GET` | `/v1/pending-holds/:sessionId` | Read hold row (Supabase required) |
| `POST` | `/v1/pending-holds/:sessionId/settle` | Release hold → `wallet_ledger` |

### Validate request

```json
{
  "packet": { "...": "ProofPacketV0" },
  "mode": "pending",
  "artifactId": "PP-000001"
}
```

- **`pending`** (default): review + pending hold
- **`full`**: runs `runPopValueFlow` through in-memory wallet credit (dev)

When `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, pending holds are inserted into `pop_pending_holds`.

**Without Supabase/Docker:** holds are stored in JSON files under `POP_VALIDATOR_DATA_DIR` and served via the same list/get endpoints (`source: "local"`).

### Settle request (Supabase)

```json
{ "userId": "00000000-0000-4000-8000-000000000001" }
```

Calls RPC `settle_pop_pending_hold` → `ledger_append` (idempotent on `pop_hold_{sessionId}`).

### Dev settle (no Supabase)

```bash
curl -X POST http://127.0.0.1:8787/v1/pending-holds/SESSION_ID/settle-demo
```

Or `POST .../settle` with empty body when Supabase is disabled — uses local-json demo settlement.

## Smoke test

```bash
./scripts/smoke_pop_wallet_loop.sh
```

```bash
cd integrations/pop-core/validator
npm install
npm test

# Local JSON only
npm start

# With Supabase (after app/supabase db reset)
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=...
npm start
```

## Supabase migration

Apply `app/supabase/migrations/20260525220000_pop_pending_holds.sql` via:

```bash
cd app/supabase && supabase db reset
```

## Flutter device path

```bash
flutter run --dart-define=POP_VALIDATOR_URL=http://10.0.2.2:8787
```

## End-to-end smoke

1. `supabase start && supabase db reset` in `app/supabase`
2. `npm start` in validator with Supabase env
3. Flutter Seal Proof → validate response includes `supabase.outcome: "created"`
4. `POST /v1/pending-holds/{sessionId}/settle` with test user UUID → ledger credit
