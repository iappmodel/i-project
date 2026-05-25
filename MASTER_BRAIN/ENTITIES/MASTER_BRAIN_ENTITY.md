# MASTER_BRAIN (Meta-Entity)

**Classification:** Operational — this knowledge corpus  
**Not the same as:** lowercase `masterbrain/` legacy stubs, ChatGPT "memory", or Elo

---

## What it is

**MASTER_BRAIN** is the project's **canonical knowledge organism** — the fix for cross-chat amnesia. It is what you asked for when you said folders should "talk to each other."

```
Conversation A ──┐
Conversation B ──┼──► MASTER_BRAIN ──► Cursor / agents / future builders
Repo evidence  ──┤         │
Desktop export ──┘         └── ENTITIES / SYSTEMS / RELATIONSHIPS
```

It does not replace product code. It **indexes, classifies, and relates** what exists so the next session does not reconstruct Elo from scratch.

---

## Layers

| Layer | Path | Role |
|-------|------|------|
| Constitution | `CANONICAL/i_SOURCE_OF_TRUTH.md` | Wins all product conflicts |
| Entities | `ENTITIES/` | Named organisms (Elo, POP, iAM…) |
| Systems | `SYSTEMS/` | Machinery (Wallet, Eye Tracking…) |
| Relationships | `RELATIONSHIPS/` | How parts connect |
| Chat recovery | `CHAT_RECOVERY/EXTRACTED/` | Structured P0 extractions (70/104) |
| Desktop portable | `~/Desktop/[i]_PROJECT_CHAT_EXTRACTION/` | Raw 189-thread copy + attachments |
| Decisions | `DECISIONS/` | ADRs, owner blocks |

---

## Ingestion rules

1. Raw chat ≠ canonical — always classify
2. Conflict → log in `DUPLICATES_AND_CONFLICTS.md`, do not silently resolve
3. Owner decisions block promotion
4. Evidence hierarchy in `MASTERBRAIN_STRUCTURE.md`

---

## Why it exists (from your ChatGPT thread)

> "What is the point of having a project folder if they don't talk to each other?"

MASTER_BRAIN is the **shared memory layer** the platforms failed to provide. Cursor reads the repo; MASTER_BRAIN makes the repo **meaningful across subsystems**.
