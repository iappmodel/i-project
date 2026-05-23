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

ProofPacketV0 durable review persistence (PR4):

```
ProofReviewRecord → JsonFileProofReviewStore → records/{sessionId}.json + _indexes.json
```

POP pending hold boundary (PR5):

```
ProofReviewRecord → createPendingHoldFromReview → PendingHoldRecord (in-memory)
```

ProofPacketV0 ingest and batch mapping are in PR2B adapters. Review projection composes adapters + authority services. PR3 adds a replaceable store boundary (`ProofReviewStore`) with `sessionId` as the canonical unique identity. PR3A adds lifecycle events and transition validation before records are saved. PR4 adds a zero-dependency JSON file adapter with atomic writes. PR5 adds settlement-eligibility gating and in-memory pending hold creation without money movement.

See [`../docs/proof-review-state-machine.md`](../docs/proof-review-state-machine.md) for the canonical state machine.
See [`../docs/proof-review-persistence-v1.md`](../docs/proof-review-persistence-v1.md) for on-disk layout and future Postgres mapping.
See [`../docs/pending-hold-v1.md`](../docs/pending-hold-v1.md) for pending hold contract (PR5).

## Public API

| Export | Role |
|--------|------|
| `PopsSignalBatch`, core enums | Domain types |
| `POPS_PROOF_THRESHOLDS`, `POPS_DEFAULT_SCORING_WEIGHTS` | Scoring/decision constants |
| `PopsScoringService` | Batch-weighted confidence + fraud scoring |
| `PopsDecisionService` | Threshold-based eligibility decisions |
| `projectProofPacketReview` | Authority-side review projection for `ProofPacketV0` |
| `ProofReviewStore`, `InMemoryProofReviewStore` | Replaceable review persistence boundary (PR3) |
| `JsonFileProofReviewStore` | Durable JSON file persistence adapter (PR4) |
| `toStoredRecord`, `fromStoredRecord` | Versioned record serialization for disk/DB (PR4) |
| `ProofReviewService` | Submit packet for review and lookup stored records by `sessionId` / optional ids |
| `ProofReviewStateMachine`, lifecycle events | Canonical review transitions and settlement-eligibility gates (PR3A) |
| `createPendingHoldFromReview`, `PendingHoldStore` | Settlement-eligible review → pending hold record (PR5) |
| `resolvePopsVersionBundle`, `bundleToJudgmentVersionFields` | Judgment version metadata for `toJudgment()` |

### PR4 durable store usage

```typescript
import {
  JsonFileProofReviewStore,
  ProofReviewService
} from "@pop-core/backend";

const store = new JsonFileProofReviewStore({ baseDir: "./data/proof-reviews" });
const service = new ProofReviewService(store);

const record = service.submitProofPacketForReview(packet, {
  artifactId: "PP-000001",
  submittedAt: new Date().toISOString()
});
```

### PR5 pending hold usage

```typescript
import {
  ProofReviewService,
  createPendingHoldFromReview,
  InMemoryPendingHoldStore
} from "@pop-core/backend";

const reviewService = new ProofReviewService(reviewStore);
const holdStore = new InMemoryPendingHoldStore();

const record = reviewService.submitProofPacketForReview(packet);
const result = createPendingHoldFromReview(record, { store: holdStore });
// result.outcome: "created" | "existing" | "skipped"
```

## Out of scope (PR2A / PR3 / PR3A / PR4 / PR5)

- HTTP routes, Supabase client, Postgres migrations
- Wallet payout, available balance mutation, ledger writes, trust mutation
- Hold release, amount policy (PR6+), durable hold persistence
- Privacy receipts, replay service
- ProofPacketV0 adapter (PR2B)
- Async review store interface
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
