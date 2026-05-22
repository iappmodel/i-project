# P0 Batch 03 — Conflicts and Duplicates

**Generated:** 2026-05-22  
**Cross-reference:** `MASTER_BRAIN/DUPLICATES_AND_CONFLICTS.md`, `CANONICAL/i_SOURCE_OF_TRUTH.md`, `P0_BATCH_01_CONFLICTS_AND_DUPLICATES.md`, `P0_BATCH_02_CONFLICTS_AND_DUPLICATES.md`

> **P0 chat extraction batch 3 completed; currency evidence expanded but owner decision still required.**

---

## 1. Critical: iCoin / vCoin Letter Semantics Fork (NEW — Batch 03)

| Source | iCoin / Icoin role | vCoin / Vicoin role |
|--------|-------------------|---------------------|
| **SoT** | iCoins = cash-value, withdrawable | vCoins = utility (boosts, features) |
| **Chat (B01–B02)** | Icoins = cash-equivalent | Vicoins = internal utility |
| **OpenAI 025** | iCoin = **Identity-linked** withdrawable value | — |
| **OpenAI 028** | iCoin = identity-linked economic output | vCoin = **spendable platform value** |
| **Demos 024, 030** | iCoins cash-like display | vCoins utility display |

**Conflict severity:** Critical  
**Note:** Chat-era **economic roles align with OpenAI** (i=withdrawable-ish, v=spendable utility) but **letter assignments may be inverted** (chat Icoin=cash maps to OpenAI iCoin=identity-cash; chat Vicoin=utility maps to OpenAI vCoin=spendable).  
**Resolution:** Owner must lock letter→function mapping. **Do not resolve in extraction.**

---

## 2. Critical: rCoin Triple Definition (NEW — Batch 03)

| Source | rCoin / rcoins definition |
|--------|---------------------------|
| **Conv 007 (B01)** | Central **clearing pool** — all earn → pool → icoins/mcoins/ucoins |
| **Conv 023, 025 (B03)** | **Conversion hub** — behavior coins → rCoins → iCoins at 100:1 |
| **Conv 028 (B03)** | **Reputation** — behavior coin, Tier 3/4 letter R |
| **Conv 020 (B02)** | rCoin affects eligibility; no direct vCoin conversion |
| **Conv 029 (B03)** | Restates 007 clearing pool (meta) |

**Conflict severity:** Critical  
**Resolution:** Owner must define whether rCoin is (a) clearing pool, (b) conversion intermediary, (c) reputation score asset, or (d) merged concept. **Evidence mapped in `P0_BATCH_03_CURRENCY_RECONCILIATION_NOTES.md`.**

---

## 3. Critical: uCoin vs Vicoins (NEW — Batch 03)

| Source | uCoin / ucoins role |
|--------|---------------------|
| **Conv 007 (B01)** | ucoins mapped to **Vicoins** concept in clearing pipeline |
| **Conv 026 (B03)** | uCoin = **User Value** — long-term, non-cash, non-withdrawable |
| **Conv 028 (B03)** | uCoin = User Value in A–Z index |
| **SoT** | uCoins **not in MVP 5-coin set** |

**Conflict severity:** Critical  
**Resolution:** Retire 007 ucoins≈Vicoins mapping OR demote 026 to post-MVP. Owner decision required.

---

## 4. vCoin Semantic Fork (Extended from Batch 02)

| Source | vCoin role |
|--------|------------|
| **SoT** | Utility — not cash substitute |
| **Conv 020 (B02)** | Usable economic value after proof; withdrawable lane |
| **Conv 028 (B03)** | Spendable platform value (Tier 1 core) |
| **Chat Vicoins** | Internal utility credits |

**Batch 03 adds:** OpenAI Tier 1 elevates vCoin to **core spendable layer** — intensifies 020 vs SoT conflict.

---

## 5. Duplicate: "The Solution" UX Constitution

| Thread | Content | Verdict |
|--------|---------|---------|
| **Conv 014 (B02)** | Full "The Solution" 15-section doc | **Primary extract** |
| **Conv 021 (B03)** | Same doc pasted + Claude workflow | **Duplicate** — keep 014 for UX; 021 for Claude orchestration only |

---

## 6. Duplicate: Economy Meta-Summary

| Thread | Content | Verdict |
|--------|---------|---------|
| **Conv 007 (B01)** | 26-coin + rcoins pipeline | Primary |
| **Conv 015 (B02)** | Alpha A–Z registry | Primary (Claude) |
| **Conv 029 (B03)** | Summary of 007 + 015 + tooling | **Duplicate cite** — no new canon |

---

## 7. Navigation / IA Conflicts (Extended)

| Model | Structure | Source |
|-------|-----------|--------|
| Product IA | Feed, Earn, Wallet, Profile (4 tabs) | 014, 021 |
| Demo walkthrough | 8 screens | 024 |
| Investor demo build | 5 screens (Phase 2) | 030 |
| FLUX demo | Dashboard, Feed, Earn, Wallet, Studio, Profile | 012 (B02) |

**Verdict:** 4-tab product IA (014) vs multi-screen demos (024, 030) — **demo may differ from product**; not yet owner-locked.

---

## 8. A–Z vs 5-Coin MVP Scope

| Source | Scope |
|--------|-------|
| **SoT** | 5 MVP currencies: a/i/v/e/o |
| **Conv 007 (B01)** | 26-letter system |
| **Conv 028 (B03)** | Full A–Z + Tier 1 = 5 coins for MVP launch |
| **Conv 015 (B02)** | Claude Alpha registry |

**Verdict:** 028 **partially reconciles** — Tier 1 matches SoT count; full A–Z is Phase 2+. Owner must confirm.

---

## 9. Design Lineage (Minor — Batch 03)

| Lineage | Source |
|---------|--------|
| Soft depth / glass | 014, 018 (B02) |
| Glassmorphism demo-primary | 030 (B03) |
| 60/30/10 split viz | 024 (B03) |

**Verdict:** Demo aesthetics may diverge from product design system — not blocking.

---

## 10. Obsolete Concepts Confirmed

| Concept | Superseded by | Source |
|---------|---------------|--------|
| U = Unlock | U = User Value | 026 |
| Direct aCoin → iCoin | a → r → i pipeline | 023, 025 |
| Claude Code "remote control" as product | Gesture/blink product feature | 027 |
| Streak banner in demo MVP | Non-MVP exclusion | 029 cites; B02-012 |

---

## Conflict Severity Matrix

| ID | Conflict | Severity | Owner required |
|----|----------|----------|----------------|
| C-B03-01 | iCoin Identity vs cash naming | Critical | Yes |
| C-B03-02 | vCoin utility vs spendable | Critical | Yes |
| C-B03-03 | rCoin triple definition | Critical | Yes |
| C-B03-04 | uCoin vs Vicoins (007 vs 026) | Critical | Yes |
| C-B03-05 | A–Z full vs 5-coin MVP | High | Yes |
| C-B03-06 | 021 duplicate of 014 | Low | No — cite 014 |
| C-B03-07 | Demo IA vs 4-tab product | Medium | Yes |
| C-B03-08 | 029 meta-only | Low | No |

---

## Related

- `P0_BATCH_03_CURRENCY_RECONCILIATION_NOTES.md` — full evidence map
- `P0_BATCH_03_SUMMARY.md`
