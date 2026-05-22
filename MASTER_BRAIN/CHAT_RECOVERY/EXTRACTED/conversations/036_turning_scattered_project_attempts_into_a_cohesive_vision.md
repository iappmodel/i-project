# P0-036: Turning Scattered Project Attempts into a Cohesive Vision (Claude)

**Extraction batch:** P0 Batch 04  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `e35cf90d-d746-4283-8e1c-b95e971fcd4e` |
| Title | Turning scattered project attempts into a cohesive vision |
| Date created | 2026-04-11 |
| Date updated | 2026-04-11 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json#e35cf90d-d746-4283-8e1c-b95e971fcd4e` |
| Messages | 8 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 81 | P0 | Source of Truth, Dev Workflow, Demo, Economy (meta) |

---

## 3. Project-Specific Summary

Owner frustrated by **restart loop** across ChatGPT/Claude/Cursor — spending on incomplete builds. Claude reads project bible files and diagnoses **build strategy failure**, not tool failure. [ i ] described as Series B complexity: **26-coin economy**, dual-currency ledger, 5-gate reward engine, eye-tracking, GPS, remote control.

Prescribes: (1) build from existing docs systematically; (2) **Phase 0** design tokens + primitives; (3) **Phase 1** real Vite/React investor demo (not gradient HTML); (4) **Phase 2** Supabase schema/backend; (5) **Phase 3** connect demo to backend; (6) **`build-log.md`** for session continuity; (7) **Claude Code for building**, this chat for planning only.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-036-01 | Problem is **build order**, not platform choice | High |
| D-036-02 | Owner **already has authoritative docs** (design system, economy rules, feature bible) — underused | High |
| D-036-03 | **Phase 0 first**: design tokens + 8 primitive components before screens | High |
| D-036-04 | Phase 1 demo = real Vite/React with neumorphic system + mocked data | High |
| D-036-05 | Phase 2 = Supabase schema/auth/Edge Functions — **no UI** | High |
| D-036-06 | Maintain **`build-log.md`** after every session | High |
| D-036-07 | One screen/component at a time — verify before next | High |
| D-036-08 | Chat interface for planning; **Claude Code terminal for code** | Medium |

---

## 5. Extracted Feature/System Concepts

- 26-coin economy (chat reference — vs SoT 5-coin MVP)
- 5-gate reward engine
- Dual-currency ledger
- GPS verification, remote control paradigm
- Neumorphic design system (Syne font, tokens)

---

## 6. Extracted UX/Design Ideas

- HTML mockups fail without component foundation — "gradient div ≠ neumorphic button"
- Demo must use **actual design system** to become visual spec for production
- Netlify/Lovable/Bolt site recovery path discussed

---

## 7. Extracted Technical Architecture Ideas

```
Phase 0: tokens + primitives
Phase 1: Vite/React demo (mock data)
Phase 2: Supabase backend
Phase 3: wire demo → Supabase
```

- Token efficiency: read project files at session start vs re-explaining vision

---

## 8. Extracted Economy/Currency Ideas

- References economy rules MD files — no new coin mechanics defined here
- 26-coin scope acknowledged as too large for single-session build

---

## 9. Extracted Investor/Demo Ideas

- Phase 1 demo doubles as **investor demo AND visual spec**
- Not HTML gradients — production-quality component library

---

## 10. Conflicts with Current Masterbrain

| Topic | This thread | SoT / MASTER_BRAIN | Verdict |
|-------|-------------|-------------------|---------|
| Coin count | 26-coin economy cited | MVP 5 coins (a/i/v/e/o) | **Scope fork** |
| SoT exists | "You have source of truth" | `i_SOURCE_OF_TRUTH.md` in MASTER_BRAIN | **Align — build from it** |
| Demo approach | Vite/React neumorphic | Multiple demo lineages (024, 030, 038) | **Unify demo strategy** |

---

## 11. Conflicts with P0 Batches 1–3

| Topic | Prior | This thread |
|-------|-------|-------------|
| Masterplan (011) | Staged development | Same phased philosophy — **reinforces** |
| Custom skills (022) | MD file lists at session start | Same token-efficiency pattern |
| Glassmorphism demo (030) | Glass aesthetic | Neumorphic/soft-depth here — **visual fork** |
| 4-tab (014, 038) | Product IA | Not specified — demo IA open |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B04-17 | Phase 0→3 build order (tokens → demo → backend → connect) | B — process |
| CC-B04-18 | `build-log.md` session continuity pattern | B — process |
| CC-B04-19 | Chat=plan / Claude Code=build separation | D — process |
| CC-B04-20 | One component verified before next | B — process |

---

## 13. Preserve-Only Notes

- Emotional/frustration context — not product requirements
- Netlify site recovery (Path A/B) — operational, not canon

---

## 14. Obsolete Notes

- "Everything is `[ ]` not started" — may be stale post eye-earn-sparkle work
- 26-coin as MVP target — defer to A–Z post-launch per 028

---

## 15. Follow-Up Extraction Targets

- Verify `build-log.md` exists in repos; create if missing
- Read referenced project bible / economy-rules paths on disk
- Map Phase 0 tokens to 014/018 design principle docs
