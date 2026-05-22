# P0-019: Clarification Needed (Owner Review)

**Extraction batch:** P0 Batch 02  
**Extracted:** 2026-05-22  
**Status:** Minimal extract — owner confusion thread; TSV flagged mixed signals

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `b7fa1669-4b75-4ea0-9389-5fba86f96fa2` |
| Title | Clarification needed |
| Date created | 2026-04-08 |
| Date updated | 2026-04-08 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json#b7fa1669-4b75-4ea0-9389-5fba86f96fa2` |
| Messages | 2 |
| Triage note | `mixed signals; title suggests personal topic — owner review before extract` |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 113 | P0 | Source of Truth (meta), Dev Workflow |

**Keywords matched:** attention wallet, investor demo, wallet, media marketplace — **from title/index only**; body is generic recap.

---

## 3. Project-Specific Summary

Owner: **"you are confusing me"**. Assistant apologizes for duplicated project context and restates a **generic [ i ] recap**: attention wallet + media marketplace; React/TS/Vite/Supabase/Tailwind/shadcn; Vercel/Netlify deploy; DEMO vs PRODUCTION tracks; separate iCoins/vCoins; RLS + realtime cleanup; dark theme, mobile-first; session-start MD files.

**No new product decisions.** Useful only as evidence of **context overload** and confirmation that assistant was echoing **pre-canonical Vicoin/Icoin** instructions rather than SoT five-coin names.

---

## 4. Extracted Decisions

None new — recap only.

---

## 5. Extracted Feature/System Concepts

Restated (not decided here):

- DEMO mocked vs PRODUCTION Supabase
- Dual currency iCoins + vCoins strict separation
- Five MD project knowledge files at session start

---

## 6–9. Extracted UX / Architecture / Economy / Demo Ideas

No incremental content beyond batch 01/013/014 convergence. See those extracts.

---

## 10. Conflicts with Current Masterbrain

| Topic | Thread | SoT |
|-------|--------|-----|
| Currency labels | Vicoins / Icoins | aCoins, iCoins, vCoins, eCoins, oCoins |
| Positioning | Attention wallet + marketplace | **Aligns** |

---

## 11. Conflicts with P0 Batch 1

Confirms **naming drift** documented in batch 01 conflicts (Vicoin/Icoin vs canonical). No new conflicts.

---

## 12. Canonical Candidates

| Candidate | Notes |
|-----------|-------|
| Session context discipline | Process: avoid duplicate constitution dumps |
| Lower priority for promotion | — |

---

## 13. Preserve-Only Notes

- Owner frustration signal — improve handoff clarity (Master Control File, single SoT pointer)

---

## 14. Obsolete Notes

- Entire thread body — **no unique product knowledge**; do not cite as SoT provenance

---

## 15. Follow-Up Extraction Targets

- Owner confirm: was confusion about currencies, demo vs prod, or unrelated topic?
- If mis-tagged P0, consider downgrade to P2 process note
- Link to conv 011 same-day masterplan session for actual decisions
