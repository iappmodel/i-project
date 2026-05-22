# P0-006: Vite React TypeScript Tailwind Project Shell

**Extraction batch:** P0 Batch 01  
**Extracted:** 2026-05-21

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `ee00baba-61d4-4c11-83f4-42f1b8bb99a8` |
| Title | Vite React TypeScript Tailwind project shell |
| Date created | 2026-04-10 |
| Date updated | 2026-04-10 |
| Raw path | `…/conversations.json#ee00baba-61d4-4c11-83f4-42f1b8bb99a8` |
| Messages | 45 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 169 | P0 | Investor Demo, Tech Architecture, Design System |

---

## 3. Project-Specific Summary

Execution thread for **DEMO track phased HTML build** (despite title mentioning Vite/React/Tailwind). Phases 1–3 deliver incrementally deployable single-file HTML demos with design tokens, navigation shell, and content feed. Includes **Sonnet/Haiku workflow friction** (model role confusion) and extensive **Vercel deployment troubleshooting** for phase builds.

---

## 4. Extracted Decisions

| ID | Decision |
|----|----------|
| D-006-01 | Phase 1: visual shell only — tokens, logo, tagline, Investor Preview badge, cyan pulse orb |
| D-006-02 | Phase 2: 5-screen canvas (center/top/bottom/left/right) + 4-tab bar (Feed/Earn/Wallet/Profile) |
| D-006-03 | Swipe threshold: 50px minimum; fade transitions between screens |
| D-006-04 | Phase 3 feed: `.feed-scroll` with `touch-action: pan-y` to coexist with global `touch-action: none` |
| D-006-05 | `handleSwipe()` must bail if touch originated inside `.feed-scroll` |
| D-006-06 | Four mocked cards: 2 organic + 2 sponsored with earn badges |
| D-006-07 | Files named `i-demo-shell.html`, `i-demo-phase2.html`, phase3+ incrementally |
| D-006-08 | Deploy path: `~/i-app-deploy/` → Vercel production |

---

## 5. Extracted Feature/System Concepts

**Design token set (CSS custom properties)**
- Backgrounds: `--bg-void #070709` through `--bg-raised #1c1c28`
- Currencies: `--icoin-primary #4ade80`, `--vcoin-primary #f59e0b`
- Accents: cyan `#00e5ff`, lime `#b4ff47`
- Text: primary `#f0ede8`, secondary `#9997a0`
- Neumorphic shadows, glow variables, spacing, radius, motion tokens

**Phase 2 navigation**
- 5-screen swipeable canvas with directional gradients
- Tab bar: glass blur, safe area, active cyan indicator
- Debug info toggle (double-click)
- Grid texture overlay at 0.015 opacity

**Phase 3 feed (specified)**
- Scroll snap vertical
- Card interactions: like, comment, share
- Sponsored styling: earn badge, watch time indicator

---

## 6. Extracted UX/Design Ideas

- Mobile-first: 390px → 768px → desktop breakpoints
- Typography reference in bottom-left (dev aid)
- Neumorphic tab press feedback (scale animation)
- Investor Preview badge: top-right, 10px, 0.5 opacity

---

## 7. Extracted Technical Architecture Ideas

- **Demo track uses single HTML files first**, Vite+React scaffold deferred
- `body { touch-action: none }` global — requires surgical scroll containers
- Tab routing map expandable: `feed→center`, `earn→earn-screen`, etc.
- Vercel promote/redeploy workflow documented for owner

---

## 8. Extracted Economy/Currency Ideas

- Sponsored cards show earn amounts and watch-to-earn CTAs
- Dual currency display in future wallet phase

---

## 9. Extracted Investor/Demo Ideas

- Phased demo build: aesthetic validation before feature wiring
- Production URL: `iappdemomarcelo.vercel.app`
- Phase 5 HTML referenced in deploy thread (`i-demo-phase5.html`)

---

## 10. Conflicts with Current Masterbrain

| Topic | Chat | SoT / Evidence | Verdict |
|-------|------|----------------|---------|
| Title vs content | "Vite React TS Tailwind shell" | Actual output = pure HTML phases | **Naming mismatch** — Vite scaffold planned not delivered here |
| Dark void aesthetic | Phase 1–3 dark theme | Design system v2 (conv 003) pivots light neumorphic | **Competing demo lineages** |
| Instant interactions | No loading states anywhere | POPS pending wallet in production | **Demo-only** |

---

## 11. Canonical Candidates

| Candidate | Target |
|-----------|--------|
| CSS custom property token list | Design system reference |
| Swipe vs scroll coexistence pattern | Web demo technical note |
| Phased demo build methodology (shell → nav → feed) | `INVESTOR_DEMO/` build playbook |
| Tab routing screenMap pattern | Prototype architecture |

---

## 12. Preserve-Only Notes

- Vercel dashboard promote/redeploy UI walkthrough
- Haiku/Sonnet roleplay confusion — process note only
- File path issues: `~/Downloads/i-app-demo.html` not found

---

## 13. Obsolete Notes

- Claim that Phase 1 requires "no React" while conversation title says Vite React — superseded by explicit phased HTML approach

---

## 14. Follow-Up Extraction Targets

- Locate `i-demo-phase2.html`, `i-demo-phase5.html` in IVAULT or owner machine
- Conv `85d7df7a` — dual-model workflow (same day, initiates this shell task)
- Cross-ref `eye-earn-sparkle-archive` Vite stack as production-adjacent evidence
