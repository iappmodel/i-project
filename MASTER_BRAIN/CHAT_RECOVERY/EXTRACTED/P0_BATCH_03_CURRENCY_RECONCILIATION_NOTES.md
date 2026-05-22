# P0 Batch 03 — Currency Reconciliation Notes

**Generated:** 2026-05-22  
**Purpose:** Map evidence and conflicts across coin symbols — **no owner resolution**  
**Cross-reference:** `CANONICAL/i_SOURCE_OF_TRUTH.md`, `ECONOMY/CURRENCY_ECOSYSTEM.md`, batches 01–03 extractions

> **P0 chat extraction batch 3 completed; currency evidence expanded but owner decision still required.**

---

## Executive Summary

Batch 03 adds the **OpenAI Alphabet Currency System** as the deepest structured economy evidence in the archive. It **partially aligns** with SoT on Tier 1 letter count (A/I/V/E/O) and aCoin attention foundation, but **conflicts critically** on:

1. **iCoin semantics** — SoT "cash-value" vs OpenAI "Identity-linked value"
2. **vCoin semantics** — SoT "utility" vs OpenAI "spendable platform value" vs conv 020 "economic usability layer"
3. **rCoin** — three incompatible definitions across batches
4. **uCoin** — not in SoT MVP; conflicts batch 01 Vicoin mapping
5. **Scope** — full A–Z (26 letters) vs 5-coin MVP

**Owner decision still required for all items below.**

---

## 1. SoT MVP Baseline (Constitution)

From `CANONICAL/i_SOURCE_OF_TRUTH.md`:

| Symbol | Name | Function |
|--------|------|----------|
| aCoins | Attention | Verified attention — foundation |
| iCoins | Cash-value | Withdrawable, spendable, tradable |
| vCoins | Utility | Boosts, features, tools — **not cash substitute** |
| eCoins | Engagement | Meaningful participation |
| oCoins | Origin | Imported value, external provenance |

**SoT does not define:** rCoins, uCoins, full A–Z taxonomy, conversion pipelines, or letter semantics beyond symbols.

---

## 2. aCoins — Evidence Map

| Source | Definition | Pipeline / notes |
|--------|------------|------------------|
| **SoT** | Attention foundation | — |
| **Conv 023 (B03)** | Verified human attention quality (6 dimensions) | a → r → i default |
| **Conv 028 (B03)** | A = Attention, Tier 1 core | Conversion engine |
| **Conv 020 (B02)** | Input to a→i→v pipeline | Different output path |
| **Chat demos** | Not shown separately | iCoins/vCoins display only |

### Alignment

| Check | Status |
|-------|--------|
| aCoin = attention | **Strong align** (SoT + 023 + 028) |
| aCoin withdrawable directly | **Conflict** — 023 says no, must convert |
| aCoin → rCoin → iCoin pipeline | **SoT silent** — new evidence |

### Conflicts

- **023 vs 020:** aCoins feed r→i hub vs a→i→v pipeline
- **Demos (024, 030):** aCoins not displayed — wallet shows i/v only

### Canonical candidate

**CC-B03-01** — aCoin verified attention spec (023) — promote after pipeline lock

---

## 3. iCoins / Icoins — Evidence Map

| Source | Letter | Definition | Withdrawable? |
|--------|--------|------------|---------------|
| **SoT** | I | Cash-value | Yes |
| **Chat B01–B02** | I (Icoins) | Cash-equivalent verified rewards | Yes (implied) |
| **Conv 025 (B03)** | I = **Identity** | Identity-linked economic value | Yes — only alphabet withdrawable class |
| **Conv 028 (B03)** | I = Identity | Root identity-linked value, Tier 1 | Yes |
| **Conv 023 (B03)** | — | Output of rCoin conversion | Via pipeline |
| **Demos 024, 030** | iCoins | Cash-like primary balance | Display only |

### Alignment

| Check | Status |
|-------|--------|
| iCoin is primary cash/withdrawable output | **Align** (SoT + chat + 025) |
| iCoin = Identity semantic | **Conflict** — SoT says "cash-value" not "Identity" |
| iCoin earned directly from watch | **Conflict** — 025 requires rCoin hub |
| Chat "Icoins" = OpenAI "iCoin" | **Naming align; letter semantics differ** |

### Conflicts

| ID | Conflict | Sources |
|----|----------|---------|
| IC-01 | Identity vs cash-value framing | 025/028 vs SoT |
| IC-02 | Direct earn vs rCoin pipeline | Chat demos vs 023/025 |
| IC-03 | iCoin states (6-state machine) | 025 — not in SoT or chat |

### Owner questions (unresolved)

1. Is "Identity-linked" descriptive of cash-value, or a **different economic class**?
2. Retain chat label "Icoins" or migrate to SoT "iCoins" with OpenAI semantics?
3. Adopt 6-state lifecycle (025) for wallet?

---

## 4. vCoins / Vicoins — Evidence Map

