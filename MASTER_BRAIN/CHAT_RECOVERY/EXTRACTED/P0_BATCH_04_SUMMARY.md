# P0 Chat Extraction — Batch 04 Summary

**Extracted:** 2026-05-22  
**Scope:** P0 conversations ranked 31–40 from `CHAT_RECOVERY_PRIORITY_QUEUE.md` (4 Claude + 6 OpenAI)  
**Output directory:** `MASTER_BRAIN/CHAT_RECOVERY/EXTRACTED/conversations/`  
**Special focus:** Letter specs (E/W/G), attention/reward trust boundary, demo IA reconciliation, build-process meta

> **P0 chat extraction batch 4 completed; further P0/P1 extraction still required before final canonicalization.**

---

## Batch Overview

| # | Title | Source | Score | Msgs | Extraction file |
|---|-------|--------|------:|-----:|-----------------|
| 31 | Eye Tracking Explained | OpenAI | 86 | 20 | `031_eye_tracking_explained.md` |
| 32 | Comprehensive social media app development | Claude | 85 | 8 | `032_comprehensive_social_media_app_development.md` |
| 33 | eCoin Development Blueprint | OpenAI | 85 | 6 | `033_ecoin_development_blueprint.md` |
| 34 | wCoin Development Framework | OpenAI | 85 | 6 | `034_wcoin_development_framework.md` |
| 35 | i App Development Roadmap | OpenAI | 84 | 2 | `035_i_app_development_roadmap.md` |
| 36 | Turning scattered project attempts into a cohesive vision | Claude | 81 | 8 | `036_turning_scattered_project_attempts_into_a_cohesive_vision.md` |
| 37 | App development request | Claude | 79 | 2 | `037_app_development_request.md` |
| 38 | Document analysis request | Claude | 79 | 6 | `038_document_analysis_request.md` |
| 39 | Eye-Tracking and Facial Control | OpenAI | 77 | 67 | `039_eye_tracking_and_facial_control.md` |
| 40 | gCoin Development Guide | OpenAI | 77 | 14 | `040_gcoin_development_guide.md` |

**Raw sources:**

- Claude: `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json`
- OpenAI: `conversations-001.json` (035), `conversations-002.json` (031, 039), `conversations-004.json` (033, 034, 040)

**Export limitation:** Conv 039 is ~150k chars — extraction summarizes ACS model, audit findings, and backend contracts; not full prompt reproduction.

---

## Strongest Recovered Systems

### 1. Attention Trust Boundary + ACS Model (Conv 039)

`attention_sessions` schema, split `issue-attention-reward` endpoints, **ACS = PC + EQ − Penalty** scoring at 1Hz, session qualification gates, mathematical reward gating. Owner confirmed **session bypass still exists** — P0 blocker. **Strongest technical recovery in batch 04.**

### 2. eCoin Engagement Layer (Conv 033)

**E = Engagement** production spec: active participation above aCoin attention prerequisite, quality-weighted anti-spam/brigading. **Strong align with SoT eCoins.**

### 3. Four-Tab Product IA (Conv 038)

Feed / Earn / Wallet / Profile with soft depth + dark/light — **strongest Claude alignment with conv 014 UX constitution.** Contrasts 5-screen demos (032, 037, 035).

### 4. Build Order Meta-Strategy (Conv 036)

Phase 0 tokens → Phase 1 Vite demo → Phase 2 Supabase → Phase 3 connect; `build-log.md` continuity. Addresses restart-loop root cause.

### 5. Letter Specs W + G (Convs 034, 040)

**wCoin = verified work completion** (not time). **gCoin = Go/Growth** dual layer — resolves Go vs Growth; deprecates G=Governance.

### 6. Unified Vision Stack (Conv 031)

MediaPipe + TF.js + optional WebGazer; single camera pipeline for eye-tracking + hand/gesture remote control.

---

## Cross-Batch Themes (Batch 04 internal)

| Theme | Threads | Notes |
|-------|---------|-------|
| OpenAI letter specs | 033, 034, 040 | E/W/G expand A–Z beyond Tier 1 |
| Early Claude MVP duplicates | 032, 037 | Vicoin/Icoin artifact — merge citations |
| Product IA | 038 (4-tab) vs 032/037/035 (5-screen) | **038 + 014 vs demo stacks** |
| Attention implementation | 031, 039 | 031 scaffold vs 039 production spec |
| Stack archaeology | 035 (Flutter/Firebase) vs 031/039 (React/Supabase) | 035 obsolete |
| Local/Go flows | 040, 034, 035 | GPS, I'm Going, pending release |

