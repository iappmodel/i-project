# P0-010: Dual-Model AI Workflow for App Development

**Extraction batch:** P0 Batch 01  
**Extracted:** 2026-05-21

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `85d7df7a-0431-4015-89a0-853cb7ee6088` |
| Title | Dual-model AI workflow for app development |
| Date created | 2026-04-10 |
| Date updated | 2026-04-10 |
| Raw path | `…/conversations.json#85d7df7a-0431-4015-89a0-853cb7ee6088` |
| Messages | 40 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 141 | P0 | Dev Workflow, Investor Demo, Tech Architecture |

---

## 3. Project-Specific Summary

Establishes **Sonnet (architect) + Haiku (executor)** workflow with a reusable **Master Control File**. Defines immutable design/currency rules, initiates phased DEMO build (shell → navigation → feed), reviews Haiku output, and **rejects Lovable-generated "iView" repo** as wrong foundation for [ i ].

---

## 4. Extracted Decisions

| ID | Decision |
|----|----------|
| D-010-01 | **Sonnet thinks, Haiku executes, Sonnet validates** — never reverse |
| D-010-02 | Master Control File updated with CURRENT STATE every handoff |
| D-010-03 | Haiku tasks must be bounded — no open-ended architecture |
| D-010-04 | Start **DEMO track** before production (de-risk investor story) |
| D-010-05 | **Do not pivot to Lovable iView codebase** — wrong branding, wrong colors, minified bundle |
| D-010-06 | Phased HTML demo: Phase 1 shell → Phase 2 nav → Phase 3 feed → Phase 4+ |
| D-010-07 | Haiku reports to Sonnet: `HAIKU → SONNET` format with STATUS and QUESTIONS |
| D-010-08 | Same model cannot roleplay both architect and executor effectively |

---

## 5. Extracted Feature/System Concepts

**Master Control File contents**
- Project: Attention Wallet & Media Marketplace
- Core features: feed, eye-tracking (simulated in demo), dual wallet, 5-gate watch flow, earn marketplace, wheel, creator 60/30/10, trust score
- Stack: React + TS + Vite + Tailwind (production); HTML phases (demo interim)
- Immutable: iCoins `#4ade80`, vCoins `#f59e0b`, separate ledgers, JetBrains Mono for amounts
- rCoins internal only; no client-side currency mutations in production
- DEMO vs PRODUCTION never mixed

**Phase 3 feed spec (from Sonnet to Haiku)**
- 4 cards: organic, organic, sponsored Oura, sponsored Notion
- Scroll snap, earn badges, watch flow trigger

**Lovable iView audit findings**
- Origin: lovable.dev, Vite+React, PWA configured
- Branding "iView" not `[ i ]`
- Purple `#8B5CF6` accent — wrong vs cyan/lime/amber system
- Boot diagnostics suggest prior stability issues
- Compiled JS bundle not auditable

---

## 6. Extracted UX/Design Ideas

- Dark theme only, 390px mobile-first
- Neumorphic shadows on interactive elements
- Never Inter/Roboto/Arial

---

## 7. Extracted Technical Architecture Ideas

- Production: Supabase Postgres, Auth, Realtime, Edge Functions
- Deploy: Vercel or Netlify
- Swipe/scroll conflict fix pattern (from Sonnet review) — see conv 006
- Private GitHub repo requires paste or temporary public for audit

---

## 8. Extracted Economy/Currency Ideas

- Vicoins/Icoins in owner's initial paste; Master File standardizes iCoins/vCoins
- 5-gate qualification in watch flow

---

## 9. Extracted Investor/Demo Ideas

- Deployed demo reference: `iappdemomarcelo.vercel.app`
- Demo proves narrative before Supabase schema decisions

---

## 10. Conflicts with Current Masterbrain

| Topic | Chat | Masterbrain | Verdict |
|-------|------|-------------|---------|
| Lovable lineages | Reject iView repo | IVAULT has multiple Lovable apps indexed | **Aligns with duplicate caution** in audits |
| Vicoin/Icoin in user paste | Initial workflow doc | Canonical a/i/v/e/o | **Naming drift** in workflow template |
| HTML-first demo | Phased single files | Multiple demo architectures in repo | **Process choice**, not SoT conflict |

---

## 11. Canonical Candidates

| Candidate | Target |
|-----------|--------|
| Master Control File template | `DECISIONS/ARCHITECTURE_DECISIONS.md` or dev playbook |
| Sonnet/Haiku loop protocol | P2 tooling reference (not product SoT) |
| Lovable iView rejection rationale | `OBSOLETE/` or duplicate registry |
| Phase gate review checklist (swipe vs scroll) | Web demo technical patterns |

---

## 12. Preserve-Only Notes

- Token cost savings estimate (~60–80%) for dual-model workflow
- GitHub private repo access friction

---

## 13. Obsolete Notes

- "All features not started" at thread open — superseded same day by Phase 1–2 builds

---

## 14. Follow-Up Extraction Targets

- Conv `ee00baba` — execution continuation (same day)
- Conv `aff2fc4c` — multiple skills/repos in Claude (P0 rank 13)
- Locate Lovable iView repo in IVAULT_LOVABLE_INDEX
