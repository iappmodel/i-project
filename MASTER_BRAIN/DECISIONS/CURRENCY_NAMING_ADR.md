# ADR-001: Currency Naming & Taxonomy Reconciliation

**Status:** Accepted — **owner confirmed 2026-05-25** ("build as is for now; concepts can change later")  
**Date:** 2026-05-25  
**Deciders:** Project owner + archaeology audit  
**Blockers addressed:** CR-02, CR-03, CR-04, CR-05, CR-06 — **resolved**

---

## Context

Three currency models coexist in evidence:

1. **Constitution** (`CANONICAL/i_SOURCE_OF_TRUTH.md`) — 5 MVP currencies: a/i/v/e/o
2. **Economy rules** (`ECONOMY/i-app-economy-rules.md`) — 26+ω full taxonomy with rCoin conversion hub
3. **Demo/chat era** — Vicoin/Icoin, uCoin forks, per-letter OpenAI specs (A–Z batches)

Implementation cannot proceed with three conflicting naming systems.

---

## Decision

### Tier 1 — MVP (Loop 1, investor demo, `app/`)

**Canonical names (user-facing and code identifiers):**

| Symbol | Name | Role |
|--------|------|------|
| a | aCoins | Verified attention |
| i | iCoins | Cash-equivalent (withdrawable) |
| v | vCoins | Utility (non-withdrawable) |
| e | eCoins | Verified engagement |
| o | oCoins | Origin / provenance |

**Rules:**
- iCoins and vCoins are **separate ledgers** — never merged in UI
- Demo code may use `icoinsAvailable` / `icoinsPending` internally — display as **iCoins**
- Legacy **Vicoin → vCoins**, **Icoin → iCoins** at UI mapping layer only (not new product names)

### Tier 2 — Full alphabet (post-MVP)

The 26+ω taxonomy in `i-app-economy-rules.md` is **accepted as the long-term economy law** but **deferred from Loop 1 MVP scope**.

Letter coins (f/w/k/g/b/m/u/p/c/d/h/l/n/t/r/q/z/j/y/x/ω) are:
- Documented in MASTER_BRAIN and chat extracts
- **Not implemented** in `app/` until Tier 1 wallet + proof loop ships
- Implemented only through rCoin conversion hub when activated

### rCoin (CR-04 resolution)

**Canonical role:** **Reward conversion hub** — all earning coin types convert through rCoin pipeline before iCoin/vCoin settlement (per economy rules § conversion).

**Rejected aliases:** Reputation-only rCoin (chat 028) — reputation flows through **tCoins (Trust)** and trust score, not rCoin.

### uCoin (CR-05 resolution)

**Canonical role:** **Unlock** — gates premium features (economy rules Tier 3).

**Rejected:** uCoin = User Value = Vicoin alias (chat 007). User value is expressed via trust tier + iCoin balance, not a separate uCoin ledger in MVP.

---

## Consequences

### Positive
- Loop 1 `app/` uses consistent a/i/v labels matching constitution
- Demo branches (`demo-investor`, archive v2) can map Vicoin/Icoin at integration boundary
- Chat letter specs (batch 05 K–Z) indexed as post-MVP without blocking MVP

### Negative / follow-up
- `eye-earn-sparkle` demo-investor code uses Vicoin/Icoin variable names — rename or map when merging into `app/`
- Full 26+ω UI (alphabet-currency.html) remains prototype-only

---

## Implementation checklist

- [x] ADR documented
- [ ] Update `app/` to pending-first iCoin flow (available + pending split)
- [ ] Map demo-investor walletStore Vicoin/Icoin → v/i at integration
- [x] Owner confirmed CR-02–CR-06 — build Tier 1 a/i/v/e/o as-is; Tier 2 deferred
- [x] Mark CR-02–CR-06 **resolved** in DUPLICATES_AND_CONFLICTS.md (2026-05-25)
- [ ] CR-01 (session bypass) remains **separate blocker**

---

## References

- `CANONICAL/i_SOURCE_OF_TRUTH.md`
- `ECONOMY/i-app-economy-rules.md`
- `CHAT_RECOVERY/EXTRACTED/P0_BATCH_03_CURRENCY_RECONCILIATION_NOTES.md`
- `CHAT_RECOVERY/EXTRACTED/P0_BATCHES_01_04_SYNTHESIS.md`