---

## Cross-Batch Themes (vs Batches 01–03)

| Theme | Prior batches | Batch 04 | Action |
|-------|---------------|----------|--------|
| eCoin semantics | SoT: engagement | 033 full spec + aCoin prerequisite | **Promote candidate** |
| gCoin / G letter | 028 index | 040 Go/Growth; G≠Governance | **Update G definition** |
| wCoin | Not extracted | 034 Work spec | Post-MVP letter |
| Session-gated rewards | 023 pipeline implied | 039 explicit schema + owner YES bypass | **Critical fix path** |
| Demo IA | 024/030 8/9-phase demos | 038 4-tab product shell | **Demo vs product split** |
| Vicoin/Icoin | B01–B03 pervasive | 032, 037, 035, 039 audit | **Naming fork persists** |
| MediaPipe vs TF.js | 017, 027, 031 | 039 ACS layered model | **Merge into ATTENTION_SYSTEM** |

---

## Reusable Concepts (Promote-Worthy)

1. **`attention_sessions` + split reward endpoints** (039)
2. **ACS scoring model (PC/EQ/Penalty)** (039)
3. **eCoin = verified engagement above attention gate** (033)
4. **4-tab IA content spec** (038) — product reference
5. **Phase 0→3 build order + build-log.md** (036)
6. **gCoin Go/Growth dual layer** (040) — post-MVP
7. **wCoin = verified task completion** (034) — post-MVP
8. **Unified camera pipeline** (031) — experimental

---

## Obsolete / Duplicate Concepts

| Concept | Status |
|---------|--------|
| Flutter + Firebase stack (035) | Superseded by React/Vite/Supabase lineage |
| 032 + 037 Claude MVP artifacts | Duplicate — cite once |
| G = Governance coin (040 prior file) | Superseded by Go/Growth |
| Exact gaze certification | Rejected — use probabilistic ACS (039) |
| 5-screen nav as product IA | Demo-only if 4-tab locked (038/014) |
| Eye-tracking simulation as "real" (037) | Demo disclaimer only |
| Profile streaks (038) | Conflicts conv 012 removal |

---

## Evidence Gaps After Batch 04

| Gap | Priority |
|-----|----------|
| Remediation status: session bypass on issue-reward (owner YES in 039) | **Critical** |
| Locate 038 HTML prototype + 037 `i-app.jsx` on disk | High |
| `build-log.md` existence in repos | High |
| gCoin "Go coins" prior chat referenced in 040 | High |
| Re-verify eye-earn-sparkle audit findings vs current repo | High |
| Owner lock: product IA (4-tab) vs investor demo IA | Medium |
| W/G/E letters in MVP vs post-MVP scope | Medium |
| Prior Go-coins development thread | Medium |

---

## Remaining P0 Work

**64 P0 conversations remain** (104 total − 40 extracted).

**Next batch candidates (ranks 41–50):** See `CHAT_RECOVERY_PRIORITY_QUEUE.md` P0 band continuation (e.g. openai **Face Gesture Phone Control**, **Promotional Video Eye-Tracking**, claude **Best skills to install**, etc.).

---

## Canonicalization Readiness

**Not ready.**

P0 chat extraction batch 4 completed; **further P0/P1 extraction still required before final canonicalization.**

Blockers:

- 64 P0 threads not extracted
- **Attention session bypass** unverified fixed (039)
- **iCoin/vCoin/rCoin/uCoin forks** from B03 unresolved
- Competing IA: 4-tab product (038) vs 5/8-screen demos
- A–Z expansion letters (W/G) vs SoT 5-coin MVP scope
- Stack archaeology (035) vs current repo not fully reconciled in canon

---

## Related Artifacts

- `P0_BATCH_04_CANONICAL_CANDIDATES.md`
- `P0_BATCH_04_CONFLICTS_AND_DUPLICATES.md`
- `P0_BATCH_04_EXTRACTION_LOG.tsv`
- `P0_BATCH_01_SUMMARY.md` … `P0_BATCH_03_SUMMARY.md` (cross-reference)
- `P0_BATCH_03_CURRENCY_RECONCILIATION_NOTES.md` (currency cross-ref)
