# Wallet Credit Boundary (PR10)

Pure internal wallet accounting layer that consumes immutable PR9 `LedgerEntry` records and persists append-only `WalletCreditRecord` artifacts — without payout, external payment, balance mutation tables, or durable persistence.

## Purpose

After PR9 posts ledger credit entries with `status: "pending_wallet_credit"`, PR10 adds the first **wallet accounting boundary** that:

1. Receives a `LedgerEntry`
2. Resolves wallet owner identity via `sessionId` → hold/review chain
3. Builds a deterministic `WalletCreditRecord`
4. Persists the credit in an append-only store
5. Returns `credited` or `existing` outcome

PR10 does **not** mutate ledger entries, holds, release execution records, trust records, or any stored balance field.

## Pipeline

```
LedgerEntry
  → applyWalletCreditFromLedgerEntry
  → WalletCreditRecord (in-memory store)
```

Full settlement chain through PR10:

```
PendingHoldRecord
  → executePendingHoldRelease (PR8)
  → ReleaseExecutionRecord
  → postLedgerCreditFromReleaseExecution (PR9)
  → LedgerEntry
  → applyWalletCreditFromLedgerEntry (PR10)
  → WalletCreditRecord
```

## WalletCreditRecord

| Field | Type | Notes |
|-------|------|-------|
| `boundaryVersion` | `"WALLET_BOUNDARY_V1"` | **Required** PR10 boundary version |
| `sourceBoundaryVersion` | `"LEDGER_BOUNDARY_V1"` | **Required** source ledger boundary |
| `walletCreditId` | `string` | Deterministic: `wallet_credit_{sourceRef}` |
| `sourceRef` | `string` | Canonical idempotency key; equals `ledger.sourceRef` |
| `ledgerEntryId` | `string` | Audit link; equals `ledger.ledgerEntryId` |
| `sessionId` | `string` | From ledger; join key to hold/review |
| `offerId` | `string` | From ledger |
| `walletOwnerRef` | `string` | Resolved: `userId ?? localUserRef` |
| `userId` | `string \| null` | Denormalized from hold/review |
| `localUserRef` | `string` | Denormalized from hold/review |
| `ownerResolutionSource` | `"hold" \| "review"` | Which store supplied identity |
| `amount` | `number` | Minor units; equals `ledger.amount` |
| `currency` | `SettlementCurrency` | Equals `ledger.currency` |
| `amountBreakdown` | `SettlementAmountBreakdown` | Shallow copy from ledger |
| `creditedAt` | `string` | ISO-8601; defaults to `ledger.postedAt` |

## Wallet owner resolution

| Step | Source | Priority |
|------|--------|----------|
| 1 | `PendingHoldStore.getBySessionId(sessionId)` | Primary |
| 2 | `ProofReviewStore.getBySessionId(sessionId)` | Fallback |
| 3 | Neither found | Fail closed (`WalletOwnerNotFoundError`) |

Resolved owner key: `walletOwnerRef = userId ?? localUserRef`.

## Idempotency strategy

| Layer | Mechanism |
|-------|-----------|
| **Builder** | Same `LedgerEntry` + same owner → same `walletCreditId`, `sourceRef`, `amount`, `currency` |
| **Store** | Primary key = `sourceRef`; duplicate `save()` throws `WalletCreditConflictError` |
| **Service** | `getBySourceRef(entry.sourceRef)` before build; duplicate → `outcome: "existing"` |

`sourceRef` (= `executionRef`) is the canonical idempotency key across PR8, PR9, and PR10.

## Service outcomes

| Outcome | Meaning |
|---------|---------|
| `credited` | New wallet credit saved |
| `existing` | Idempotent recall by `sourceRef` |

There is no `skipped` outcome.

## Available balance

Available balance is **derived only** from wallet credits at read time:

```typescript
computeWalletAvailableBalance(walletOwnerRef, store, currency?)
```

No balance table, no balance mutation, no running totals persisted.

## Usage

```typescript
import {
  applyWalletCreditFromLedgerEntry,
  computeWalletAvailableBalance,
  InMemoryWalletCreditStore,
  InMemoryPendingHoldStore,
  InMemoryProofReviewStore
} from "@pop-core/backend";

const walletStore = new InMemoryWalletCreditStore();
const holdStore = new InMemoryPendingHoldStore();
const reviewStore = new InMemoryProofReviewStore();

const walletResult = applyWalletCreditFromLedgerEntry(ledgerResult.entry!, {
  walletCreditStore: walletStore,
  holdStore,
  reviewStore
});
// walletResult.outcome: "credited" | "existing"
// walletResult.credit.boundaryVersion === "WALLET_BOUNDARY_V1"
// walletResult.credit.sourceBoundaryVersion === "LEDGER_BOUNDARY_V1"

const balance = computeWalletAvailableBalance(
  walletResult.walletOwnerRef,
  walletStore,
  ledgerResult.entry!.currency
);
```

Inject a shared `WalletCreditStore` at the call site for idempotency across calls (same pattern as PR9 ledger store).

## Out of scope (PR10)

- External payout, payment rails, wallet withdrawal
- Supabase, Postgres, JSON-file wallet persistence
- HTTP routes
- Flutter runtime changes
- Trust mutation
- Mutating `LedgerEntry` status after write
- Wallet debit legs or balance table mutation
- Wiring wallet apply inside `postLedgerCreditFromReleaseExecution`

## Related docs

- [`ledger-entry-v1.md`](./ledger-entry-v1.md) — PR9 ledger boundary (upstream)
- [`release-execution-v1.md`](./release-execution-v1.md) — PR8 release execution boundary
- [`pending-hold-v1.md`](./pending-hold-v1.md) — hold creation (PR5)

See [`../backend/README.md`](../backend/README.md) for package commands.
