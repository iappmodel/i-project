# POPS backend reference

## Canonical authority (PR2A)

**Package:** [`../backend/`](../backend/) — `@pop-core/backend`

| Path | Role |
|------|------|
| `types/pops.types.ts` | `PopsSession`, `PopsSignalBatch` |
| `scoring/pops-scoring.service.ts` | Backend scoring authority |
| `scoring/pops.constants.ts` | Proof thresholds + scoring weights |
| `decisions/pops-decision.service.ts` | Eligibility decisions from scoring output |
| `decisions/versioning/` | Judgment version metadata for `toJudgment()` |

Run tests: `cd integrations/pop-core/backend && npm test`

## Historical preservation pointer

PR2A promotes a selective slice only. Full preservation tree remains at:

`integrations/old-source-preservation/ivault-eye-tracking/snapshot/services/api/src/pops/`

Do **not** bulk merge the preservation tree.

## Deferred (not in PR2A)

- HTTP ingest routes (`../server/pops/routes/pops-event.routes.ts`)
- ProofPacketV0 → `PopsSignalBatch` adapter — see [`../mappings/pops-signal-batch-to-v0.md`](../mappings/pops-signal-batch-to-v0.md) (PR2B)
- Wallet, settlement, Supabase, replay service

## PR1 boundary (still applies)

- Mapping table: [`../mappings/pops-signal-batch-to-v0.md`](../mappings/pops-signal-batch-to-v0.md)
- No wallet hooks, no DB migrations in PR2A
