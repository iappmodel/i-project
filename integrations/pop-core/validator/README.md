# POP Validator Stub (P0)

Minimal HTTP service that accepts `ProofPacketV0` and runs the POP review + pending hold boundary (default) or full value flow (dev).

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness |
| `POST` | `/v1/proof-packets/validate` | Ingest proof packet |

### Request body

```json
{
  "packet": { "...": "ProofPacketV0" },
  "mode": "pending",
  "artifactId": "PP-000001"
}
```

- **`pending`** (default): review + pending hold only — production-shaped stub
- **`full`**: runs `runPopValueFlow` through wallet credit (golden path / dev)

## Run

```bash
cd integrations/pop-core/validator
npm install
npm test
POP_VALIDATOR_PORT=8787 npm start
```

## Flutter device path

Run the stub locally, then launch flutter-runtime with:

```bash
flutter run --dart-define=POP_VALIDATOR_URL=http://10.0.2.2:8787
```

(`10.0.2.2` is the Android emulator alias for host `localhost`.)

Sealed packets are POSTed automatically when `POP_VALIDATOR_URL` is set.

## Data

JSON-file persistence under `POP_VALIDATOR_DATA_DIR` (default `./data/validator`).

Supabase promotion is separate — see `app/supabase/README.md`.
