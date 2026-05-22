# P0-021: App Redesign Strategy (OpenAI)

**Extraction batch:** P0 Batch 03  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | OpenAI |
| Conversation ID | `69b4e936-c654-8332-9ba2-b7a4a8ee7a25` |
| Title | App Redesign Strategy |
| Date created | 2026-03-14 |
| Date updated | 2026-03-14 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CHATGPT/gpt chats/conversations-003.json#69b4e936-c654-8332-9ba2-b7a4a8ee7a25` |
| Messages | 2 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 107 | P0 | UX, Economy, Product positioning, Dev workflow |

---

## 3. Project-Specific Summary

User pastes **"The Solution"** — the same 15-section UX/product repositioning document that appears in conv 014 (UX/UI Strategy Separation). OpenAI responds with **Claude integration playbook**: two-layer workflow (ChatGPT for strategy, Claude for build), master product brief template, design system rules, and phased build guidance.

**Near-duplicate of conv 014 content** at the product-spec level; this thread adds **Claude-specific** orchestration (project brief, handoff to Claude Code, token strategy).

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-021-01 | [ i ] = attention wallet + media marketplace (not social-with-rewards) | High |
| D-021-02 | 4-tab nav: Feed / Earn / Wallet / Profile | High |
| D-021-03 | Vicoins = internal utility; Icoins = cash-equivalent verified rewards | High |
| D-021-04 | ChatGPT for decisions; Claude for file-building | High |

---

## 5. Extracted Feature/System Concepts

Same core as conv 014: three loops, progressive trust, 5-screen sponsored watch funnel, selective attention verification, wallet 4-state model, non-MVP reward exclusions.

---

## 6. Extracted UX/Design Ideas

- Soft depth not neumorphism; green/amber/red money semantics
- Layered disclosure on media; persistent anchors
- Design references as style guides only

---

## 7. Extracted Technical Architecture Ideas

- Master product brief + design system MD as Claude session-start inputs
- Phased build: foundation → shell → feed → earn → wallet

---

## 8. Extracted Economy/Currency Ideas

| Coin | Role in thread |
|------|----------------|
| Vicoins | Internal credits, organic/platform behavior |
| Icoins | Verified sponsored actions, payout/redemption |

No a/e/o alphabet detail in this thread — see convs 023–028.

---

## 9. Extracted Investor/Demo Ideas

- Product brief suitable for investor narrative framing
- MVP vs Phase 2/3 scope separation in brief template

---

## 10. Conflicts with Current Masterbrain

| Topic | Thread | SoT | Verdict |
|-------|--------|-----|---------|
| Positioning | Wallet-first | Same | Aligns |
| Vicoin/Icoin | Chat naming | a/i/v/e/o | Naming conflict |
| iCoin meaning | Cash-equivalent (Icoins) | iCoins = cash-value | Partial align if Icoin→iCoin |

---

## 11. Conflicts with P0 Batch 1 and 2

| Topic | Prior batches | This thread |
|-------|---------------|-------------|
| vs 014 | Near-duplicate "The Solution" | Same source text — **duplicate extract** |
| vs 013/016 | Vicoin/Icoin dual display | Reinforces chat naming |
| vs 020 | vCoin economic layer | Not discussed here |

---

## 12. Canonical Candidates

| Candidate | Notes |
|-----------|-------|
| Product brief template structure | Process — overlaps 014 AGENTS.md |
| 4-tab IA + three loops | Already CC-B02-01 — duplicate source |

---

## 13. Preserve-Only Notes

- Claude vs ChatGPT role split — tooling reference
- Full "The Solution" body duplicated from 014 — cite once

---

## 14. Obsolete Notes

- Entire thread as unique product source — **superseded by 014** for UX canon; keep for Claude workflow only

---

## 15. Follow-Up Extraction Targets

- Deduplicate "The Solution" across 021/014/009 — pick earliest timestamp as provenance
- No further economy extraction needed from this thread
