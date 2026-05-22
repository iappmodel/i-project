# P0-008: Continuing Development with Mockup Assets

**Extraction batch:** P0 Batch 01  
**Extracted:** 2026-05-21

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `dca5ea92-3421-4610-aea6-2e377315ab70` |
| Title | Continuing development with mockup assets |
| Date created | 2026-04-10 |
| Date updated | 2026-04-10 |
| Raw path | `…/conversations.json#dca5ea92-3421-4610-aea6-2e377315ab70` |
| Messages | 2 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 157 | P0 | Investor Demo, Design Assets |

---

## 3. Project-Specific Summary

Minimal handoff thread immediately after design-system v3 approval (conv 003). Owner directs use of **Flutter project mockup assets** for ongoing demo development and requests momentum ("never stop iteration").

---

## 4. Extracted Decisions

| ID | Decision |
|----|----------|
| D-008-01 | Demo mockups source path: `/Users/2023macbookpro/iapp flutter/assets` |
| D-008-02 | Mockups become **canonical demo assets** going forward |
| D-008-03 | Continue **DEMO track only** in this session (not production backend) |
| D-008-04 | Two tracks reaffirmed: DEMO (mocked, investor-ready) vs PRODUCTION (Supabase) |

---

## 5. Extracted Feature/System Concepts

- Asset integration gate before next demo build
- Demo build should consume existing visual mockups rather than placeholders

---

## 6. Extracted UX/Design Ideas

- Real mockup images/videos to replace placeholder content in feed tiles (referenced from conv 003)

---

## 7. Extracted Technical Architecture Ideas

- Flutter assets folder as cross-stack design reference for HTML demo
- Path may vary slightly on disk — verification required before integration

---

## 8. Extracted Economy/Currency Ideas

- None in this thread

---

## 9. Extracted Investor/Demo Ideas

- Demo fidelity improves when mockup assets from Flutter project are wired in

---

## 10. Conflicts with Current Masterbrain

| Topic | Chat | Evidence | Verdict |
|-------|------|----------|---------|
| Asset path | `iapp flutter/assets` | IVAULT may have parallel Flutter trees | **Verify path** in IVAULT census |
| No build output | Thread ends before integration | Demo HTML exists elsewhere | **Incomplete action** |

---

## 11. Canonical Candidates

| Candidate | Target |
|-----------|--------|
| Demo asset root: Flutter `assets/` folder | `IVAULT_VISUAL_ASSETS_INDEX.md` cross-ref |
| "Never stop iteration" demo track priority | Process note |

---

## 12. Preserve-Only Notes

- Claude could not verify asset folder in session (tool limitation message)

---

## 13. Obsolete Notes

- None

---

## 14. Follow-Up Extraction Targets

- Duplicate thread `efe9719c` (same title, score 66) — check if continuation
- Inventory `iapp flutter/assets` via IVAULT global intake
- Conv 003 HANDOFF.md for full state at handoff moment
