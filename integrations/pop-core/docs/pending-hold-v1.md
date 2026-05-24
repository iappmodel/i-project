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
| `releaseStatus` | `"not_released"` | Release is PR7+ |
| `reviewAudit` | snapshot | Lightweight link back to review; not full record embed |

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

PR5 provides `PendingHoldStore` with `InMemoryPendingHoldStore` only. `sessionId` is the sole index. No JSON/DB persistence in PR5.

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
- Supabase, Postgres, JSON hold persistence
- HTTP routes
- Auto-invoking hold creation inside `ProofReviewService`
- Flutter runtime changes

## Future PRs

| PR | Addition |
|----|----------|
| PR6A | Amount policy populates `amount` and `amountBreakdown` — see [`settlement-amount-v1.md`](./settlement-amount-v1.md) |
| PR7+ | Release lifecycle (`releaseStatus` → `released`) |
| PR8+ | Durable hold persistence, ledger writes |

See [`proof-review-state-machine.md`](./proof-review-state-machine.md) for review settlement eligibility.
