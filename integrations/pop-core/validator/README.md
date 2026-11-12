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

When `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, pending holds are inserted into `pop_pending_holds` and `pops_sessions` is upserted on validate.

### Server settlement policy (env)

| Variable | Default | Purpose |
|----------|---------|---------|
| `POP_RELEASE_DELAY_SECONDS` | `0` | Legacy t0 fallback when `POP_TRUST_T0_DELAY_SECONDS` unset |
| `POP_TRUST_T0_DELAY_SECONDS` | `3600` | Release delay for `t0_new` |
| `POP_TRUST_T1_DELAY_SECONDS` | `900` | Release delay for `t1_established` |
| `POP_TRUST_T2_DELAY_SECONDS` | `0` | Release delay for `t2_trusted` |
| `POP_TRUST_T1_ALLOWLIST` | — | Comma-separated `localUserRef` → t1 |
| `POP_TRUST_T2_ALLOWLIST` | — | Comma-separated `localUserRef` → t2 (auto-settle eligible) |
| `POP_DEFAULT_TRUST_TIER` | — | Force tier for all users (demo) |
| `POP_SERVER_AUTO_SETTLE` | `false` | When `true` + Supabase, validator may call `settle_pop_pending_hold` after release window |
| `POP_APPEAL_EXPIRY_DAYS` | `7` | Appeal window for `pending`/`escalated` reviews (appeal hold, not auto-pay) |

Client `VITE_AUTO_SETTLE` is demo-only; production settlement is server-gated.

**Without Supabase/Docker:** holds are stored in JSON files under `POP_VALIDATOR_DATA_DIR` and served via the same list/get endpoints (`source: "local"`).

### Settle request (Supabase)

Ledger settlement is **off by default**. To use it on a local stack:

- set `POP_LEDGER_SETTLE_ENABLED=true` on the validator;
- send `Authorization: Bearer <Supabase access token>` on both the validate request and the settle request.

The validator takes the user from the verified token. A `userId` in the body is optional and must match the
token's user. The hold must have been created by a validate request carrying the same user's token; a hold
created without a token is bound to no one and cannot be settled to the ledger. Someone else's hold and a
missing hold both return `404 hold_not_found`.

| Response | Meaning |
|----------|---------|
| `403 ledger_settle_disabled` | `POP_LEDGER_SETTLE_ENABLED` is not `true` |
| `401 auth_required` / `invalid_token` | no usable bearer token |
| `403 user_mismatch` | body `userId` differs from the token's user |
| `409 hold_not_bound_to_user` | the hold was created without an authenticated user |
| `404 hold_not_found` | no such hold, or it belongs to another user |

Calls RPC `settle_pop_pending_hold` → `ledger_append` (idempotent on `pop_hold_{sessionId}`). The rules are in
`src/settle-authority.ts`, tested in `tests/settle-authority.test.ts`.

### Dev settle (no Supabase)

```bash
curl -X POST http://127.0.0.1:8787/v1/pending-holds/SESSION_ID/settle-demo
```

Or `POST .../settle` with empty body when Supabase is disabled — uses local-json demo settlement.

Demo settlement writes local JSON only. It is refused when Supabase is configured, and from any address that
is not the local machine unless `POP_VALIDATOR_DEMO_SETTLE_ALLOW_REMOTE=true` (for a container network).
`POP_VALIDATOR_ALLOW_DEMO_SETTLE=false` turns it off.

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

Apply `app/supabase/migrations/20260525220000_pop_pending_holds.sql` and `20260602120000_pop_settlement_v2.sql` via:

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
4. With `POP_LEDGER_SETTLE_ENABLED=true`: `POST /v1/pending-holds/{sessionId}/settle` with the test user's bearer token → ledger credit