| Source | Letter | Definition | Spendable? | Withdrawable? |
|--------|--------|------------|------------|---------------|
| **SoT** | V | Utility — boosts, features | Yes (utility) | **No** (not cash) |
| **Chat B01–B02** | V (Vicoins) | Internal utility credits | Yes (in-app) | No |
| **Conv 020 (B02)** | vCoin | Usable economic value **after proof** | Yes | **Yes** (withdrawable lane) |
| **Conv 028 (B03)** | V | **Spendable platform value**, Tier 1 core | Yes | Unclear |
| **Demos 024, 030** | vCoins | Secondary utility balance | Yes | No |

### Alignment

| Check | Status |
|-------|--------|
| vCoin ≠ primary cash | **Align** (SoT + chat) |
| vCoin spendable in-platform | **Align** (all sources) |
| vCoin withdrawable | **Conflict** — 020 yes; SoT/chat no |

### Conflicts

| ID | Conflict | Sources |
|----|----------|---------|
| VC-01 | Utility vs spendable economic layer | SoT vs 020 vs 028 |
| VC-02 | vCoin in Tier 1 core vs utility tier | 028 vs SoT framing |
| VC-03 | vCoin vs iCoin spend boundaries | 028 — both Tier 1 spendable |

### Owner questions (unresolved)

1. Does OpenAI "spendable platform value" = SoT "utility" or = conv 020 "economic usability"?
2. Can vCoins ever enter withdrawable lane (020) or strictly iCoins only (025)?

---

## 5. uCoins — Evidence Map

| Source | Letter | Definition | In MVP? |
|--------|--------|------------|---------|
| **SoT** | — | **Not defined** | No |
| **Conv 007 (B01)** | U? | ucoins ≈ **Vicoins** in clearing output | Implied yes |
| **Conv 026 (B03)** | U = **User Value** | Long-term non-cash reputation asset | **Post-MVP** (026) |
| **Conv 028 (B03)** | U = User Value | Tier 2+ letter | Phase 2+ |

### Conflicts

| ID | Conflict | Severity |
|----|----------|----------|
| UC-01 | 007 ucoins≈Vicoins vs 026 User Value | **Critical** |
| UC-02 | uCoin in MVP vs post-MVP | High |
| UC-03 | U=Unlock (obsolete) vs U=User Value | Resolved — User Value wins (026) |

### Owner questions (unresolved)

1. Drop uCoin from MVP entirely (SoT 5-coin)?
2. If uCoin exists post-MVP, retire 007 Vicoin mapping?
3. Relationship to trust score / tiers?

---

## 6. rCoins — Evidence Map (Triple Fork)

| Source | Definition | Role in pipeline |
|--------|------------|------------------|
| **SoT** | **Not defined** | — |
| **Conv 007 (B01)** | **Central clearing pool** | All earn → pool → distribute to icoins/mcoins/ucoins |
| **Conv 023 (B03)** | **Conversion intermediary** | aCoins → rCoins (1:1) → iCoins (100:1) |
| **Conv 025 (B03)** | **Conversion hub** | behavior coins → rCoins → iCoins |
| **Conv 028 (B03)** | **R = Reputation** | Behavior coin, Tier 3/4 — distinct letter semantics |
| **Conv 020 (B02)** | Eligibility modifier | rCoin affects vCoin eligibility; no direct conversion |
| **Conv 029 (B03)** | Restates 007 | Meta only |

### Fork diagram

```
Fork A (007):  [all earns] → rcoins POOL → {icoins, mcoins, ucoins}
Fork B (023/025): [behavior coins] → rcoins HUB → icoins (100:1)
Fork C (028):  rCoin = REPUTATION asset (letter R, Tier 3/4)
Fork D (020):  rCoin → eligibility only (no direct vCoin)
```

### Conflicts

| ID | Conflict | Severity |
|----|----------|----------|
| RC-01 | Pool vs hub vs reputation — same symbol | **Critical** |
| RC-02 | 100:1 r→i rate (023/025) vs 007 multi-output | High |
| RC-03 | rCoin in MVP vs post-MVP | High — 028 Tier 3/4 |

### Owner questions (unresolved)

1. Are "clearing pool," "conversion hub," and "reputation coin" the **same rCoin** with phases, or **three concepts** needing rename?
2. Is rCoin required for MVP or defer to post-MVP?
3. Default 100:1 rate — economic lock?

---

## 7. Full A–Z Alphabet Taxonomy (Conv 028)

### Tier 1 — MVP Core (aligns SoT letter count)

| Letter | Coin | OpenAI definition | SoT align? |
|--------|------|-------------------|------------|
| A | aCoin | Attention | **Yes** |
| I | iCoin | Identity-linked value | Partial |
| V | vCoin | Spendable platform value | Partial |
| E | eCoin | Engagement | **Yes** |
| O | oCoin | Offers | Partial (SoT: Origin) |

**Note:** SoT oCoins = "Origin / imported value"; OpenAI oCoin = "Offers / sponsored" — **semantic drift on O**.

