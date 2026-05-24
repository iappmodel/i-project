# Ledger Entry Boundary (PR9)

Pure internal ledger credit layer that receives `ReleaseExecutionRecord` artifacts from PR8 and persists immutable `LedgerEntry` records — without wallet mutation, available balance changes, payout, or durable persistence.

## Purpose

After PR8 produces auditable release execution records, PR9 adds the first **ledger boundary** that:

1. Receives a `ReleaseExecutionRecord`
2. Validates execution boundary and release status
3. Builds a deterministic `LedgerEntry` credit record
4. Persists the entry in an append-only store
5. Returns `posted` or `existing` outcome

PR9 does **not** mutate wallet balances, holds, release execution records, or ledger entry status after write.

## Pipeline

```
ReleaseExecutionRecord
  → postLedgerCreditFromReleaseExecution
  → LedgerEntry (in-memory store)
```

Full settlement chain through PR9:

```
PendingHoldRecord
  → executePendingHoldRelease (PR8)
  → ReleaseExecutionRecord
  → postLedgerCreditFromReleaseExecution (PR9)
  → LedgerEntry
```

## LedgerEntry

| Field | Type | Notes |
|-------|------|-------|
| `boundaryVersion` | `"LEDGER_BOUNDARY_V1"` | **Required** boundary version |
| `ledgerEntryId` | `string` | Deterministic: `ledger_credit_{executionRef}` |
| `sourceRef` | `string` | Canonical idempotency key; equals `execution.executionRef` |
| `sessionId` | `string` | From execution; links to hold + review chain |
| `offerId` | `string` | From execution |
| `direction` | `"credit"` | Always credit in PR9 |
| `entryType` | `"hold_release_credit"` | Hold release credit leg |
| `amount` | `number` | Minor units; equals `execution.amount` |
| `currency` | `SettlementCurrency` | Equals `execution.currency` |
| `amountBreakdown` | `SettlementAmountBreakdown` | Shallow copy from execution |
| `status` | `"pending_wallet_credit"` | Immutable; wallet not yet credited |
| `sourceExecutedAt` | `string` | ISO-8601; equals `execution.executedAt` |
| `postedAt` | `string` | ISO-8601; defaults to `execution.executedAt` |

## Idempotency strategy

| Layer | Mechanism |
|-------|-----------|
| **Builder** | Same `ReleaseExecutionRecord` → same `ledgerEntryId`, `sourceRef`, `amount`, `currency` |
| **Store** | Primary key = `sourceRef`; duplicate `save()` throws `LedgerEntryConflictError` |
| **Service** | `getBySourceRef(execution.executionRef)` before build; duplicate → `outcome: "existing"` |

`executionRef` (stored as `sourceRef`) is the canonical idempotency key per PR8 ledger handoff. `sessionId` is exposed as a secondary lookup only.

## Service outcomes

| Outcome | Meaning |
|---------|---------|
| `posted` | New ledger entry saved |
| `existing` | Idempotent recall by `sourceRef` |

There is no `skipped` outcome — PR9 accepts only valid `ReleaseExecutionRecord` input.

## PR10 wallet handoff

| PR9 artifact | PR10 use |
|---|---|
| `sourceRef` | Wallet credit idempotency key |
| `amount` + `currency` | Credit magnitude |
| `status: "pending_wallet_credit"` | Signals wallet layer has not consumed this entry |
| `sessionId` | Join to `PendingHoldRecord` for `userId` / `localUserRef` |

PR10 must resolve wallet owner identity via hold/review chain — `ReleaseExecutionRecord` and `LedgerEntry` do not carry user fields.

PR10 must **not** mutate ledger entries (append-only). Wallet application writes a separate artifact keyed by `sourceRef`.

## Usage

```typescript
import {
  executePendingHoldRelease,
  postLedgerCreditFromReleaseExecution,
  InMemoryReleaseExecutionStore,
  InMemoryLedgerEntryStore
} from "@pop-core/backend";

const executionStore = new InMemoryReleaseExecutionStore();
const ledgerStore = new InMemoryLedgerEntryStore();

const releaseResult = executePendingHoldRelease(hold, {
  store: executionStore,
  executedAt: new Date().toISOString()
});

if (releaseResult.execution) {
  const ledgerResult = postLedgerCreditFromReleaseExecution(releaseResult.execution, {
    store: ledgerStore
  });
  // ledgerResult.outcome: "posted" | "existing"
  // ledgerResult.entry?.boundaryVersion === "LEDGER_BOUNDARY_V1"
  // ledgerResult.entry?.status === "pending_wallet_credit"
}
```

Inject a shared `LedgerEntryStore` at the call site for idempotency across calls (same pattern as PR8 release execution store).

## Out of scope (PR9)

- Wallet available balance mutation, payout, external payment
- Durable JSON/SQL ledger persistence
- Ledger entry status updates after write
- Supabase, Postgres, HTTP routes
- Flutter runtime changes
- Trust mutation
- Mutating `ReleaseExecutionRecord`, `PendingHoldRecord`, or hold stores
- Wiring ledger post inside `executePendingHoldRelease`
- Double-entry debit legs or balance calculation

## Related docs

- [`release-execution-v1.md`](./release-execution-v1.md) — PR8 release execution boundary
- [`pending-hold-v1.md`](./pending-hold-v1.md) — hold creation (PR5)
- [`settlement-amount-v1.md`](./settlement-amount-v1.md) — amount policy (PR6A)

See [`../backend/README.md`](../backend/README.md) for package commands.
