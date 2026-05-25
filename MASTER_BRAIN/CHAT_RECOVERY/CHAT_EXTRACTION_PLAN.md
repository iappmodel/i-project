# Chat Extraction Plan

**Status:** Triage complete (2026-05-21). **P0 batches 1–5 complete** (ranks 1–50, 2026-05-25). Output: `CHAT_RECOVERY/EXTRACTED/conversations/` + batch summaries.

> **50/104 P0 threads extracted.** Currency naming ADR-001 accepted as working default. Further P0 extraction + CR-01 session bypass still required.

## Phase 1 — P0 extraction (architecture & economy)

1. ~~Extract structured notes from P0 OpenAI + Claude threads~~ → **40/104 done** in `EXTRACTED/conversations/` (one markdown per thread, cite `conversation_id`).
2. Map each extract to canonical domains: `CANONICAL/`, `ECONOMY/`, `TRUST_SYSTEM/`, `ATTENTION_SYSTEM/` — **in progress via batch canonical candidate docs**.
3. Cross-check against existing `docs/technical/*` — flag conflicts in `DUPLICATES_AND_CONFLICTS.md` and `P0_BATCH_*_CONFLICTS_AND_DUPLICATES.md`.

### P0 extraction batches

| Batch | Ranks | Status |
|-------|------:|--------|
| 01 | 1–10 | Complete |
| 02 | 11–20 | Complete |
| 03 | 21–30 | Complete |
| 04 | 31–40 | Complete |
| 05 | 41–50 | Complete |
| 06 | 51–60 | Complete |
| 07 | 61–70 | Complete |
| 08+ | 71–104 | **Next** |

## Phase 1.5 — P0 synthesis (batches 01–04)

**Complete 2026-05-22:** Consolidated synthesis of ranks 1–40:

- [`EXTRACTED/P0_BATCHES_01_04_SYNTHESIS.md`](CHAT_RECOVERY/EXTRACTED/P0_BATCHES_01_04_SYNTHESIS.md)

Use synthesis for owner decision sessions. **Do not treat synthesis as canonical** — all items remain candidate/experimental/blocked until owner lock + repo verification.

## Phase 2 — P1 extraction (product & investor)

1. Investor demo, eye-tracking, studio, UX threads → `INVESTOR_DEMO/`, `ATTENTION_SYSTEM/`, `CREATOR_ECONOMY/`.
2. Link to repo paths in `REPOSITORY_MAP.md` (eye-earn-sparkle, i-app-demo, etc.).

## Phase 3 — P2 reference pass

1. Tooling (Cursor, Lovable, Claude skills) — reference only; do not promote to SoT.

## Phase 4 — Owner review

1. P3 / private-flagged threads: owner opt-in list only.
2. Resolve duplicate OpenAI export (`CHATGPT/` vs `knowledge/openai-export-raw/`) — already ID-deduped.

## Do not

- Modify raw exports under `~/Desktop/IVAULT/CHATGPT` or `~/Desktop/IVAULT/CLAUDE`.
- Summarize personal/off-topic threads in P3 without explicit owner request.

## Unblock canonicalization when

- [x] P0 ranks 1–40 extracted and synthesized (`P0_BATCHES_01_04_SYNTHESIS.md`)
- [ ] Remaining P0 threads (41–104) extracted and reconciled with `i_SOURCE_OF_TRUTH.md`
- [ ] Proof/wallet/attention claims traced to code or marked Unknown (**039 session bypass — critical**)
- [ ] Duplicate IVAULT vs workspace `MASTER_BRAIN` unified
- [ ] Owner decisions: currency letter mapping, rCoin role, product vs demo IA (**blocked — see synthesis §12**)
