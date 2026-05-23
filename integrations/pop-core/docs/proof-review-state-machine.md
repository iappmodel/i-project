# Proof Review State Machine (PR3A)

Canonical lifecycle for `ProofReviewStatus` on `ProofPacketV0.review.status`. Wire statuses are unchanged from schema v0; PR3A adds explicit lifecycle events and transition guards.

## States

| Status | Terminal | Settlement-eligible (future) | Meaning |
|--------|----------|------------------------------|---------|
| `pending` | No | No | Emitted packet awaiting authority, or authority-deferred |
| `approved` | Yes | Yes | Full eligibility confirmed |
| `partial` | Yes | Yes | Partial eligibility confirmed |
| `rejected` | Yes | No | Reward denied |
| `escalated` | No | No | Held for manual / secondary review |

`sessionId` remains the canonical record identity (PR3).

## Lifecycle events

| Event | From | To | Producer |
|-------|------|-----|----------|
| `PACKET_EMITTED` | — | `pending` | Runtime emission (implicit initial state) |
| `AUTHORITY_REVIEW_COMPLETED` | `pending` | `approved` / `partial` / `rejected` / `escalated` | PR2C projection via `ProofReviewService` |
| `AUTHORITY_REVIEW_DEFERRED` | `pending` | `pending` | PR2C when eligibility is `ELIGIBLE_PENDING` |
| `MANUAL_REVIEW_COMPLETED` | `escalated` | `approved` / `partial` / `rejected` | Future human reviewer (API defined only) |

`ELIGIBLE_PENDING` **must** use `AUTHORITY_REVIEW_DEFERRED`, not `AUTHORITY_REVIEW_COMPLETED`.

## Invalid transitions

- Any event from terminal states (`approved`, `partial`, `rejected`)
- `MANUAL_REVIEW_COMPLETED` from `pending`
- `AUTHORITY_REVIEW_COMPLETED` with target `pending` (use `AUTHORITY_REVIEW_DEFERRED`)
- Authority events from `escalated`
- Direct status assignment without lifecycle event + `ProofReviewStateMachine.transition`

## Integration

```
ProofPacketV0 (review.status = pending)
  → ProofReviewService.submitProofPacketForReview
  → projectProofPacketReview (PR2C, unchanged)
  → lifecycleEventFromDecision
  → ProofReviewStateMachine.transition("pending", event)
  → ProofReviewRecord + lifecycleEvents
  → ProofReviewStore.save (PR3, in-memory)
```

Runtime packets **must** arrive with `review.status = "pending"`. Non-pending submissions throw `ProofReviewNonPendingSubmissionError`.

## Future settlement dependency

Settlement (out of scope for PR3A) must gate on:

```typescript
ProofReviewStateMachine.isSettlementEligible(record.status)
// true only for "approved" | "partial"
```

Until then, `review.settlementAmount` remains `null`. Pending and escalated records block settlement; rejected records permanently block payout.

## API exports

- `ProofReviewStateMachine` — transition table, classifiers
- `ProofReviewInvalidTransitionError`
- `lifecycleEventFromDecision`
- `PROOF_REVIEW_LIFECYCLE_EVENT`, lifecycle event types

See [`../backend/README.md`](../backend/README.md) for package commands.
