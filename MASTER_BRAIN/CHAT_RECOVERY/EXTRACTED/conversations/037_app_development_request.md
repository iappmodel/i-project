# P0-037: App Development Request (Claude)

**Extraction batch:** P0 Batch 04  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `c8abb718-4938-4574-a767-4e0ef14134ea` |
| Title | App development request |
| Date created | 2026-02-07 |
| Date updated | 2026-03-21 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json#c8abb718-4938-4574-a767-4e0ef14134ea` |
| Messages | 2 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 79 | P0 | Demo, Economy (display), UX, Attention |

---

## 3. Project-Specific Summary

Minimal-prompt Claude session producing a **full development package** for [ i ] App: React prototype (`i-app.jsx`), README, architecture docs, setup scripts. Features mirror conv **032**: full-screen media, **5-screen navigation**, 3D neumorphic draggable buttons, **Vicoins/Icoins** wallet, eye-tracking **simulation**, promotional rewards.

Deliverables moved to outputs directory. **Near-duplicate of 032** with more emphasis on file delivery and documentation.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-037-01 | React web prototype as **full-stack demonstration** (not native mobile) | High |
| D-037-02 | Eye-tracking = **simulation** (native APIs required for real tracking) | High |
| D-037-03 | 5-screen cross-format navigation | Medium |
| D-037-04 | Neumorphic 3D buttons with drag-and-drop customization | Medium |
| D-037-05 | Dual currency Vicoins + Icoins in wallet | High |

---

## 5. Extracted Feature/System Concepts

- `i-app.jsx` — single-file React prototype
- Full-screen immersive viewer
- Promotional content + completion rewards + transaction history
- Wallet: Withdraw, balances, earning records
- Documentation package (README, architecture diagrams)

---

## 6. Extracted UX/Design Ideas

- 3D Neumorphic buttons around screen edges
- Cross-screen swipe navigation
- Reward animations on promo completion

---

## 7. Extracted Technical Architecture Ideas

- React-based web app (not Flutter despite 035 roadmap)
- Eye-tracking simulation layer — explicit limitation documented
- Phased breakdown in README for future native work

---

## 8. Extracted Economy/Currency Ideas

| Coin | Role |
|------|------|
| Vicoins | Virtual platform currency |
| Icoins | Real monetary value |

No conversion pipeline or alphabet taxonomy.

---

## 9. Extracted Investor/Demo Ideas

- "Fully developed" package narrative for stakeholders
- Architecture diagrams in README for pitch support

---

## 10. Conflicts with Current Masterbrain

| Topic | This thread | SoT | Verdict |
|-------|-------------|-----|---------|
| Currency naming | Vicoins/Icoins | a/i/v/e/o | **Fork** |
| Eye-tracking | Simulated | Verification required for rewards | **Demo-only honesty** |

---

## 11. Conflicts with P0 Batches 1–3

| Topic | Prior | This thread |
|-------|-------|-------------|
| Conv 032 | Same MVP feature set | **Duplicate** — merge citations |
| 4-tab IA (014, 038) | Product shell | 5-screen here | **IA conflict** |
| Real eye-tracking (017, 031) | TF.js/MediaPipe | Simulation only | **Implementation gap** |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B04-21 | Explicit "simulation vs native" eye-tracking disclaimer for demos | C |
| CC-B04-22 | i-app.jsx as early prototype artifact (if located) | D |

---

## 13. Preserve-Only Notes

- Locate `i-app.jsx` and README in IVAULT outputs/repos
- Skills check attempted but blocked on device — process noise

---

## 14. Obsolete Notes

- Entire deliverable if superseded by eye-earn-sparkle-archive
- 5-screen nav if 4-tab product IA locked

---

## 15. Follow-Up Extraction Targets

- File search: `i-app.jsx` across IVAULT
- Deduplicate 032/037 in CONFLICTS doc
- Compare neumorphic prototype to 038 soft-depth 4-tab shell