### Tier 2–4 — Selected letters (evidence in 028; letters B–Z mostly unextracted)

| Letter | Coin | Role (028 index) | Extracted in B03? |
|--------|------|------------------|-------------------|
| R | rCoin | Reputation | Yes — conflicts hub |
| U | uCoin | User Value | Yes — conv 026 |
| T | tCoin | Time / session | Index only |
| S | sCoin | Social proof | Index only |
| … | … | 16+ additional | P1 batch target |

### Scope conflict

| Model | Coin count | MVP |
|-------|------------|-----|
| SoT | 5 | a/i/v/e/o |
| Conv 007 | 26 | All letters earn |
| Conv 028 | 26 | Tier 1 = 5 for launch; expand later |
| Conv 015 (Claude) | A–Z registry | Experimental |

**028 partial reconciliation:** Ship Tier 1 at MVP; A–Z expands post-launch — **needs owner confirmation**.

---

## 8. Cross-Pipeline Comparison

| Pipeline | Source | Flow |
|----------|--------|------|
| **SoT** | Constitution | Implicit — no pipeline specified |
| **Chat clearing** | 007 | earn → rcoins pool → {icoins, mcoins, ucoins} |
| **OpenAI letter** | 023/025 | behavior → rcoins → icoins (100:1) |
| **OpenAI vCoin** | 020 | proof → a/i → vCoin (usable economic) |
| **OpenAI engine** | 028 | Earn → Reward Issuance → Conversion ← Trust → Saga |

**No single pipeline is canonical.** Owner must pick or merge.

---

## 9. Demo vs Product Currency Display

| Artifact | Coins shown | Source |
|----------|-------------|--------|
| i-app-walkthrough.html | iCoins + vCoins | 024 |
| iappdemomarcelo demo | iCoins + vCoins | 030 |
| Coin economy slide | 60/30/10 split | 024 |
| OpenAI wallet mocks | a/i/r separate | 023, 025 |

**Gap:** Demos use chat naming (i/v only); OpenAI specs show full pipeline coins (a/r/i).

---

## 10. Reconciliation Matrix (Evidence Only — No Resolution)

| Symbol | SoT | Chat | B01 | B02 | B03 | Conflict level |
|--------|-----|------|-----|-----|-----|----------------|
| aCoins | Attention | — | — | 020 input | 023 spec, 028 Tier 1 | **Low** |
| iCoins | Cash-value | Icoins=cash | 007 output | 013–016 | 025 Identity, 028 Tier 1 | **Critical** |
| vCoins | Utility | Vicoins=utility | 007≈ucoins | 020 spendable | 028 Tier 1 spendable | **Critical** |
| eCoins | Engagement | — | — | — | 028 Tier 1 | **Low** |
| oCoins | Origin | — | — | — | 028 Offers | **Medium** (O semantic) |
| uCoins | — | — | 007≈Vicoins | — | 026 User Value | **Critical** |
| rCoins | — | — | 007 pool | 020 eligibility | 023 hub, 028 Reputation | **Critical** |
| A–Z | 5 MVP | — | 007 26-coin | 015 alpha | 028 master | **High** |

---

## 11. Recommended Owner Decision Agenda (Not Decisions — Agenda Only)

1. **Letter lock:** Confirm A/I/V/E/O Tier 1 as MVP; defer B–Z?
2. **iCoin framing:** Cash-value (SoT) vs Identity-linked (OpenAI) — merge or pick?
3. **vCoin framing:** Utility (SoT) vs spendable platform (028) vs economic usability (020)?
4. **rCoin disambiguation:** Pool / hub / reputation — one coin or rename?
5. **uCoin fate:** Cut from MVP; if kept, retire 007 Vicoin mapping?
6. **Pipeline lock:** 007 clearing vs 023 a→r→i vs 020 a→i→v vs 028 engines?
7. **Demo naming:** Continue iCoins/vCoins in demos until alphabet locked?
8. **O letter:** Origin (SoT) vs Offers (028)?

---

## 12. Evidence Gaps

| Gap | Priority |
|-----|----------|
| `i-app-economy-rules.md` on disk | Critical |
| Remaining letters B–Z per-letter specs | High |
| Repo Supabase schema vs 028 migrations | High |
| Owner-written decision on Vicoin/Icoin | Critical |
| Economic rate parameters (100:1, fees, trust multipliers) | Medium |
| oCoin Origin vs Offers semantic | Medium |

---

## Related Artifacts

- `P0_BATCH_03_CONFLICTS_AND_DUPLICATES.md`
- `P0_BATCH_03_CANONICAL_CANDIDATES.md`
- `P0_BATCH_01_CONFLICTS_AND_DUPLICATES.md` (007 rcoins)
- `P0_BATCH_02_CONFLICTS_AND_DUPLICATES.md` (020 vCoin)
- `ECONOMY/CURRENCY_ECOSYSTEM.md`
