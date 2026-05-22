# P0-022: Creating Custom Skills with Documentation

**Extraction batch:** P0 Batch 03  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `75855403-6c31-4cb6-b7ca-a39b2a737af3` |
| Title | Creating custom skills with documentation |
| Date created | 2026-03-20 |
| Date updated | 2026-03-21 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json#75855403-6c31-4cb6-b7ca-a39b2a737af3` |
| Messages | 6 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 105 | P0 | Dev Workflow (process only) |

---

## 3. Project-Specific Summary

Guide to **creating Claude skills** and persistent **MD instruction files** for [ i ] development. Covers SKILL.md structure (YAML frontmatter + body), skill locations (`/mnt/skills/user/`, `~/.claude/skills/`), and the five project MD files protocol (`CLAUDE.md`, design-system, economy-rules, feature-bible, demo-spec, lessons).

Assistant packages **custom [ i ] skills** for the owner (economy-rules reader, demo-spec enforcer, etc. — referenced in msg 5 "What Was Built").

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-022-01 | Skills trigger via **description metadata**, not explicit commands | High |
| D-022-02 | Project MD files + CLAUDE.md = session-start required reading | High |
| D-022-03 | Custom skills live in user skills directory, packaged as `.skill` files | Medium |

---

## 5. Extracted Feature/System Concepts

- skill-creator workflow: draft → test → eval → iterate → package
- Three skill locations: public, examples, user
- CLAUDE.md references Vicoin/Icoin rules in economy skill context

---

## 6–9. UX / Architecture / Economy / Demo

**Process-only thread.** Economy content appears only as references to `i-app-economy-rules.md` — no new coin semantics.

---

## 10. Conflicts with Current Masterbrain

None at product level. Reinforces MD-as-brain workflow from batch 01/02.

---

## 11. Conflicts with P0 Batch 1 and 2

| Topic | Prior | This thread |
|-------|-------|-------------|
| Five MD files | Conv 001, 010, 011 | Confirms protocol |
| Skills auto-trigger | Conv 013 | Confirms |

---

## 12. Canonical Candidates

| Candidate | Target |
|-----------|--------|
| Session-start MD file list | DECISIONS/dev workflow (Tier D) |
| Custom economy-rules skill | Process — ensures Vicoin/Icoin in prompts until reconciled |

---

## 13. Preserve-Only Notes

- skill-creator eval loop details — not product canon
- Cowork vs Claude.ai vs Claude Code skill packaging differences

---

## 14. Obsolete Notes

- None

---

## 15. Follow-Up Extraction Targets

- Locate packaged `.skill` files on disk if they exist
- Read `i-app-economy-rules.md` in IVAULT for actual coin definitions vs skills
