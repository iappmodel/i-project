# P0-011: Application Development Masterplan and Stages

**Extraction batch:** P0 Batch 02  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `9f29c850-82bd-4354-9014-f02ba00f89eb` |
| Title | Application development masterplan and stages |
| Date created | 2026-04-08 |
| Date updated | 2026-04-08 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json#9f29c850-82bd-4354-9014-f02ba00f89eb` |
| Messages | 108 |
| Export caveat | Primary masterplan markdown artifact body largely missing; stages recovered from follow-up audit/workflow messages |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 135 | P0 | Source of Truth, Dev Workflow, Investor Demo, Tech Architecture, Attention |

**Keywords matched:** `[ i ]`, attention wallet, investor demo, wallet, masterplan, media marketplace

---

## 3. Project-Specific Summary

Owner requested a **staged masterplan** to build [ i ] by parts after core features were defined. Claude produced a multi-stage plan (markdown artifact referenced but not fully preserved in export), then answered three operational questions: **where to build** (Chat vs Claude Code), **how to go faster**, and **what is already built**.

The thread converges on a **dual-track workflow**: Claude Chat for planning/design; Claude Code for multi-file scaffold, Vite demo, deploy. An **audit** inventories existing assets: single-file investor demo at `iappdemomarcelo.vercel.app`, FLUX merged app at `flux-i-app.vercel.app`, Expo `~/i-app/` with AttentionEngine (~11 TS files), five project MD files. Recommended acceleration: **fold Stage 0 into Stage 1**, reuse demo HTML components into Vite scaffold, remote dev via SSH/Tailscale + Claude Code on phone.

Later messages execute **Stage 0+1** in `~/i-app-demo` (Vite + splash + feed presenter step 2).

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-011-01 | **Stage 0 (foundation)** → Claude Code: Vite scaffold, Tailwind tokens, component library | High |
| D-011-02 | **Stage 1–2 (demo screens)** → Chat for fast visual iteration OR Code for proper React/Vite rebuild | High |
| D-011-03 | **Stage 3A** polish/deploy → Claude Code | High |
| D-011-04 | **Stage 3B+** production (Supabase auth, schema, Edge Functions) after demo stable | High |
| D-011-05 | **Skip isolated Stage 0** — prove design system on first real screen (splash) | High |
| D-011-06 | **Demo ~75% complete** (9 presenter screens in HTML); **engine ~90%** (TS done; native bridges = Stage 6) | Medium |
| D-011-07 | Chat = strategy; Code = files/terminal/deploy | High |

---

## 5. Extracted Feature/System Concepts

### Staged build model (recovered)

| Stage | Scope | Tooling |
|-------|--------|---------|
| 0 / folded | Vite + React + TS + Tailwind; design tokens; tab shell | Claude Code |
| 1 | Extract demo UI into components; wire interactions | Code (+ Chat iterate) |
| 2 | Polish + deploy investor demo | Code |
| 3A | Demo deploy hardening | Code |
| 3B+ | Supabase production backend | Code |
| 6 | Native camera bridges (ARKit / MediaPipe) | Production only |

### Parallel native track (Expo, from audit context)

- Phase 1 Scaffold (~2h)
- Phase 2 Engine port (~4h)
- Phase 3 Native bridges (~8–12h)
- Phase 4 Live UI

### Built-asset audit (as stated in thread)

| Asset | Status claimed |
|-------|----------------|
| Investor demo HTML | 9 presenter steps + stories, topics, iGo, eye sim → `iappdemomarcelo.vercel.app` |
| FLUX merged React demo | `flux-i-app.vercel.app` |
| AttentionEngine | ~11 TS files in `~/i-app/` Expo project |
| Project MD set | design-system, economy-rules, feature-bible, demo-spec, lessons |

---

## 6. Extracted UX/Design Ideas

- Splash screen validates fonts, neumorphic shadows, dark void `#070709`
- Feed = presenter step 2 with stories bar, topic pills, sponsored badges
- Syne / DM Sans / JetBrains Mono font stack

---

## 7. Extracted Technical Architecture Ideas

- Investor demo track: mocked data, no backend
- Production track: Supabase RLS, Edge Functions for currency
- Remote dev stack: Termux SSH → Mac → `cd ~/i-app && claude`; Tailscale for fixed IP
- Skills install via `~/.claude/skills/` + project `.claude/` MD files

---

## 8. Extracted Economy/Currency Ideas

- Demo spec references iCoins/vCoins on sponsored cards (Oura, Notion examples in feed build prompt)
- Economy rules live in `i-app-economy-rules.md` (referenced, not extracted here)

---

## 9. Extracted Investor/Demo Ideas

- **9-step presenter flow** explicitly tied to existing HTML demo
- Presenter controls, reset demo, mocked transactions in wallet history
- Next build target after splash: Feed screen (step 2)

---

## 10. Conflicts with Current Masterbrain

| Topic | Thread | SoT / MASTER_BRAIN | Verdict |
|-------|--------|-------------------|---------|
| Build priority | Demo 75% then backend Stage 3B | SoT: Investor Demo first, then wallet loop | **Aligns** |
| Neumorphic shadows in Code prompt | "Neumorphic shadows" in scaffold prompt | Batch 01 + brief: soft depth, not full neumorphism | **Tension** with design v2 |
| Multiple demo URLs | iappdemomarcelo vs flux-i-app vs i-app-demo | Competing lineages (batch 01) | **Duplicate** — pick canonical deploy |
| Expo `~/i-app/` vs Vite web | Both pursued | TECH_ARCHITECTURE authority split | **Unresolved stack fork** |

---

## 11. Conflicts with P0 Batch 1

| Topic | Batch 01 | This thread | Verdict |
|-------|----------|-------------|---------|
| Demo lineage | HTML vs Vite scaffold (005, 006) | Adds `i-app-demo`, flux-i-app, iappdemomarcelo | **More forks** — CC-B01-09 blocker grows |
| Masterplan reference | 005 points to conv 011 | Delivers staged plan | **Resolves cross-link** |
| Design system v2 | Content-first glass (003) | Neumorphic in Code prompt (msg 95) | **Regression risk** in implementation prompts |

---

## 12. Canonical Candidates

| Candidate | Target |
|-----------|--------|
| Chat vs Code responsibility split | `DECISIONS/DEV_WORKFLOW.md` |
| Stage 0 folded into Stage 1 acceleration rule | Dev workflow |
| Built-asset audit checklist | `RESEARCH/GAPS` cross-ref to repo verify |
| 9-step demo completion % framing | `INVESTOR_DEMO/` |

---

## 13. Preserve-Only Notes

- SSH/Tailscale setup steps, GitHub `gh auth`, skill clone commands — **process only**
- Personal network IPs in thread — do not promote
- Imagine/visual skill content leaked into assistant payloads — ignore for product canon

---

## 14. Obsolete Notes

- Treating isolated "build design system only" as mandatory Stage 0 — explicitly deprecated in thread
- Assuming `~/i-app/` Expo project fully exists on disk — audit notes sandbox vs local ambiguity

---

## 15. Follow-Up Extraction Targets

- Recover full Stage/Part markdown from artifact if re-exported
- Verify live URLs: iappdemomarcelo, flux-i-app, i-app-demo local port
- Cross-check `~/i-app-demo` vs `~/i-app/` on owner machine
- Link to conv 017 audit for engine completeness claims
