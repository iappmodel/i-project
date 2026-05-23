# pop-core manifest

**PR:** `pr1/pop-core-pp-000001`  
**Goal:** Generate PP-000001 — first canonical proof packet artifact.

## Source of truth

| Concern | Canonical location | Notes |
|---------|-------------------|-------|
| Proof Packet v0 contract | `integrations/pop-core/contracts/proof-packet-v0/` | Dart package `pop_core` + JSON schema |
| Runtime signal generation | `integrations/eye-tracking/flutter-runtime/` | Package `eye_tracking_app` — emits proof |
| POPS backend reference | `integrations/old-source-preservation/ivault-eye-tracking/snapshot/services/api/src/pops/` | **Do not bulk merge** |

## Promotion rules (PR1)

1. Move `ProofPacketV0` types into `pop_core`; flutter-runtime re-exports via path dependency.
2. No wallet, settlement, Supabase, or backend ingest.
3. No scoring migration from preservation snapshot.
4. Mapping doc only for `PopsSignalBatch` → v0.

## Out of scope

- Evidence vault
- Wallet pending UX
- POPS API ingestion
- Bulk merge of backend or Flutter `lib/pops/`
