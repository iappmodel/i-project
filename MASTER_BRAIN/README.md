# MASTER_BRAIN

**Permanent knowledge corpus for [ i ]**

This directory is the classified memory of the [ i ] Attention Wallet and Media Marketplace project. It was built by archaeology over `i_project_migration_archive` and referenced source repos — **not** by implementing product code.

## Start Here

1. **[CANONICAL/i_SOURCE_OF_TRUTH.md](CANONICAL/i_SOURCE_OF_TRUTH.md)** — Product constitution (wins all conflicts)
2. **[MASTERBRAIN_STRUCTURE.md](MASTERBRAIN_STRUCTURE.md)** — How this corpus is organized
3. **[REPOSITORY_MAP.md](REPOSITORY_MAP.md)** — Where evidence lives
4. **[KNOWLEDGE_GRAPH.md](KNOWLEDGE_GRAPH.md)** — Concept map
5. **[DUPLICATES_AND_CONFLICTS.md](DUPLICATES_AND_CONFLICTS.md)** — Competing implementations
6. **[CANONICAL_CANDIDATES.md](CANONICAL_CANDIDATES.md)** — What should become canonical

## Domain Folders

| Folder | Contents |
|--------|----------|
| `CANONICAL/` | Constitution-aligned definitions |
| `ECONOMY/` | Currencies, wallet |
| `TRUST_SYSTEM/` | POPS, proof, trust, governance |
| `ATTENTION_SYSTEM/` | Vision, verification, signals |
| `CREATOR_ECONOMY/` | Studio, campaigns |
| `INVESTOR_DEMO/` | Demo paths and flows |
| `TECH_ARCHITECTURE/` | Multi-repo, authority |
| `DECISIONS/` | Extracted ADRs |
| `EXPERIMENTAL/` | Not-final systems |
| `OBSOLETE/` | Closed threads |
| `RESEARCH/` | Gaps and unknowns |
| `PROTOTYPES/` | Demos and HTML archives |

## Classification

Every finding: **Canonical · Experimental · Obsolete · Unknown**

## Global Intake (IVAULT Full Archive)

**`GLOBAL_INTAKE/`** — 2026-05-21 census of entire `~/Desktop/IVAULT` (56 GB, ~628k files on disk).

| Index | Purpose |
|-------|---------|
| [IVAULT_GLOBAL_INVENTORY.md](GLOBAL_INTAKE/IVAULT_GLOBAL_INVENTORY.md) | Executive census + viability map |
| [IVAULT_SOURCE_CENSUS.tsv](GLOBAL_INTAKE/IVAULT_SOURCE_CENSUS.tsv) | Per-file metadata (80,959 rows; node_modules excluded) |
| [IVAULT_RECOVERY_PRIORITY_QUEUE.md](GLOBAL_INTAKE/IVAULT_RECOVERY_PRIORITY_QUEUE.md) | Top 20 inspect-next list |
| [IVAULT_REPO_INDEX.md](GLOBAL_INTAKE/IVAULT_REPO_INDEX.md) | 32 git repos |
| [IVAULT_LOVABLE_INDEX.md](GLOBAL_INTAKE/IVAULT_LOVABLE_INDEX.md) | Lovable/Vite projects |
| [IVAULT_CHAT_EXPORTS_INDEX.md](GLOBAL_INTAKE/IVAULT_CHAT_EXPORTS_INDEX.md) | OpenAI + Claude exports |
| [IVAULT_HIGH_VALUE_SOURCES.md](GLOBAL_INTAKE/IVAULT_HIGH_VALUE_SOURCES.md) | Keyword-triage sources |
| [IVAULT_DUPLICATE_CLUSTERS.md](GLOBAL_INTAKE/IVAULT_DUPLICATE_CLUSTERS.md) | Basename collision clusters |
| [IVAULT_VISUAL_ASSETS_INDEX.md](GLOBAL_INTAKE/IVAULT_VISUAL_ASSETS_INDEX.md) | Image folders by size/count |
| [IVAULT_PROTOTYPES_INDEX.md](GLOBAL_INTAKE/IVAULT_PROTOTYPES_INDEX.md) | HTML + React demos |

Regenerate: `python3 scripts/ivault_global_intake.py` (read-only on IVAULT).

## Chat Recovery (Export Triage)

**`CHAT_RECOVERY/`** — 2026-05-21 triage of OpenAI + Claude exports under `~/Desktop/IVAULT` (metadata only; raw exports untouched).

| Artifact | Purpose |
|----------|---------|
| [CHAT_EXPORT_TRIAGE.md](CHAT_RECOVERY/CHAT_EXPORT_TRIAGE.md) | Formats, scan counts, privacy rules |
| [OPENAI_RELEVANT_CONVERSATIONS.tsv](CHAT_RECOVERY/OPENAI_RELEVANT_CONVERSATIONS.tsv) | 580 ranked OpenAI threads |
| [CLAUDE_RELEVANT_CONVERSATIONS.tsv](CHAT_RECOVERY/CLAUDE_RELEVANT_CONVERSATIONS.tsv) | 68 ranked Claude threads |
| [CHAT_RECOVERY_PRIORITY_QUEUE.md](CHAT_RECOVERY/CHAT_RECOVERY_PRIORITY_QUEUE.md) | Top 30 extract-next |
| [CHAT_RELEVANCE_KEYWORDS.md](CHAT_RECOVERY/CHAT_RELEVANCE_KEYWORDS.md) | Scoring lexicon |
| [CHAT_EXTRACTION_PLAN.md](CHAT_RECOVERY/CHAT_EXTRACTION_PLAN.md) | Phased summarization playbook |

Regenerate: `python3 scripts/chat_export_triage.py` (read-only on IVAULT).

## Status

Migration-archive archaeology **v1.0 complete** (2026-05-21). **Full IVAULT global intake census complete.** **Chat exports triaged** (648 conversation records scored; not fully summarized). Canonicalization and owner decisions remain **blocked** until P0/P1 chat extraction, visual review, and duplicate resolution. Implementation and promotion are separate phases.
