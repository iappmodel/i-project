# P0-027: Remote Control Development (Claude)

**Extraction batch:** P0 Batch 03  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `85295173-080e-47c1-acfd-c598c4735222` |
| Title | Remote control development |
| Date created | 2026-03-21 |
| Date updated | 2026-03-21 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json#85295173-080e-47c1-acfd-c598c4735222` |
| Messages | 8 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 105 | P0 | Attention verification, UX, Economy (earn triggers) |

---

## 3. Project-Specific Summary

Thread begins with confusion between **Claude Code remote-control docs** and **[ i ] app "remote control"** — a product feature using **MediaPipe Hands + Face Mesh** for gesture and blink detection to control feed navigation and trigger **Icoin rewards**.

Pivots to in-app **hands-free interaction**: thumbs-up, left-blink, swipe gestures mapped to feed actions with verification hooks.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-027-01 | "Remote control" in [ i ] = **camera-based gesture/blink control**, not IDE remote | High |
| D-027-02 | MediaPipe Hands + Face Mesh as detection stack | High |
| D-027-03 | Verified gestures can trigger **Icoin earn events** | Medium |
| D-027-04 | Thumbs-up = like/confirm; left blink = next/skip (examples) | Medium |

---

## 5. Extracted Feature/System Concepts

- On-device ML for privacy (no server round-trip for detection)
- Gesture → verification → reward pipeline
- Accessibility / hands-free use case
- Integration with Watch→Verify→Earn loop

---

## 6. Extracted UX/Design Ideas

- Optional mode — not default navigation
- Visual feedback when gesture recognized
- Camera permission gate with clear value prop

---

## 7. Extracted Technical Architecture Ideas

- TensorFlow.js or MediaPipe in browser/WebView
- Client-side landmark detection → event bus → earn engine
- Fallback to touch if camera denied

---

## 8. Extracted Economy/Currency Ideas

- Icoin rewards on verified gesture completion
- Ties to attention verification (presence + intentional action)
- No alphabet coin detail beyond Icoin trigger

---

## 9. Extracted Investor/Demo Ideas

- Demo differentiator: "control with your hands/eyes"
- Pairs with conv 030 TF.js eye-tracking mention

---

## 10. Conflicts with Current Masterbrain

| Topic | Thread | SoT | Verdict |
|-------|--------|-----|---------|
| Icoin trigger | Chat naming | iCoins = cash-value | Aligns on reward type |
| Verification | Gesture-based | Attention foundation | **Extends aCoin proof vectors** |

---

## 11. Conflicts with P0 Batch 1 and 2

| Topic | Prior | This thread |
|-------|-------|-------------|
| Eye tracking (017) | TF.js gaze verification | MediaPipe hands/face — **complementary stacks** |
| Remote control naming | N/A | Disambiguate from Claude Code tooling |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B03-14 | Remote control = gesture/blink product feature | C |
| CC-B03-15 | MediaPipe as on-device verification stack | C |

---

## 13. Preserve-Only Notes

- Initial Claude Code remote-control confusion — process note only
- Specific landmark threshold values — implementation tuning

---

## 14. Obsolete Notes

- Claude Code SSH remote development as [ i ] feature — rejected

---

## 15. Follow-Up Extraction Targets

- Cross-read conv 017 eye-tracking for unified verification architecture
- Locate any built prototype in repo branches
