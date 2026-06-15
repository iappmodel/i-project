# INVENTION_018 — Append-Only Wallet Ledger with Value Lots and Invariant Rules

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Wallet & Settlement Infrastructure
**Date:** 2026-06-15

## Problem Solved

Digital wallet systems in attention economies and creator platforms typically store balances as mutable scalars (e.g., `balance += reward`), making them vulnerable to race conditions, silent edits, untraceable fraud, and audit failures. There is no standard architecture that treats wallet balance as a derived projection from immutable, source-tracked value tranches while enforcing non-negotiable invariants (no manual edits, no withdrawal from pending, fraud must leave explicit records) at the engine level.

## Current Industry Approach

Most digital wallets (PayPal, Venmo, Cash App, creator platform wallets like YouTube's AdSense or TikTok's Creator Fund) maintain a single mutable balance field that is incremented or decremented with each transaction. Audit trails exist as separate log tables but are not structurally linked to the balance computation. Fintech ledgers (Stripe, Modern Treasury) use double-entry bookkeeping but do not partition individual reward tranches into source-tracked value lots with pending/available/locked/withdrawn bucket invariants enforced at the application engine level. No competitor combines append-only ledger entries, per-reward value lots with partition integrity assertions, FIFO withdrawal allocation, and a cached projection model within a single unified engine.

## How [ i ] Solves It

The [ i ] Wallet Ledger Engine implements a rigorous financial architecture where the wallet balance is never directly stored or modified — it is always derived by projecting across all ValueLot rows belonging to a wallet. Every reward creates a ValueLot (a source-tracked tranche with pending, available, locked, and withdrawn buckets that must sum to the original amount at all times). Every balance movement creates an immutable LedgerEntry that records the kind of transition (e.g., `rewardPendingMint`, `pendingToAvailable`, `availableToLocked`, `lockedToWithdrawn`), the amount, the lot it operates on, and a reference to the originating business event. The engine enforces Rule 2 (no manual balance edits), Rule 4 (no withdrawal from pending value — only available), Rule 8 (fraud delays and reversals must appear as explicit ledger entries, never silent erasure), and Rule 28 (single database transaction per money-adjacent unit of work). A `WalletBalanceProjection` cached read model is refreshed within the same logical transaction as lot and ledger mutations, anchored to the last ledger entry ID for audit continuity.

## System Description

The WalletLedgerEngine is a 917-line Dart implementation that manages four core object types: LedgerEntry (immutable append-only rows with id, walletId, userId, kind, amountUsd, valueLotId, referenceType, referenceId, createdAt), ValueLot (source-tracked value tranches with pending/available/locked/withdrawn bucket partitions that must sum to originalUsd with epsilon tolerance), WalletBalance (derived aggregate of lot buckets), and WalletBalanceProjection (cached read model with spentUsd reserved for in-app debits). The engine supports seven core operations: `issueCampaignReward` (creates a ValueLot with full amount in pending and a `rewardPendingMint` ledger entry; requires non-empty campaignId and sourceCampaignEventId), `releasePendingToAvailable` (moves all pending to available on a lot with a `pendingToAvailable` ledger entry), `requestWithdrawal` (FIFO allocation across lots, moving available to locked with `availableToLocked` entries per lot; creates a WithdrawalRequest with lot allocations), `completeWithdrawal` (moves locked to withdrawn with `lockedToWithdrawn` entries), `cancelWithdrawal` (moves locked back to available with `lockedToAvailable` entries), and `convertAvailableToNewLot` (debits source lot available and creates a new destination lot with both a `conversionSourceDebit` and `conversionDestinationCredit` entry). Every operation refreshes the projection and emits accounting events (WalletValueLotCreatedEvent, WalletLedgerEntryCreatedEvent, WalletBalanceProjectedEvent) through a pluggable `WalletAccountingSink` with SystemJobCompletedEvent wrappers. The `verifyProjectionMatchesLots` method allows runtime integrity checks. The database layer includes `20260218100002_wallet_ledger.sql` for schema, `atomic_update_balance` and `wallet_ledger_audit` RPCs, and `wallet_ledger_row_hash_extensions_digest.sql` for row-level hash integrity.

