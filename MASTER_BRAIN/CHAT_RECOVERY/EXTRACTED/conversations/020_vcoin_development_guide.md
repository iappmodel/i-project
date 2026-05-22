# P0-020: vCoin Development Guide (OpenAI)

**Extraction batch:** P0 Batch 02  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | OpenAI |
| Conversation ID | `69edaab5-6658-83ea-b5be-e16620c253b2` |
| Title | vCoin Development Guide |
| Date created | 2026-04-26 |
| Date updated | 2026-04-26 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CHATGPT/gpt chats/conversations-004.json#69edaab5-6658-83ea-b5be-e16620c253b2` |
| Messages | 29 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 109 | P0 | Economy, Trust, Wallet |

**Keywords matched:** alphabet currency, vCoin, campaign, rewards, fraud, trust, verification

---

## 3. Project-Specific Summary

Owner requests **letter V only** from the Alphabet Currency System. OpenAI produces a **full vCoin specification**: economic usability layer — value that cleared verification, settlement, trust, safety, and age rules. Explicitly **not** identity, personhood, or Trust Score replacement.

Defines earning paths (campaign, attention, creator, tips, payments, marketplace, conversions, brand-issued), spend paths (NFC/QR/pay links per cited payment architecture), withdrawal gating, coin conversion rules from a/i/q/p coins, brand-locked vCoin variants, UI/wallet states (pending/available/restricted/withdrawable), and anti-fraud holds.

Includes HTML/CSS wallet mock stages for processing/confirmed — **reference UI only**.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-020-01 | **vCoin = usable value after proof** | High |
| D-020-02 | Not all earned value becomes vCoin immediately — pending/restricted/non-withdrawable lanes | High |
| D-020-03 | Campaign rewards default **pending**; no instant withdrawable vCoin unless trusted/low-risk | High |
| D-020-04 | vCoin cannot buy Trust, Safety, Reputation, or root identity | High |
| D-020-05 | rCoin/tCoin/sCoin affect eligibility/risk — **do not** directly convert to vCoin | High |
| D-020-06 | Attention path: raw→aCoins; verified→iCoins; backed+cleared→pending/available vCoin | High |

---

## 5. Extracted Feature/System Concepts

### vCoin state machine (core)

```
economic claim → verification → fraud/trust/age checks
→ pending vCoin → hold expires → available vCoin
→ (optional) withdrawable vCoin after payout rules
```

### Earning channels (8 primary)

1. Campaign-funded rewards  
2. Attention rewards (Watch→Verify→Earn backed)  
3. Creator earnings (source-tagged)  
4. Tips (pending_tip → available; dispute paths)  
5. Payments received (NFC/QR/pay link)  
6. Marketplace sales  
7. Conversion from eligible coins  
8. Brand-issued credits (open/brand-locked/category/campaign/promo/refund types)

### Conversion rules (alphabet integration)

| From | To vCoin when |
|------|----------------|
| iCoin | Economically backed + eligible |
| aCoin | After attention verification + campaign funding |
| qCoin | Approved quality bonus only |
| pCoin | Campaign-funded presence only |
| r/t/s Coin | No direct conversion — eligibility/risk only |

### Spend

- Platform purchasing power: boosts, features, merchant spend, tips (available only)
- Sender cannot tip with pending vCoin

---

## 6. Extracted UX/Design Ideas

- Wallet UI stages: processing vs confirmed; amber `--vcoin-primary: #f59e0b`
- Clear pending vs available labeling to reduce support burden
- Source-tagged creator balances for chargeback differentiation

---

## 7. Extracted Technical Architecture Ideas

- Campaign builder integration: budget reserve → action → verification event → claim
- Backend: independent server-side score revalidation (referenced in other threads)
- Edge Functions implied for currency mutations (aligns batch 01)

---

## 8. Extracted Economy/Currency Ideas

**Central tension resolved in spec:**

| Coin | Role per this doc |
|------|-------------------|
| aCoin | Raw attention |
| iCoin | Verified attention / cash-value layer |
| vCoin | **Usable economic value after clearance** |
| eCoin | (not focus of thread) |
| oCoin | (not focus) |

**Brand vCoin variants:** open, brand-locked, category-locked, campaign-locked, non-withdrawable, promo (expiring), refund.

---

## 9. Extracted Investor/Demo Ideas

- Narrative: "usable value after proof" for investor trust story
- Campaign flow diagram suitable for pitch appendix

---

## 10. Conflicts with Current Masterbrain

| Topic | This guide | SoT `i_SOURCE_OF_TRUTH.md` |
|-------|------------|---------------------------|
| vCoin role | Usable/spendable economic layer after proof | vCoins = utility, boosts, features — **not cash substitute** |
| iCoin vs vCoin | iCoin on verified attention; vCoin after clearance | iCoins = cash-value withdrawable |
| Layering | a→i→v pipeline | Simpler 5-coin table without clearance pipeline |

**Verdict:** **Major semantic conflict** — OpenAI vCoin guide treats vCoin as **primary spendable economic layer**; SoT treats vCoin as **utility** and iCoin as **cash-value**. Owner reconciliation required.

---

## 11. Conflicts with P0 Batch 1

| Topic | Batch 01 | This thread |
|-------|----------|-------------|
| Vicoins | Internal utility (007, 009, 013) | vCoin = spendable economic (this doc) | **High** — naming collision Vicoin≠vCoin? |
| rcoins hub | Clearing pool (007) | rCoin no direct vCoin conversion | **Tension** |
| Pending wallet | 4-state model (009) | pending/available/restricted/withdrawable vCoin | **Structural align, naming differ** |
| 26-letter | A–Z taxonomy (007) | Single letter V deep spec | **Compatible** if V maps to utility or cash per owner |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B02-20 | Pending→available clearance pipeline | B — conflicts SoT vCoin role |
| CC-B02-21 | vCoin cannot purchase trust/reputation | A |
| CC-B02-22 | Campaign default pending settlement | B |
| CC-B02-23 | Source-tagged creator vCoin | B |
| CC-B02-24 | Brand-locked vCoin variants | C — experimental |

---

## 13. Preserve-Only Notes

- filecite references to other OpenAI uploads — not verified in this extract
- HTML mockup CSS — demo reference only

---

## 14. Obsolete Notes

- Equating vCoin with withdrawable cash **without** owner override of SoT
- Full alphabet V spec if MVP stays 5-coin simple

---

## 15. Follow-Up Extraction Targets

- Extract OpenAI **aCoin**, **iCoin**, **Alphabet Currency** P0 threads (ranks 23, 25, 28)
- Owner map: Vicoin (chat) ↔ vCoin (SoT) ↔ vCoin (this guide)
- Reconcile with conv 007 ucoins/vCoins/rcoins hub
