# P0-025: iCoin Development Strategy (OpenAI)

**Extraction batch:** P0 Batch 03  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | OpenAI |
| Conversation ID | `69edaceb-215c-83ea-bc85-7dd1621c43d5` |
| Title | iCoin Development Strategy |
| Date created | 2026-04-26 |
| Date updated | 2026-04-26 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CHATGPT/gpt chats/conversations-004.json#69edaceb-215c-83ea-bc85-7dd1621c43d5` |
| Messages | 29 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 105 | P0 | Economy, Identity, Wallet, Trust, Payout |

---

## 3. Project-Specific Summary

Owner requests **LETTER I only** from Alphabet Currency System. OpenAI delivers **iCoin = Identity-linked value layer** — the highest-trust economic output of the verified pipeline.

**Critical semantic shift:** In OpenAI alphabet, **I = Identity**, not "internal cash." iCoin represents **identity-backed, withdrawable economic value** earned only through verified behavior-coin conversion — not raw engagement.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-025-01 | **I = Identity**; iCoin = identity-linked economic value | High |
| D-025-02 | Primary mint path: **behavior coins → rCoins → iCoins at 100:1** | High |
| D-025-03 | iCoins are the **only alphabet coin class intended for cash-like withdrawal** (with KYC/trust gates) | High |
| D-025-04 | iCoin states: Claimed / Pending / Available / Withdrawable / Restricted / Frozen | High |
| D-025-05 | iCoin requires identity verification tier before withdrawable | High |
| D-025-06 | Direct behavior-coin → iCoin without rCoin hub **discouraged** | High |

---

## 5. Extracted Feature/System Concepts

### iCoin lifecycle states

| State | Meaning |
|-------|---------|
| Claimed | User acknowledged earn event |
| Pending | Awaiting verification/trust review |
| Available | In wallet, not yet withdrawable |
| Withdrawable | Passed KYC + trust threshold |
| Restricted | Policy hold |
| Frozen | Fraud/dispute lock |

### Mint sources (via rCoin)

- aCoins, eCoins, and other behavior coins after conversion
- Sponsored campaigns with verified completion
- NOT: likes, raw views, unverified watch time

### Withdrawal pipeline

- Minimum thresholds, fee schedule, payout rails (cited as future)
- Trust score affects conversion multiplier

---

## 6. Extracted UX/Design Ideas

- Wallet prominently shows iCoin as "real value" tier
- Separate display from behavior coins and vCoins
- Status badges per iCoin state

---

## 7. Extracted Technical Architecture Ideas

- Ledger: `icoin_minted`, `icoin_withdrawal_requested`, `icoin_frozen`
- Identity service integration for withdrawable gate
- Supabase RLS on iCoin balances by trust tier

---

## 8. Extracted Economy/Currency Ideas

```
[behavior coins] → rCoins → iCoins (100:1 default)
                              ↓
                         withdrawal (KYC + trust)
```

| Property | iCoin (OpenAI alphabet) |
|----------|---------------------------|
| Letter | I = Identity |
| Cash-like | Yes — **only** withdrawable tier |
| Direct earn | No — must pass rCoin hub |
| vs vCoin | iCoin = identity economic output; vCoin = spendable platform value (028) |

**Major conflict with chat-era naming:** Claude threads use **Icoins = cash** and **Vicoins = utility** — same economic roles but **opposite letter assignment** vs OpenAI alphabet (i=identity, v=spendable).

---

## 9. Extracted Investor/Demo Ideas

- iCoin withdrawal story = investor monetization proof
- State machine diagram for compliance narrative
- 100:1 conversion as unit economics anchor

---

## 10. Conflicts with Current Masterbrain

| Topic | Spec | SoT | Verdict |
|-------|------|-----|---------|
| iCoin meaning | Identity-linked value | iCoins = cash-value | **Partial align on withdrawable; semantic fork on "Identity"** |
| rCoins required | Yes | SoT silent | **SoT gap** |
| vCoin | Separate spendable layer | vCoins = utility | **Naming inversion vs chat Vicoins** |

---

## 11. Conflicts with P0 Batch 1 and 2

| Topic | Prior | This spec |
|-------|-------|-----------|
| Icoins = cash (007, 013, 016) | Chat naming | OpenAI: iCoin = identity layer that IS cash-output | **Role align, letter semantics differ** |
| Vicoins = utility (007) | Chat naming | OpenAI vCoin = spendable (028) | **Same roles, confirmed inversion** |
| vCoin guide (020) | vCoin after proof pipeline | iCoin is withdrawal target here | **Output layer fork** — 020 vs 025 |
| aCoin spec (023) | a→r→i | Same pipeline | **Align** |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B03-07 | iCoin state machine (6 states) | B |
| CC-B03-08 | iCoin = only withdrawable alphabet coin | A — conflicts chat naming |
| CC-B03-09 | 100:1 rCoin→iCoin default | C |
| CC-B03-10 | I = Identity (OpenAI letter semantics) | A — **owner decision required** |

---

## 13. Preserve-Only Notes

- Full HTML/CSS wallet mock in thread
- Payout rail examples (Stripe, etc.) — not decided

---

## 14. Obsolete Notes

- Treating iCoin as "just another behavior coin" — explicitly rejected

---

## 15. Follow-Up Extraction Targets

- Map OpenAI I=Identity vs SoT iCoins=cash — owner letter lock
- Cross-read conv 028 tier-1 core coins table
