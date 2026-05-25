# Pending Hold Release State Machine (PR7)

Canonical lifecycle for `PendingHoldReleaseStatus` on `PendingHoldRecord`. PR7 defines legal transitions and pre-release eligibility gates only — no release execution, ledger writes, wallet mutation, or store updates.

## States

| Status | Terminal | Release-ready | Meaning |
|--------|----------|---------------|---------|
| `not_released` | No | No | Initial state after hold creation (PR5/6B) |
| `release_ready` | No | Yes | Pre-release gates passed; cleared for future execution (PR8+) |
| `release_blocked` | No | No | Explicit policy/risk block; recoverable |
| `released` | **Yes** | No | Release execution completed (state only in PR7) |
| `cancelled` | **Yes** | No | Hold voided before release completes |

`PendingHoldStatus` remains `"pending"` in PR7 (hold existence axis). Release lifecycle is tracked on `releaseStatus` separately.

## Lifecycle events

| Event | Valid transition? | Producer |
|-------|-------------------|----------|
| `HOLD_CREATED` | **No** — implicit initial state only | `createPendingHoldFromReview` sets `not_released` |
| `RELEASE_APPROVED` | Yes | Future release orchestrator after eligibility passes |
| `RELEASE_COMPLETED` | Yes | Future execution layer (PR8+); requires `executionRef: string` |
| `RELEASE_CANCELLED` | Yes | Future void/cancel path; requires `cancelReason: string` |
| `RELEASE_BLOCKED` | Yes | Future policy/risk gate; requires `blockReason: string` |

`ReleaseCompletedEvent.executionRef` is **required**. A completed release without an execution reference is not auditable.

## Transition table

| Event | From | To |
|-------|------|-----|
| `HOLD_CREATED` | — | `not_released` (implicit; not a transition call) |
| `RELEASE_APPROVED` | `not_released` | `release_ready` |
| `RELEASE_APPROVED` | `release_blocked` | `release_ready` |
| `RELEASE_BLOCKED` | `not_released` | `release_blocked` |
| `RELEASE_BLOCKED` | `release_ready` | `release_blocked` |
| `RELEASE_CANCELLED` | `not_released` | `cancelled` |
| `RELEASE_CANCELLED` | `release_ready` | `cancelled` |
| `RELEASE_CANCELLED` | `release_blocked` | `cancelled` |
| `RELEASE_COMPLETED` | `release_ready` | `released` |

## Invalid transitions

- Any event from terminal states (`released`, `cancelled`)
- `HOLD_CREATED` as a transition event
- `RELEASE_COMPLETED` from `not_released` or `release_blocked`
- `RELEASE_COMPLETED` without a non-empty `executionRef`
- `RELEASE_APPROVED` from `release_ready`
- `RELEASE_BLOCKED` from `release_blocked`
- Direct `releaseStatus` assignment without `PendingHoldReleaseStateMachine.transition`

## Release eligibility gates

Required only for `RELEASE_APPROVED`:

| Gate | Rule |
|------|------|
| Amount present | `amount !== null` |
| Amount positive | `amount >= 1` |
| Breakdown present | `amountBreakdown !== null` |
| Amount consistency | `amount === amountBreakdown.computedAmountMinor` |
| Hold status | `hold.status === "pending"` |
| Offer alignment | `amountBreakdown.offerId === hold.offerId` |

Eligibility failures throw `PendingHoldReleaseEligibilityError` (not invalid-transition).

## Integration

```
PendingHoldRecord (releaseStatus = not_released)
  → PendingHoldReleaseStateMachine.transition / projectPendingHoldReleaseTransition
  → PendingHoldReleaseState { releaseStatus, releaseLifecycleEvents }
```

PR7 projection is pure — it does not mutate `PendingHoldRecord` or write to `PendingHoldStore`.

Hold creation (unchanged):

```
ProofReviewRecord → createPendingHoldFromReview → PendingHoldRecord
  releaseStatus: "not_released"
```

## API exports

- `PendingHoldReleaseStateMachine` — transition table, classifiers
- `PendingHoldReleaseInvalidTransitionError`, `PendingHoldReleaseEligibilityError`
- `isReleaseEligible`, `assertReleaseEligible`, `isReleaseAmountConsistent`
- `projectPendingHoldReleaseTransition`, release event builders
- `PENDING_HOLD_RELEASE_LIFECYCLE_EVENT`, lifecycle event types

See [`../backend/README.md`](../backend/README.md) for package commands.
See [`pending-hold-v1.md`](./pending-hold-v1.md) for hold creation contract.
See [`pending-hold-persistence-v1.md`](./pending-hold-persistence-v1.md) for PR6B persistence (release lifecycle persistence deferred).
