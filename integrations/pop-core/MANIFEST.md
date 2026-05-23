# pop-core manifest

**PR:** `pr1/pop-core-pp-000001` → `pr2a/pop-authority-promotion`  
**Goal (PR1):** Generate PP-000001 — first canonical proof packet artifact.  
**Goal (PR2A):** Promote minimum POPS authority stack (types, scoring, decisions).

## Source of truth

| Concern | Canonical location | Notes |
|---------|-------------------|-------|
| Proof Packet v0 contract | `integrations/pop-core/contracts/proof-packet-v0/` | Dart package `pop_core` + JSON schema |
| Runtime signal generation | `integrations/eye-tracking/flutter-runtime/` | Package `eye_tracking_app` — emits proof |
| POPS backend authority | `integrations/pop-core/backend/` | TypeScript `@pop-core/backend` — scoring + decision |
| POPS preservation reference | `integrations/old-source-preservation/ivault-eye-tracking/snapshot/services/api/src/pops/` | **Do not bulk merge** |

## Promotion rules (PR1)

1. Move `ProofPacketV0` types into `pop_core`; flutter-runtime re-exports via path dependency.
2. No wallet, settlement, Supabase, or backend ingest.
3. No scoring migration from preservation snapshot.
4. Mapping doc only for `PopsSignalBatch` → v0.

## Promotion rules (PR2A)

1. Selective promotion of types, `PopsScoringService`, `PopsDecisionService`, constants, and version resolver slice into `backend/`.
2. No HTTP, DB, Supabase, wallet, trust mutation, settlement, or replay service.
3. No ProofPacketV0 adapter (PR2B).
4. No bulk merge of the 72-file preservation `pops/` tree.

## Out of scope

- Evidence vault
- Wallet pending UX
- POPS API ingestion (PR2B+)
- Bulk merge of backend or Flutter `lib/pops/`
- Review persistence (PR2C)
