# Release Execution Boundary (PR8)

Pure internal release execution layer that orchestrates PR7 release lifecycle transitions and persists auditable `ReleaseExecutionRecord` artifacts — without wallet mutation, ledger writes, payout, or hold store updates.

## Purpose

After PR7 defines legal release state transitions and eligibility gates, PR8 adds the first **execution orchestrator** that:

1. Receives a `PendingHoldRecord`
2. Verifies release eligibility
3. Projects `RELEASE_APPROVED` (`not_released` → `release_ready`)
4. Creates a `ReleaseExecutionRecord` with deterministic `executionRef`
5. Projects `RELEASE_COMPLETED` (`release_ready` → `released`)
6. Returns terminal `released` state + execution record

PR8 does **not** mutate `PendingHoldRecord`, `PendingHoldStore`, wallet balances, or ledgers.

## Pipeline

```
PendingHoldRecord
  → executePendingHoldRelease
  → ReleaseExecutionRecord (in-memory store)
  → PendingHoldReleaseState (releaseStatus: released)
```

## ReleaseExecutionRecord

| Field | Type | Notes |
|-------|------|-------|
| `boundaryVersion` | `"RELEASE_EXECUTION_BOUNDARY_V1"` | **Required** boundary version |
| `executionRef` | `string` | Deterministic audit reference |
| `sessionId` | `string` | Source hold PK |
| `offerId` | `string` | From hold |
| `amount` | `number` | Minor units; equals hold amount |
| `currency` | `SettlementCurrency` | From `amountBreakdown.currency` |
| `amountBreakdown` | `SettlementAmountBreakdown` | Immutable snapshot |
| `releaseStatus` | `"released"` | Terminal only in PR8 |
| `releaseLifecycleEvents` | `PendingHoldReleaseLifecycleEvent[]` | `[RELEASE_APPROVED, RELEASE_COMPLETED]` |
| `executedAt` | `string` | ISO-8601 timestamp |

## executionRef strategy

Deterministic, derived from hold settlement fields:

```
release_{sessionId}_{amountMinor}_{policyVersion}
```

Example: `release_sess_abc_100_SETTLEMENT_AMOUNT_POLICY_V1`

Passed to PR7 `releaseCompletedEvent(sessionId, executionRef)` — satisfies the required non-empty `executionRef` on `RELEASE_COMPLETED`.

## Service outcomes

| Outcome | Meaning |
|---------|---------|
| `executed` | New release execution saved |
| `existing` | Idempotent recall by `sessionId` |
| `skipped` | Hold not release-eligible; no store write |

Skip reasons reuse PR7 `PendingHoldReleaseEligibilityReason` codes.

## Allowed hold fields

PR8 reads only:

- `sessionId`, `status`, `amount`, `amountBreakdown`, `offerId`

It does **not** copy `userId`, `localUserRef`, `contentId`, `packetId`, `artifactId`, `reviewAudit`, or `releaseStatus` from the hold.

## Block / cancel separation

PR8 implements the approve → complete happy path only. `RELEASE_BLOCKED` and `RELEASE_CANCELLED` remain PR7 projection APIs. Future orchestrators decide block/cancel **before** calling `executePendingHoldRelease`.

## Future ledger handoff

| PR8 artifact | Future ledger use |
|---|---|
| `executionRef` | Idempotency key for credit entry |
| `amount` + `currency` | Credit magnitude |
| `amountBreakdown` | Policy audit trail |
| `sessionId` | Link to hold + review chain |
| `releaseLifecycleEvents` | State transition proof |

PR8 creates no ledger entries.

## Usage

```typescript
import {
  createPendingHoldFromReview,
  executePendingHoldRelease,
  InMemoryPendingHoldStore,
  InMemoryReleaseExecutionStore
} from "@pop-core/backend";

const holdStore = new InMemoryPendingHoldStore();
const executionStore = new InMemoryReleaseExecutionStore();

const holdResult = createPendingHoldFromReview(reviewRecord, { store: holdStore });
const releaseResult = executePendingHoldRelease(holdResult.hold!, {
  store: executionStore,
  executedAt: new Date().toISOString()
});

// releaseResult.outcome: "executed" | "existing" | "skipped"
// releaseResult.execution.boundaryVersion === "RELEASE_EXECUTION_BOUNDARY_V1"
// releaseResult.releaseState.releaseStatus === "released"
```

Inject a shared `ReleaseExecutionStore` at the call site for idempotency across calls (same pattern as PR5 hold store).

## Out of scope (PR8)

- Wallet available balance mutation, payout, external payment
- Ledger entry creation
- Supabase, Postgres, HTTP routes
- Flutter runtime changes
- Trust mutation
- Durable JSON/SQL release execution persistence (PR9)
- Mutating `PendingHoldRecord` or `PendingHoldStore`
- Hold serializer / release lifecycle persistence changes
- Block/cancel orchestration wiring
- Auto-invoking release from hold creation or review submission

## Related docs

- [`ledger-entry-v1.md`](./ledger-entry-v1.md) — PR9 ledger credit boundary (next step after release execution)
- [`pending-hold-release-state-machine.md`](./pending-hold-release-state-machine.md) — PR7 release lifecycle
- [`pending-hold-v1.md`](./pending-hold-v1.md) — hold creation (PR5)
- [`settlement-amount-v1.md`](./settlement-amount-v1.md) — amount policy (PR6A)

See [`../backend/README.md`](../backend/README.md) for package commands.