## Technical Components

- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/lib/wallet_ledger_engine.dart` — Core engine (917 lines): LedgerEntry, ValueLot, WalletBalance, WalletBalanceProjection, WalletLedgerEngine, WithdrawalRequest, ConversionTransaction
- `app/supabase/migrations/20260218100002_wallet_ledger.sql` — Database schema for wallet ledger tables
- Atomic RPCs: `atomic_update_balance`, `wallet_ledger_audit`
- Row hash integrity: `wallet_ledger_row_hash_extensions_digest.sql`
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/lib/core/events/wallet_event.dart` — Wallet event types (WalletValueLotCreatedEvent, WalletLedgerEntryCreatedEvent, WalletBalanceProjectedEvent, etc.)
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/lib/core/events/system_event.dart` — SystemJobCompletedEvent for accounting emissions

## Data Flow

1. A reward event occurs (e.g., attention session validated, check-in completed).
2. `issueCampaignReward()` is called with walletId, userId, campaignId, sourceCampaignEventId, and amountUsd.
3. Engine validates that campaignId and sourceCampaignEventId are non-empty and amount is positive.
4. A new ValueLot is created with the full amount in the `pendingUsd` bucket (available, locked, withdrawn all zero).
5. A LedgerEntry of kind `rewardPendingMint` is appended with the lot ID and campaign event reference.
6. `_refreshProjection()` recomputes the WalletBalanceProjection by summing all lot buckets for the wallet, anchored to the new ledger entry ID.
7. Accounting events (lot created, ledger entry created, balance projected) are emitted to the accounting sink.
8. When verification or time-unlock clears, `releasePendingToAvailable()` moves the lot's pendingUsd to availableUsd and appends a `pendingToAvailable` ledger entry.
9. When the user requests withdrawal, `requestWithdrawal()` iterates lots in FIFO order (by createdAt), slicing only availableUsd (Rule 4), creating `availableToLocked` entries for each lot, and recording lot allocations on a WithdrawalRequest.
10. Payout completion calls `completeWithdrawal()`, which moves each allocated lot's locked to withdrawn and appends `lockedToWithdrawn` entries.

## User Flow

1. User completes a verified attention session and earns a reward.
2. The wallet UI shows the reward as "pending" — it has been minted as a value lot but not yet cleared.
3. After verification/settlement period, the reward moves to "available" — the user sees their spendable balance increase.
4. User requests a withdrawal; the system allocates available balance across lots in FIFO order and moves those amounts to "locked."
5. User sees "locked" balance during payout processing.
6. Upon payout completion, the locked amount moves to "withdrawn" and the user receives funds.
7. At every step, the user's displayed balance is a projection from the underlying value lots — never a manually edited scalar.

## Economic Flow

1. Campaign rewards enter the system through `issueCampaignReward()` — each reward is a separate value lot tied to a specific campaign and source event.
2. Pending value represents uncleared rewards (verification delay, fraud hold, settlement period).
3. Available value represents spendable balance (cleared, verified, ready for use).
4. Locked value represents withdrawal holds (funds reserved for payout but not yet transferred).
5. Withdrawn value represents completed payouts (funds have left the system).
6. Conversions between value types (e.g., currency conversion) create source debit and destination credit entries with a new lot.
7. The projection model ensures the UI always reflects the true economic state derived from lots, not a stale or manipulated scalar.

## Fraud Prevention

- **Rule 2 enforcement:** No code path allows direct balance modification (`balance += x`). All balance changes flow through lot mutations paired with immutable ledger entries.
- **Rule 4 enforcement:** The `requestWithdrawal()` method explicitly checks `availableUsd` and never debits `pendingUsd`, preventing withdrawal of uncleared rewards.
- **Rule 8 enforcement:** Fraud delays, clawbacks, and reversals must appear as explicit ledger entries — the engine provides no method for silent balance erasure.
- **Partition invariant:** Every ValueLot asserts that `pendingUsd + availableUsd + lockedUsd + withdrawnUsd == originalUsd` (within epsilon), making it impossible to create or destroy value without a corresponding lot operation.
- **Row hash integrity:** The SQL extension computes row-level SHA-256 digests, enabling detection of unauthorized database modifications outside the engine.
- **Campaign ID requirements:** No reward can be issued without a non-empty campaignId and sourceCampaignEventId, ensuring every value lot is traceable to its business origin.
- **Audit continuity:** The projection model records the `lastLedgerEntryId` that triggered the refresh, creating a verifiable chain from projection back to individual ledger lines.

## Unique Elements

1. **Value lot architecture** — Every reward creates a separate, source-tracked value tranche (ValueLot) with pending/available/locked/withdrawn partitions that must sum to the original amount, rather than incrementing a single balance field.
2. **Balance as projection** — The wallet balance is never stored as a mutable scalar but is always derived by summing across all ValueLot bucket partitions, with a cached projection model refreshed within the same logical transaction as mutations.
3. **Codified invariant rules** — Non-negotiable financial rules (no manual edits, no withdrawal from pending, fraud leaves records, single-transaction units of work) are enforced at the engine level as code, not policy.
4. **FIFO withdrawal allocation** — Withdrawals allocate across value lots in first-in-first-out order by creation date, ensuring oldest cleared value exits first.
5. **Append-only ledger with lot reference** — Every LedgerEntry records the specific ValueLot it operates on, the kind of bucket transition, and a reference to the originating business event, creating a fully auditable provenance chain.
6. **Accounting event emission** — Each operation emits structured wallet events (lot created, ledger entry created, balance projected) through a pluggable sink with system job wrappers, enabling downstream audit, analytics, and reconciliation.

## Potential Patent Claims

1. A method for managing a digital wallet balance in an attention-economy platform, comprising: creating a value lot for each incoming reward, the value lot comprising pending, available, locked, and withdrawn bucket partitions that sum to an original amount; appending an immutable ledger entry for each bucket transition that records the transition kind, amount, value lot identifier, and business-event reference; deriving the wallet balance by projecting across all value lot bucket partitions rather than maintaining a mutable balance scalar; and caching the derived projection within the same logical transaction as the lot mutation and ledger append.
2. A system for fraud-resistant digital wallet management, comprising: an append-only ledger that records every balance-affecting operation as an immutable entry; a value lot store where each lot enforces a partition invariant requiring pending, available, locked, and withdrawn amounts to sum to an original amount within epsilon tolerance; a withdrawal engine that allocates withdrawal amounts across value lots in FIFO order using only available buckets, rejecting withdrawal from pending value; and a projection model anchored to the last ledger entry identifier for audit continuity.
3. A computer-implemented method for preventing silent value erasure in a digital reward system, comprising: requiring that every balance-affecting operation produce both a value lot bucket mutation and a corresponding append-only ledger entry; asserting a partition invariant on each value lot after mutation; requiring non-empty campaign and source-event identifiers for reward issuance; computing row-level hash digests for tamper detection; and emitting structured accounting events through a pluggable sink for each operation.

## Potential Competitors

- **Stripe (Treasury / Issuing)** — Double-entry ledger but no per-reward value lot architecture
- **Modern Treasury** — Ledger-based accounting; no partition invariants or attention-economy-specific rules
- **PayPal / Venmo** — Mutable balance fields with separate transaction logs
- **YouTube (AdSense)** — Creator earnings with hold periods but no source-tracked value lots
- **TikTok (Creator Fund)** — Pool-based distribution; no per-reward provenance
- **Brave (BAT wallet)** — Token-based attention rewards but mutable balance model
- **Coinbase** — Crypto wallet with transaction history but no value lot partitioning

## Related Files

- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/lib/wallet_ledger_engine.dart`
- `app/supabase/migrations/20260218100002_wallet_ledger.sql`
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/lib/core/events/wallet_event.dart`
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/lib/core/events/system_event.dart`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 10 |
| Patentability | 9 |
| Business Value | 10 |
