# P0 Batch 04 — Conflicts and Duplicates

**Generated:** 2026-05-22  
**Cross-reference:** `MASTER_BRAIN/DUPLICATES_AND_CONFLICTS.md`, `CANONICAL/i_SOURCE_OF_TRUTH.md`, `P0_BATCH_01–03_CONFLICTS_AND_DUPLICATES.md`

> **P0 chat extraction batch 4 completed; further P0/P1 extraction still required before final canonicalization.**

---

## 1. Critical: Attention Session Bypass (NEW — Batch 04)

| Source | Claim |
|--------|-------|
| **Conv 039 audit** | PromoVideosFeed bypasses validate-attention; hardcoded score 95; eye-tracking disabled → still eligible |
| **Conv 039 owner confirm** | **YES** — client can still issue reward without valid `attentionSessionId` |
| **Conv 039 proposed fix** | Split endpoints; session required; server-computed multiplier |
| **SoT core loop** | Watch → Verify → Reward — broken if bypass exists |

**Conflict severity:** Critical  
**Resolution:** Verify fix in repo; re-run acceptance tests from 039. **Do not canonicalize reward logic until closed.**

---

## 2. Critical: Product IA vs Demo IA (NEW — Batch 04)

| Source | Navigation model |
|--------|------------------|
| **Conv 038 (B04)** | **4 tabs:** Feed / Earn / Wallet / Profile + soft depth |
| **Conv 014, 021 (B02–B03)** | Same 4-tab UX constitution |
| **Conv 032, 037 (B04)** | **5-screen** cross-nav + floating 3D buttons |
| **Conv 035 (B04)** | **5-screen** layout (Flutter roadmap) |
| **Conv 024, 030 (B03)** | 8-screen walkthrough / 9-phase investor demo |

**Conflict severity:** High  
**Resolution:** Owner lock — **product IA (4-tab)** vs **investor demo IA (multi-screen)** may diverge intentionally. Cite 038 for product; 030 for demo.

---

## 3. High: gCoin Letter Semantics Fork (NEW — Batch 04)

| Source | G / gCoin definition |
|--------|---------------------|
| **Prior currency file (040 filecite)** | G = **Governance** — voting power, non-convertible |
| **Conv 040 (B04)** | G = **Go/Growth** — dual layer; governance = Trust permissions |
| **Conv 028 (B03)** | G in A–Z index — verify prior assignment |
| **SoT MVP** | No gCoin in 5-coin set (a/i/v/e/o) |

**Conflict severity:** High (within A–Z expansion)  
**Resolution:** Owner lock G = Go/Growth; remove Governance-as-coin. Post-MVP scope.

---

## 4. High: Stack Archaeology Fork (NEW — Batch 04)

| Source | Stack |
|--------|-------|
| **Conv 035 (B04, 2025-04)** | Flutter + Firebase + Stripe + TF Lite |
| **Conv 031, 039 (B04)** | React/Vite/Capacitor + Supabase Edge Functions |
| **Repo evidence (039 audit)** | React + Vite + Supabase + Capacitor |
| **Conv 039 Flutter commands** | ML Kit scaffold — parallel mobile-native path |

**Conflict severity:** Medium (035 largely obsolete)  
**Resolution:** Treat 035 as historical; canonical stack = React/Supabase unless owner re-pivots.

---

## 5. Duplicate: Early Claude MVP Artifacts (NEW — Batch 04)

| Pair | Overlap |
|------|---------|
| **032 ↔ 037** | Same Vicoin/Icoin React MVP: full-screen media, eye-tracking indicator, 3D buttons, wallet |
| **032 ↔ 035 feature list** | Promo watch, dual currency, eye-tracking, local map — different stacks |

**Conflict severity:** Low (duplicate evidence)  
**Resolution:** Cite **032** as primary enumeration; **037** as deliverables-focused duplicate. One row in DUPLICATES index.

---

## 6. Carry-Forward from Batches 01–03 (unchanged, reinforced by B04)

| Fork | Batch 04 reinforcement |
|------|--------------------------|
| Vicoin/Icoin vs a/i/v/e/o | 032, 037, 035, 039 audit all use chat naming |
| rCoin triple definition | 033 references rCoin hub — no resolution |
| uCoin vs Vicoins | Not addressed in B04 |
| iCoin Identity vs cash (025) | 039 uses Icoins as cashable — chat naming |

---

## 7. Internal: eCoin vs Engagement Demos

| Source | Engagement economics |
|--------|---------------------|
| **Conv 033** | Full eCoin spec with quality weighting |
| **Conv 032/037** | Likes/comments as UI only — no eCoin |
| **SoT** | eCoins = meaningful participation |

**Resolution:** 033 is canonical candidate for E; demos are pre-letter-era.

---

## 8. Internal: wCoin vs gCoin-Go Overlap

| Source | Physical/local action |
|--------|----------------------|
| **Conv 034 wCoin** | GPS check-in, local tasks, campaign work |
| **Conv 040 gCoin-Go** | I'm Going, GPS arrival, pending release |
| **Conv 035 roadmap** | Local business map promos |

**Resolution:** Coordinate — gCoin-Go = action/intent layer; wCoin = verified task completion outcome. May share GPS proof pipeline.

---

## 9. Obsolete / Superseded (Batch 04)

| Item | Superseded by |
|------|---------------|
| G = Governance coin | 040 Go/Growth |
| Flutter/Firebase MVP roadmap (035) | React/Supabase repo lineage |
| Exact gaze certification (031 marketing tone) | 039 probabilistic ACS |
| Profile streaks in 038 prototype | Conv 012 streak bar removal |
| Eye-tracking "simulation" as production (037) | 031/039 real MediaPipe stack |

---

## 10. Evidence Gaps (Conflicts Unresolved)

- Session bypass fix status in live repo
- Which demo HTML/JSX artifacts survive on disk
- G letter owner lock for alphabet index update
- W/G/E inclusion timeline vs MVP ship
