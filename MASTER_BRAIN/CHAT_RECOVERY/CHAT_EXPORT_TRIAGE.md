# Chat Export Triage

**Date:** 2026-05-21  
**Archive root:** `/Users/2023macbookpro/Desktop/IVAULT`  
**Method:** Read-only metadata scan; titles + capped user-message samples for keyword scoring.

## Export formats discovered

| Source | Primary path | Format | Conversations |
|--------|--------------|--------|---------------|
| OpenAI | `/Users/2023macbookpro/Desktop/IVAULT/CHATGPT/gpt chats` | Official export: `conversations-000.json` … `conversations-005.json`, `chat.html`, `export_manifest.json`; `1653` `.dat` **attachment** blobs (images/WebP/PNG — not threads) | **580** unique |
| OpenAI (duplicate) | `/Users/2023macbookpro/Desktop/IVAULT/i-project-rescue/knowledge/openai-export-raw/extracted/gpt chats` | Same 580 IDs as CHATGPT copy | deduped in TSV |
| Claude | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json` | `conversations.json` array (`uuid`, `name`, `summary`, `chat_messages`) | **68** |

**Census note:** `GLOBAL_INTAKE` reported 1,695 OpenAI + 1,220 Claude *paths* — most are attachment `.dat` files and reference-repo false positives, not conversation threads.

## Scan counts

| Metric | OpenAI | Claude |
|--------|-------:|-------:|
| Conversation records scored | 580 | 68 |
| JSON shards / export files | 6 shards + 6 meta JSON | 1 conversations.json |
| Attachment / non-thread files | 1653 `.dat` | 4 project JSON |
| P0 | 65 | 39 |
| P1 | 37 | 2 |
| P2 | 39 | 5 |
| P3 / private-skipped | 439 | 22 |

## Outputs

- `OPENAI_RELEVANT_CONVERSATIONS.tsv` — ranked OpenAI threads
- `CLAUDE_RELEVANT_CONVERSATIONS.tsv` — ranked Claude threads
- `CHAT_RECOVERY_PRIORITY_QUEUE.md` — top 30 cross-source extract-next
- `CHAT_RELEVANCE_KEYWORDS.md` — lexicon and weights
- `CHAT_EXTRACTION_PLAN.md` — phased extraction playbook

## Privacy

- No unrelated personal thread bodies summarized in this pass.
- P3 rows flagged in `privacy_note`; extraction deferred unless owner opts in.

## Extraction progress

| Batch | Ranks | Status | Summary |
|-------|------:|--------|---------|
| P0 Batch 01 | 1–10 | Complete | `EXTRACTED/P0_BATCH_01_SUMMARY.md` |
| P0 Batch 02 | 11–20 | Complete | `EXTRACTED/P0_BATCH_02_SUMMARY.md` |
| P0 Batch 03 | 21–30 | Complete | `EXTRACTED/P0_BATCH_03_SUMMARY.md` |
| P0 Batch 04 | 31–40 | Complete | `EXTRACTED/P0_BATCH_04_SUMMARY.md` |

**40 / 104 P0 threads extracted** (2026-05-22). P0 chat extraction batch 4 completed; further P0/P1 extraction still required before final canonicalization.

## Canonicalization readiness

**Not ready.** Triage complete; **64 P0 + P1 threads remain**; cross-linking to `docs/` and repo evidence blocked until extraction completes and owner decisions resolve currency/IA forks.
