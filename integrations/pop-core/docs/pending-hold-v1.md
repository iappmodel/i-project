# Pending Hold v1 (PR5)

Settlement boundary that creates a **pending hold record** from a `ProofReviewRecord` after proof review approval — without releasing money, mutating balances, or writing to a ledger.

## Pipeline

```
ProofReviewRecord → createPendingHoldFromReview → PendingHoldRecord
```

Gate:

```typescript
ProofReviewStateMachine.isSettlementEligible(record.status)
// true only for "approved" | "partial"
```

## Record shape

| Field | PR5 value | Notes |
|-------|-----------|-------|
| `sessionId` | from review | Canonical identity (same as review record) |
| `amount` | computed integer | PR6A amount policy (`SETTLEMENT_AMOUNT_POLICY_V1`) |
| `amountBreakdown` | replay snapshot | Policy version, multipliers, and audit fields |
| `status` | `"pending"` | Hold lifecycle starts here |
| `releaseStatus` | `"not_released"` initially | Release lifecycle — see [`pending-hold-release-state-machine.md`](./pending-hold-release-state-machine.md) (PR7) |
| `reviewAudit` | snapshot | Lightweight link back to review; not full record embed |

## Release lifecycle (PR7)

PR7 defines the canonical release state machine for `releaseStatus`:

| Status | Terminal | Meaning |
|--------|----------|---------|
| `not_released` | No | Initial state after hold creation |
| `release_ready` | No | Pre-release gates passed; awaiting execution (PR8+) |
| `release_blocked` | No | Policy/risk block; recoverable |
| `released` | Yes | Release completed (state only in PR7) |
| `cancelled` | Yes | Hold voided before release |

See [`pending-hold-release-state-machine.md`](./pending-hold-release-state-machine.md) for events, transitions, and eligibility gates.

Pure projection (no store writes):

```typescript
import {
  PendingHoldReleaseStateMachine,
  projectPendingHoldReleaseTransition,
  releaseApprovedEvent
} from "@pop-core/backend";

const state = {
  releaseStatus: PendingHoldReleaseStateMachine.initialReleaseStatus(),
  releaseLifecycleEvents: []
};

const ready = projectPendingHoldReleaseTransition(
  state,
  hold,
  releaseApprovedEvent(hold.sessionId)
);
```

## Outcomes

`createPendingHoldFromReview(record, options?)` returns:

| `outcome` | When |
|-----------|------|
| `created` | Settlement-eligible review; new hold saved |
| `existing` | Hold already exists for `sessionId` (idempotent recall) |
| `skipped` | Non-eligible review or `record.status !== record.review.status` |

Skip reasons: `review_not_settlement_eligible`, `review_status_mismatch`, `offer_settlement_terms_missing`, `settlement_amount_zero`.

## Settlement eligibility

| Review status | Creates hold? |
|---------------|---------------|
| `approved` | Yes |
| `partial` | Yes |
| `pending` | No |
| `rejected` | No |
| `escalated` | No |

Do **not** confuse this with decision-layer `HELD_FOR_REVIEW` (maps to review `escalated`). A pending **payout hold** is a settlement artifact under `settlement/`, not a review escalation.

## Store

`PendingHoldStore` with `sessionId` as the sole index:

| Implementation | PR | Notes |
|----------------|-----|-------|
| `InMemoryPendingHoldStore` | PR5 | Default in-memory adapter |
| `JsonFilePendingHoldStore` | PR6B | Durable JSON file adapter |

See [`pending-hold-persistence-v1.md`](./pending-hold-persistence-v1.md) for on-disk layout, write semantics, and amount consistency validation on read.

## Usage

```typescript
import {
  ProofReviewService,
  createPendingHoldFromReview,
  InMemoryPendingHoldStore
} from "@pop-core/backend";

const reviewService = new ProofReviewService(store);
const holdStore = new InMemoryPendingHoldStore();

const record = reviewService.submitProofPacketForReview(packet);
const result = createPendingHoldFromReview(record, { store: holdStore });

if (result.outcome === "created") {
  // result.hold.status === "pending"
  // result.hold.releaseStatus === "not_released"
  // result.hold.amount === computed iCoin minor units (PR6A)
}
```

See [`settlement-amount-v1.md`](./settlement-amount-v1.md) for amount formula and breakdown fields.

## Out of scope (PR5)

- Release, payout, or `releaseStatus` mutation
- Available balance / ledger / wallet writes
- `settlementAmount` write-back to review records
- Trust mutation
- Supabase, Postgres (JSON hold persistence added in PR6B — see [`pending-hold-persistence-v1.md`](./pending-hold-persistence-v1.md))
- HTTP routes
- Auto-invoking hold creation inside `ProofReviewService`
- Flutter runtime changes

## Future PRs

| PR | Addition |
|----|----------|
| PR6A | Amount policy populates `amount` and `amountBreakdown` — see [`settlement-amount-v1.md`](./settlement-amount-v1.md) |
| PR6B | Durable hold persistence — see [`pending-hold-persistence-v1.md`](./pending-hold-persistence-v1.md) |
| PR7 | Release state machine — see [`pending-hold-release-state-machine.md`](./pending-hold-release-state-machine.md) |
| PR8+ | Release execution, ledger writes |

See [`proof-review-state-machine.md`](./proof-review-state-machine.md) for review settlement eligibility.
