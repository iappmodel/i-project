# @pop-core/backend

Standalone TypeScript package for the P.O.P.S authority stack promoted in PR2A.

## Pipeline

```
PopsSignalBatch → PopsScoringService → PopsDecisionService → PopsJudgment
```

ProofPacketV0 review projection (PR2C):

```
ProofPacketV0 → projectProofPacketReview → updated ProofPacketV0
```

ProofPacketV0 review persistence boundary (PR3):

```
ProofPacketV0 → ProofReviewService.submitProofPacketForReview → ProofReviewRecord
```

ProofPacketV0 review state machine (PR3A):

```
pending → lifecycle event → ProofReviewStateMachine.transition → terminal / escalated / deferred pending
```

ProofPacketV0 ingest and batch mapping are in PR2B adapters. Review projection composes adapters + authority services. PR3 adds an in-memory, replaceable store boundary (`ProofReviewStore`) with `sessionId` as the canonical unique identity. PR3A adds lifecycle events and transition validation before records are saved.

See [`../docs/proof-review-state-machine.md`](../docs/proof-review-state-machine.md) for the canonical state machine.

## Public API

| Export | Role |
|--------|------|
| `PopsSignalBatch`, core enums | Domain types |
| `POPS_PROOF_THRESHOLDS`, `POPS_DEFAULT_SCORING_WEIGHTS` | Scoring/decision constants |
| `PopsScoringService` | Batch-weighted confidence + fraud scoring |
| `PopsDecisionService` | Threshold-based eligibility decisions |
| `projectProofPacketReview` | Authority-side review projection for `ProofPacketV0` |
| `ProofReviewStore`, `InMemoryProofReviewStore` | Replaceable review persistence boundary (PR3, in-memory only) |
| `ProofReviewService` | Submit packet for review and lookup stored records by `sessionId` / optional ids |
| `ProofReviewStateMachine`, lifecycle events | Canonical review transitions and settlement-eligibility gates (PR3A) |
| `resolvePopsVersionBundle`, `bundleToJudgmentVersionFields` | Judgment version metadata for `toJudgment()` |

## Out of scope (PR2A / PR3 / PR3A)

- HTTP routes, DB, Supabase
- Wallet, settlement, trust mutation
- Privacy receipts, replay service
- ProofPacketV0 adapter (PR2B)
- Durable review persistence (PR4+)
- Manual review resolution wiring (PR3A defines events only)

## Note on `PopsRewardDecision`

This package exports the **eligibility-layer** `PopsRewardDecision` from `types/pops-decisions.types.ts`. The preservation snapshot also defines a wallet-oriented reward decision type under `rewards/` — that layer is not promoted here.

## Commands

```bash
cd integrations/pop-core/backend
npm install
npm run typecheck
npm test
```

## Source

Selectively promoted from:

`integrations/old-source-preservation/ivault-eye-tracking/snapshot/services/api/src/pops/`

Preservation remains historical reference; do not bulk merge the 72-file tree.
