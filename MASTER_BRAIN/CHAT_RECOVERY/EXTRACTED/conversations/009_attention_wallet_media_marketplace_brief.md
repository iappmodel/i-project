# P0-009: Attention Wallet and Media Marketplace Product Brief

**Extraction batch:** P0 Batch 01  
**Extracted:** 2026-05-21

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `660aefa0-4a8e-48c9-a6a6-43a87c816d9f` |
| Title | Attention wallet and media marketplace product brief |
| Date created | 2026-03-14 |
| Date updated | 2026-03-21 |
| Raw path | `…/conversations.json#660aefa0-4a8e-48c9-a6a6-43a87c816d9f` |
| Messages | 5 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 147 | P0 | Source of Truth, Economy, Wallet, Attention, Onboarding |

---

## 3. Project-Specific Summary

Owner submits a **structured product brief** defining [ i ] positioning, navigation, loops, currency rules, wallet states, onboarding trust ladder, eye-tracking principles, visual direction, and MVP scope. Claude builds a **4-screen dark-mode HTML prototype** with bottom sheets for premium watch, survey, and withdraw flows.

**This brief is among the closest chat sources to the canonical SoT** — likely predates or informed constitution ingestion.

---

## 4. Extracted Decisions

| ID | Decision |
|----|----------|
| D-009-01 | **[ i ] is NOT a social network with rewards** — attention wallet + media marketplace |
| D-009-02 | User motivations: discover media, sponsored interactions, earn/use rewards — **social secondary** |
| D-009-03 | Bottom nav: Feed, Earn, Wallet, Profile (Activity/Inbox optional later) |
| D-009-04 | Core loops: Watch→Verify→Earn; Browse→Save→Return; Balance→Convert→Use |
| D-009-05 | **Vicoins** = utility (boosts, tips, features, gamification) |
| D-009-06 | **Icoins** = cash-equivalent (verified sponsored earnings, payout, merchant, transfers) |
| D-009-07 | Organic → mostly Vicoins; verified sponsored → Icoins |
| D-009-08 | Wallet states: Available, Pending, Restricted, Lifetime earned (both currencies) |
| D-009-09 | **Progressive trust onboarding**: signup → expose value → phone on claim → ID on withdraw → tax at threshold |
| D-009-10 | Eye tracking **only where necessary** — high-value watch, premium campaigns, fraud-sensitive |
| D-009-11 | Camera consent must explain: when, why, processing, storage, user benefit |
| D-009-12 | Visual: premium fintech clarity + immersive media; **no full neumorphism**; soft depth only |
| D-009-13 | MVP includes: auth, feed, earn marketplace, offer detail, watch-to-earn, wallet, payout setup, ID at withdrawal, tx history, basic creator profiles |
| D-009-14 | **Non-MVP exclusions**: vague life-event rewards, "earn for existing," non-verifiable benevolence, heavy social, fancy nav experiments |

---

## 5. Extracted Feature/System Concepts

**Feed card types**
- Premium sponsored: eye-verified badge + Icoin reward
- Standard sponsored
- Organic creator: Vicoin-only

**Earn marketplace**
- Daily availability hero (total Icoin potential)
- Premium eye-verified vs standard tiers
- Dual currency side-by-side per offer

**Wallet**
- 4-state balance model per currency
- Tab switching, semantic tx colors (green confirmed, amber pending, red outflow)
- Withdraw action highlighted

**Profile**
- Progressive trust step indicator
- Trust badges, payout methods, eye-tracking preference

**Bottom sheets**
- Premium watch: dual-currency pills + camera transparency notice
- Survey: no camera notice (correct absence)
- Withdraw: identity gate with red-tinted notice

---

## 6. Extracted UX/Design Ideas

- Color semantics: gold=Vicoins/utility, mint/green=Icoins/cash, amber=pending, red=gates/outflows
- Dark mode only in prototype
- Gradient thumbnail wells differentiate content types vertically

---

## 7. Extracted Technical Architecture Ideas

- MVP scope implies Supabase auth + payout + ID verification integration (production)
- Prototype is static HTML — no backend in this thread

---

## 8. Extracted Economy/Currency Ideas

- Vicoin/Icoin dual ledger with explicit earn rules by action type
- Pending/restricted balances required in wallet UX

---

## 9. Extracted Investor/Demo Ideas

- Prototype demonstrates progressive trust and camera consent copy — usable in investor narrative

---

## 10. Conflicts with Current Masterbrain

| Topic | Brief | SoT | Verdict |
|-------|-------|-----|---------|
| Positioning | Attention wallet + marketplace | Same | **Strong alignment** |
| Currency names | Vicoins / Icoins | aCoins, iCoins, vCoins, eCoins, oCoins | **Naming conflict** — Vicoin≈vCoins?, Icoin≈iCoins? aCoins role unclear |
| Core loops | Three loops listed | Watch→Verify→Reward primary | **Aligns** |
| Eye tracking scope | Selective, consent-first | Optional, qualification not surveillance | **Aligns** |
| Non-MVP list | Explicit exclusions | Golden rule implicit | **Aligns** |
| Visual direction | Premium fintech clarity | Not specified in SoT detail | **Compatible** — conv 003 later pivots design |

---

## 11. Canonical Candidates

| Candidate | Target |
|-----------|--------|
| Owner product brief (MSG 0) | **High** — candidate source for SoT provenance |
| Progressive trust ladder (5 steps) | `TRUST_SYSTEM/TRUST_AND_GOVERNANCE.md` |
| MVP / non-MVP boundary list | `CANONICAL/` or MVP flow doc |
| Wallet 4-state model | `ECONOMY/WALLET_SYSTEM.md` |
| Eye-tracking consent language requirements | `ATTENTION_SYSTEM/` |

---

## 12. Preserve-Only Notes

- Claude had no prior chat memory in follow-up message (session boundary)

---

## 13. Obsolete Notes

- "No full neumorphism" — partially superseded by conv 003 light neumorphic settings screens (scoped application)

---

## 14. Follow-Up Extraction Targets

- Determine if this brief was ingested into `i_SOURCE_OF_TRUTH.md` verbatim
- OpenAI `UX/UI Strategy Separation` (P0 rank 14) for design alignment
- Repo `MVP_CANONICAL_FLOW.md` cross-check
