# P0 Batch 01 — Conflicts and Duplicates

**Generated:** 2026-05-21  
**Cross-reference:** `MASTER_BRAIN/DUPLICATES_AND_CONFLICTS.md`, `CANONICAL/i_SOURCE_OF_TRUTH.md`

---

## 1. Naming Conflicts

### 1.1 Currency Names

| Surface | Names used | Source convs | SoT canonical |
|---------|------------|--------------|---------------|
| Product brief | Vicoins, Icoins | 009 | aCoins, iCoins, vCoins, eCoins, oCoins |
| Master Control File | iCoins, vCoins | 010 | Partial match (i/v) |
| Alphabet taxonomy | icoins + 25 letter coins incl. ucoins≈Vicoins | 007 | 5-coin MVP |
| Demo profile grids | a/i/v/f/e/s/b/c/xCoins | 002, 005 | Partial overlap |

**Conflict severity:** High  
**Resolution:** Owner mapping table required. Working hypothesis: Icoin→iCoins, Vicoin→vCoins, acoins→aCoins — **unverified**.

### 1.2 ucoins vs vCoins vs Vicoins

Conv 007 maps **ucoins** to existing Vicoins concept while SoT defines **vCoins** as utility. Three names, one intended role — **duplicate concept**.

---

## 2. Scope Conflicts

### 2.1 26-Coin vs 5-Coin MVP

| Claim | Source | SoT |
|-------|--------|-----|
| Full A–Z alphabet economy with tiered reveal | 007, 005 (demo grid) | 5 MVP currencies only |
| Compound coins rejected; tiers used internally | 007 | — |

**Verdict:** Alphabet system is **expansion layer** — mark Experimental until owner decides inclusion in MVP.

### 2.2 rcoins Clearing Hub

Conv 007: all earning types must pass through **rcoins** before conversion.  
SoT: no rcoins in MVP table.  
**Verdict:** Architectural proposal — not canonical.

### 2.3 xCoins / ωCoins

- **xCoins:** cross-platform bridge at T4 (004, 005, 007) — not in SoT  
- **ωCoins:** locked in demo economy screen (005) — undefined  
**Verdict:** Preserve-only until OpenAI extraction + owner review.

---

## 3. Product vs Implementation Gaps

### 3.1 Instant Demo Credit vs Pending Wallet

| Implementation | Behavior | Source |
|----------------|----------|--------|
| Investor demo watch flow | Balance updates instantly; auto-switch to wallet | 002, 005 |
| Product brief | Available + **Pending** + Restricted states required | 009 |
| SoT / POPS | Pending earnings, verification before settle | Masterbrain |

**Verdict:** Demo pattern **conflicts** with constitution wallet model — already noted in `DUPLICATES_AND_CONFLICTS.md` §2.4.

### 3.2 Eye-Tracking Prominence

| Source | Claim |
|--------|-------|
| Conv 003 demo | Dedicated Eye tab, camera always available in demo |
| Conv 009 brief | Camera only for high-value/premium/fraud-sensitive actions |
| SoT | Eye tracking optional |

**Verdict:** Demo over-scopes vs product policy — **demo-only conflict**.

---

## 4. Competing Implementations (Duplicate Lineages)

### 4.1 Investor Demo Architectures

| Lineage | Characteristics | Source convs |
|---------|-----------------|--------------|
| A | Single HTML, dark fintech, 4-tab + 9-step | 002, 005, 006 |
| B | Single HTML, glass/content-first v3, floating buttons | 003 |
| C | Phased HTML (shell → phase2 → phase5) | 006 |
| D | Vite + React scaffold at `~/i-app-demo/` | 005, 010 |
| E | Lovable iView (rejected) | 010 |

**Verdict:** Five parallel demo paths — **no canonical demo repo selected**.

### 4.2 Design System Versions

| Version | Direction | Source |
|---------|-----------|--------|
| v1 | Dark luxury fintech, neumorphic on dark | 002, 006, 010 |
| v2 | Content-first glass + light neumorphic settings | 003 |
| Brief | Premium fintech clarity, soft depth, no full neumorphism | 009 |

**Verdict:** v2 explicitly supersedes v1 for new work — repo may still contain v1 artifacts.

---

## 5. Strategic Tensions

### 5.1 Aggregator vs Native-First

Conv 004 recommends: import as launch accelerator, shift to native over time.  
SoT: marketplace framing without mandating aggregator-first GTM.  
**Verdict:** Strategy tension — not a direct contradiction.

### 5.2 Build Priority Order

| Source | Order |
|--------|-------|
| SoT | 1. Investor Demo 2. Wallet 3. Watch loop… |
| Conv 001 (production path) | 1. Design System 2. Navigation 3. Onboarding… |
| Conv 010 | DEMO track before production |

**Verdict:** DEMO-first aligns with SoT #1; **production** build order differs — reconcilable if scoped separately.

---

## 6. Duplicate Concepts Across Batch

| Concept | Appearances | Notes |
|---------|-------------|-------|
| 9-step presenter flow | 002, 003, 005 | Same narrative, different visual implementations |
| 60/30/10 split | 002, 004, 005, 007 | Consistent — not a conflict |
| Alex Rivera demo persona | 003, 004, 005, 007 | Shared mock user |
| `iappdemomarcelo.vercel.app` | 001, 005, 010 | Deploy target repeated |
| Watch 30s simulation | 002, 005 | Duplicate spec |
| Dual-track DEMO/PRODUCTION | 001, 008, 009, 010 | Consistent |

---

## 7. Conflicts Requiring OpenAI P0 Extraction

These Batch 01 Claude threads likely duplicate OpenAI P0 threads not yet extracted:

| Topic | OpenAI P0 rank | Claude batch |
|-------|----------------|--------------|
| aCoin Specification | 23 | 007 (acoins) |
| vCoin Development Guide | 20 | 007, 009, 010 |
| iCoin Development Strategy | 25 | 007, 009 |
| Alphabet Currency System | 28 | 007 |
| UX/UI Strategy Separation | 14 | 003, 009 |

**Action:** Batch 02 should include OpenAI P0 economy threads for deduplication.

---

## 8. Resolution Status

| Conflict | Status after Batch 01 |
|----------|----------------------|
| Coin naming | **Unresolved** |
| Demo lineage selection | **Unresolved** |
| 26 vs 5 coins | **Unresolved** |
| Instant vs pending wallet in demo | **Flagged** — demo labeled non-authoritative |
| Design system version | **v2 preferred** per conv 003 — not repo-enforced |
| Eye-tracking scope | **Aligned** if demo marked simulation-only |

---

## 9. Do Not Promote Without Resolution

1. Any single demo HTML as canonical implementation  
2. Full A–Z coin taxonomy into `ECONOMY/CURRENCY_ECOSYSTEM.md`  
3. rcoins hub as production architecture  
4. NFC payment system as MVP scope  
5. xCoins/ωCoins definitions  
