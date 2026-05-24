# Settlement Amount v1 (PR6A)

Deterministic settlement amount policy for pending holds. Computes integer iCoin hold amounts from settlement-eligible review records without wallet mutation, ledger writes, or campaign budget reservation.

## Pipeline

```
ProofReviewRecord
  → settlement eligibility gate (PR5)
  → offer terms lookup
  → computeSettlementAmount
  → PendingHoldRecord.amount + amountBreakdown
```

See [`pending-hold-v1.md`](./pending-hold-v1.md) for hold creation and skip outcomes.

## Formula (SETTLEMENT_AMOUNT_POLICY_V1)

```
heldAmountMinor = floor(baseRewardMinor × statusMultiplier)
```

| Review status | `statusMultiplier` | Example (base 100) |
|---------------|-------------------|---------------------|
| `approved` | `1.0` | 100 |
| `partial` | `0.5` | 50 |

Currency: **ICOIN** (integer minor units).

## Offer terms

Amount policy requires per-offer static terms injected via `OfferSettlementTermsProvider`:

| Field | Type | Description |
|-------|------|-------------|
| `offerId` | string | Lookup key (matches `ProofReviewRecord.offerId`) |
| `baseRewardMinor` | number | Positive integer base reward |
| `currency` | `"ICOIN"` | Settlement currency |

Default fixture terms (tests and default provider):

| Field | Value |
|-------|-------|
| `offerId` | `nike-pegasus-41-watch` |
| `baseRewardMinor` | `100` |
| `currency` | `ICOIN` |

## SettlementAmountBreakdown

Every created hold includes a replay snapshot:

| Field | PR6A value | Notes |
|-------|------------|-------|
| `policyVersion` | `SETTLEMENT_AMOUNT_POLICY_V1` | Versioned policy id |
| `currency` | `ICOIN` | |
| `offerId` | from terms | |
| `baseRewardMinor` | from terms | |
| `statusMultiplier` | `1.0` or `0.5` | From review status |
| `computedAmountMinor` | formula result | Mirrors `PendingHoldRecord.amount` |
| `presenceUnits` | `null` | Reserved for future POP presence-based economics. Not used by SETTLEMENT_AMOUNT_POLICY_V1. |

## Allowed inputs

From `ProofReviewRecord` (read-only):

- `status` — multiplier selection
- `review.status` — must match `status` (PR5 gate)
- `offerId` — terms lookup

From injected provider:

- `OfferSettlementTerms` for `offerId`

**Not used in v1:** scoring vectors, packet signals, duration, trust, fraud re-evaluation, campaign budget state.

## Skip reasons (amount policy)

| Skip reason | When |
|-------------|------|
| `offer_settlement_terms_missing` | No terms for `record.offerId` |
| `settlement_amount_zero` | `floor(base × multiplier) < 1` |

PR5 skip reasons unchanged: `review_not_settlement_eligible`, `review_status_mismatch`.

## Status treatment

| Review status | Hold created? | Amount |
|---------------|---------------|--------|
| `approved` | Yes | `floor(base × 1.0)` |
| `partial` | Yes | `floor(base × 0.5)` |
| `pending` | No | — |
| `rejected` | No | — |
| `escalated` | No | — |

## Usage

```typescript
import {
  createPendingHoldFromReview,
  InMemoryPendingHoldStore,
  createDefaultOfferSettlementTermsProvider
} from "@pop-core/backend";

const holdStore = new InMemoryPendingHoldStore();
const offerTermsProvider = createDefaultOfferSettlementTermsProvider();

const result = createPendingHoldFromReview(record, {
  store: holdStore,
  offerTermsProvider
});

if (result.outcome === "created") {
  // result.hold.amount === 100 (approved, default fixture)
  // result.hold.amountBreakdown.policyVersion === "SETTLEMENT_AMOUNT_POLICY_V1"
  // result.hold.releaseStatus === "not_released"
}
```

## Out of scope (PR6A)

- Wallet release or available balance mutation
- Ledger writes
- Hold persistence (JSON/DB)
- `ProofReviewRecord.review.settlementAmount` write-back
- Campaign budget reservation / cap enforcement
- Score-proportional pricing
- Trust multipliers, UP/VUP tiers
- Advertiser billing, creator payout splits
- HTTP offer catalog, Supabase, Flutter runtime changes

## Future PRs

| PR | Addition |
|----|----------|
| PR7+ | Hold release lifecycle (`releaseStatus` → `released`) |
| PR8+ | Durable hold persistence, ledger writes |
| Post-v1 | Presence-based economics via `presenceUnits` |

See [`proof-review-state-machine.md`](./proof-review-state-machine.md) for settlement eligibility.
