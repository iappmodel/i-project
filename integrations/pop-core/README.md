# integrations/pop-core

POPS + Proof Packet integration hub for `i_project_migration_archive`.

## Role

| Layer | Authority path | PR1 scope |
|-------|----------------|-----------|
| **Proof contract** | `contracts/proof-packet-v0/` | Canonical `ProofPacketV0` types + JSON schema |
| **Runtime signals** | `integrations/eye-tracking/flutter-runtime/` | Session collector + emitter (no bulk merge) |
| **POPS backend** | `integrations/old-source-preservation/.../services/api/src/pops/` | Reference only — no ingest in PR1 |

## Deliverable PP-000001

Golden fixture: [`fixtures/PP-000001.json`](fixtures/PP-000001.json)

- `packetVersion`: `"0"`
- `review.status`: `"pending"`
- No wallet, settlement, or backend calls

## Related docs

- [`MANIFEST.md`](MANIFEST.md) — source-of-truth pointers
- [`emission/EMISSION_SEQUENCE.md`](emission/EMISSION_SEQUENCE.md) — session-end sequence
- [`acceptance/PP-000001_ACCEPTANCE.md`](acceptance/PP-000001_ACCEPTANCE.md) — PR1 checklist
