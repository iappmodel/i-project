# Chat Extraction Plan

**Status:** Triage complete (2026-05-21). Summarization **not** started.

## Phase 1 — P0 extraction (architecture & economy)

1. Extract structured notes from P0 OpenAI + Claude threads into `MASTER_BRAIN/RESEARCH/CHAT_EXTRACTS/` (one markdown per thread, cite `conversation_id`).
2. Map each extract to canonical domains: `CANONICAL/`, `ECONOMY/`, `TRUST_SYSTEM/`, `ATTENTION_SYSTEM/`.
3. Cross-check against existing `docs/technical/*` — flag conflicts in `DUPLICATES_AND_CONFLICTS.md`.

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

- [ ] P0 threads extracted and reconciled with `i_SOURCE_OF_TRUTH.md`
- [ ] Proof/wallet/attention claims traced to code or marked Unknown
- [ ] Duplicate IVAULT vs workspace `MASTER_BRAIN` unified
