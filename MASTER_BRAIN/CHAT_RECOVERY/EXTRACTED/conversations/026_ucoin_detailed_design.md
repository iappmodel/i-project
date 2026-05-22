# P0-026: uCoin Detailed Design (OpenAI)

**Extraction batch:** P0 Batch 03  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | OpenAI |
| Conversation ID | `69eda1c3-eeb8-83ea-b0e6-064717192f5e` |
| Title | uCoin Detailed Design |
| Date created | 2026-04-26 |
| Date updated | 2026-04-26 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CHATGPT/gpt chats/conversations-004.json#69eda1c3-eeb8-83ea-b0e6-064717192f5e` |
| Messages | 29 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 105 | P0 | Economy, Reputation, Long-term value |

---

## 3. Project-Specific Summary

Owner requests **LETTER U only** from Alphabet Currency System. OpenAI delivers **uCoin = User Value** — explicitly **overriding** an older "Unlock" definition.

uCoin captures **long-term accumulated human value** on the platform: reputation, consistency, contribution quality — **NOT** short-term spendable cash and **NOT** a direct substitute for vCoins or iCoins.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-026-01 | **U = User Value** (not Unlock) | High |
| D-026-02 | uCoins are **non-cash, non-withdrawable** reputation assets | High |
| D-026-03 | uCoins accumulate slowly over months/years of verified behavior | High |
| D-026-04 | uCoins affect **eligibility, tiers, and access** — not direct purchase power | High |
| D-026-05 | uCoins do **not** convert 1:1 to iCoins or vCoins | High |
| D-026-06 | Distinct from aCoin (attention), eCoin (engagement), iCoin (identity cash), oCoin (offers) | High |

---

## 5. Extracted Feature/System Concepts

### uCoin inputs

- Sustained quality engagement over time
- Creator consistency, community contribution
- Trust score growth, dispute-free history
- NOT: single viral moment, bot patterns, purchase

### uCoin outputs (influence, not spend)

- Tier unlocks (features, marketplace access)
- Conversion rate multipliers (indirect)
- Creator program eligibility
- Governance weight (future)

### Ledger

- `ucoin_accrued`, `ucoin_tier_updated`
- Decay/refresh mechanics for inactive users (cited)

---

## 6. Extracted UX/Design Ideas

- Profile shows uCoin as "lifetime value" meter
- Separate from wallet spendable balances
- Slow-moving progress bar vs instant earn animations

---

## 7. Extracted Technical Architecture Ideas

- Long-horizon aggregation job (daily/weekly rollups)
- Separate ledger table from spendable coins
- Trust engine feeds uCoin accrual

---

## 8. Extracted Economy/Currency Ideas

| Coin | OpenAI role |
|------|-------------|
| uCoin | Long-term User Value — reputation asset |
| vs vCoin | vCoin = spendable platform value (short-term) |
| vs iCoin | iCoin = identity-linked withdrawable value |
| vs rCoin | rCoin = reputation hub OR conversion layer (028 fork) |

**Not in SoT MVP five-coin set** (a/i/v/e/o). uCoin is **26-letter economy** artifact.

---

## 9. Extracted Investor/Demo Ideas

- uCoin as **retention/LTV metric** for investors
- Anti-gaming narrative (slow accrual)

---

## 10. Conflicts with Current Masterbrain

| Topic | Spec | SoT | Verdict |
|-------|------|-----|---------|
| uCoin existence | Full letter spec | **Not in MVP 5-coin set** | **Post-MVP or cut** |
| U meaning | User Value | SoT silent | **New evidence** |

---

## 11. Conflicts with P0 Batch 1 and 2

| Topic | Prior | This spec |
|-------|-------|-----------|
| ucoins ≈ Vicoins (007) | Clearing pool output mapped to ucoins/Vicoins | uCoin = long-term User Value, NOT Vicoins | **Direct conflict** |
| vCoin eligibility (020) | rCoin/tCoin affect eligibility | uCoin also affects tiers/eligibility | **Partial align** — different coins |
| Unlock definition | Older alphabet drafts | Explicitly rejected | **Obsolete "Unlock"** |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B03-11 | U = User Value (not Unlock) | B — post-MVP |
| CC-B03-12 | uCoins non-cash, non-withdrawable | B |
| CC-B03-13 | uCoins influence eligibility not spend | B |

---

## 13. Preserve-Only Notes

- Decay formula examples — tuning parameters
- Governance weight — Phase 3+

---

## 14. Obsolete Notes

- **U = Unlock** — explicitly superseded in this thread

---

## 15. Follow-Up Extraction Targets

- Resolve ucoins/Vicoins mapping from conv 007
- Check conv 028 uCoin entry in master A–Z table
