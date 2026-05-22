# P0-030: Building a Functional Investor Demo with Core Features (Claude)

**Extraction batch:** P0 Batch 03  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `bc45f099-2841-45e1-87f0-b81cc3b95bfb` |
| Title | Building a functional investor demo with core features |
| Date created | 2026-03-20 |
| Date updated | 2026-03-20 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json#bc45f099-2841-45e1-87f0-b81cc3b95bfb` |
| Messages | 4 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 105 | P0 | Demo, UX, Economy (display), Dev workflow |

---

## 3. Project-Specific Summary

Strategy for a **QR-code deployable investor demo** at `iappdemomarcelo.vercel.app`. Nine-phase build plan, zero backend, optional TF.js eye-tracking. Emphasizes **glassmorphism UI** and a **7-property button customizer** (extrusion, transparency, texture, structure, size, draggable placement).

Uses **iCoins + vCoins** (chat naming). Phase 2 mentions **5-screen navigation** — conflicts with 4-tab IA from convs 014/021.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-030-01 | Investor demo = **static/deployable web app**, no backend for MVP demo | High |
| D-030-02 | QR code deployment for in-person investor meetings | High |
| D-030-03 | 9-phase build plan (foundation → polish) | High |
| D-030-04 | 7-property button customizer as demo differentiator | Medium |
| D-030-05 | Optional TF.js eye-tracking for attention demo | Medium |
| D-030-06 | Glassmorphism as primary visual language for demo | Medium |

---

## 5. Extracted Feature/System Concepts

### 9-phase plan (summarized)

1. Project scaffold + deploy pipeline
2. Navigation shell (5 screens cited)
3. Feed with mock content
4. Watch & Earn flow
5. Wallet (iCoins + vCoins)
6. Button customizer
7. Eye-tracking overlay (optional)
8. Polish + animations
9. QR deploy + investor script

### 7-property button customizer

- Extrusion, transparency, texture, structure, size, color, draggable placement

---

## 6. Extracted UX/Design Ideas

- Glassmorphism cards and nav
- Draggable UI elements for live demo customization
- Dark theme with green money accents

---

## 7. Extracted Technical Architecture Ideas

- Vercel static deploy
- LocalStorage for demo state persistence
- TF.js optional module — lazy load

---

## 8. Extracted Economy/Currency Ideas

- Wallet displays iCoins (cash-like) + vCoins (utility)
- Watch & Earn shows coin earn animation
- No alphabet coin detail

---

## 9. Extracted Investor/Demo Ideas

| Idea | Detail |
|------|--------|
| QR deploy | Instant access at meetings |
| Live button customizer | "Build your own UI" wow moment |
| Eye-tracking | Attention verification proof-of-concept |
| Zero backend | Fast iteration, no infra cost |

---

## 10. Conflicts with Current Masterbrain

| Topic | Demo | SoT / prior canon | Verdict |
|-------|------|-------------------|---------|
| Navigation | 5 screens (Phase 2) | 4-tab IA (014/021) | **IA conflict** |
| iCoins/vCoins | Chat naming | SoT a/i/v/e/o | Naming only |
| Glassmorphism | Primary demo style | Soft depth (014) | **Visual language fork** |

---

## 11. Conflicts with P0 Batch 1 and 2

| Topic | Prior | This thread |
|-------|-------|-------------|
| 4-tab IA (014, 021) | Feed/Earn/Wallet/Profile | 5-screen nav | **Resolve for demo vs product** |
| Walkthrough (024) | 8-screen HTML | 9-phase plan | Complementary — different artifacts |
| Eye tracking (017, 027) | TF.js / MediaPipe | TF.js optional here | Align |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B03-21 | QR-deployable zero-backend investor demo pattern | C |
| CC-B03-22 | 7-property button customizer (demo feature) | D — demo only |
| CC-B03-23 | 9-phase demo build plan | C |

---

## 13. Preserve-Only Notes

- `iappdemomarcelo.vercel.app` URL — verify live/dead
- Glassmorphism vs soft-depth — aesthetic choice for demo only

---

## 14. Obsolete Notes

- 5-screen nav if 4-tab IA is locked for product (demo may differ)

---

## 15. Follow-Up Extraction Targets

- Audit Vercel deploy and repo branch for demo artifact
- Reconcile demo IA (5 screen) vs product IA (4 tab)
