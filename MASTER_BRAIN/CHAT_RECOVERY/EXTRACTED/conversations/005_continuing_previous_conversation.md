# P0-005: Continuing a Previous Conversation

**Extraction batch:** P0 Batch 01  
**Extracted:** 2026-05-21

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `657f7995-bf8a-4ebd-8d9a-f95c1a0acbff` |
| Title | Continuing a previous conversation |
| Date created | 2026-04-09 |
| Date updated | 2026-04-09 |
| Raw path | `…/conversations.json#657f7995-bf8a-4ebd-8d9a-f95c1a0acbff` |
| Messages | 8 |
| Subsystem (triage) | Source of Truth |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 173 | P0 | Investor Demo, Source of Truth, Dev Process |

---

## 3. Project-Specific Summary

Handoff/continuation session extending the investor demo from **4 tab screens** to a full **9-step (10-screen) presenter flow** with free exploration mode. Owner challenges whether work follows the established masterplan — Claude acknowledges **sideways movement** (rebuilding single HTML) vs planned **Vite + React scaffold** at `~/i-app-demo/`.

---

## 4. Extracted Decisions

| ID | Decision |
|----|----------|
| D-005-01 | **9 presenter steps** (+ watch offer intermediate = 10 screens) |
| D-005-02 | After step 10, **free exploration mode** — all 4 tabs navigable, presenter bar hides |
| D-005-03 | Triple-tap splash logo resets demo |
| D-005-04 | Tap Oura card in feed → jumps to watch flow |
| D-005-05 | Post-reward "tap to continue" → jumps to wallet |
| D-005-06 | March 23 plan: Presenter → Currency Overview → Creator Split → **Polish Pass** → Deploy package |
| D-005-07 | April 8 masterplan: Stage 0 = **Vite + React + TypeScript** at `~/i-app-demo/` — proper componentized path |

---

## 5. Extracted Feature/System Concepts

**Complete 9-step demo inventory**
1. Splash — animated logo, ambient orbs  
2. Feed — stories, pills, 4 cards  
3. Watch Offer — Oura campaign, consent, requirements  
4. Watch Active — 30s countdown, attention score, 5 gates sequential, reward reveal  
5. Wallet — iCoins/vCoins, quick actions, 8 transactions  
6. Earn — balance strip, watch/survey/GPS offers  
7. Wheel — swipe up/down/tap with coin counters  
8. Economy — 26-coin grid, 6 tiers, xCoins/ωCoins locked  
9. Creator Split — 60/30/10 + platform comparison + 4 creator tiers  
10. Trust Score — ring to 74, tier progression  

**Profile screen (v2)**
- Alex Rivera persona: 142K views, 71 engagement, 23 streak
- Creator tier Rising · 1.25×
- 9 unlocked + 9 locked coins in grid

**Presenter controls**
- ‹ › navigation, dot indicators
- Screen opacity fade transitions

---

## 6. Extracted UX/Design Ideas

- Dark luxury aesthetic: void `#070709`, Syne/DM Sans/JetBrains Mono, neumorphic shadows
- Free mode: investor explores without guided flow pressure
- Contextual tab bar visibility during guided vs free modes

---

## 7. Extracted Technical Architecture Ideas

- Single-file HTML (683 → 490 lines in v2 rebuild)
- Zero dependencies beyond Google Fonts
- Deploy: Netlify Drop or `cd ~/i-demo && vercel deploy --prod`
- **Parallel track**: Vite scaffold started in Claude Code on Mac

---

## 8. Extracted Economy/Currency Ideas

- 26-coin grid across 6 tiers in economy screen
- 60/30/10 visualization with competitor comparison
- 4 creator tiers in split screen

---

## 9. Extracted Investor/Demo Ideas

- Guided presenter flow + free exploration = two demo modes
- Deploy target referenced: `iappdemomarcelo.vercel.app`
- Polish pass still pending: balance glow, streak banner, seamless tab connections

---

## 10. Conflicts with Current Masterbrain

| Topic | Chat | SoT / Masterbrain | Verdict |
|-------|------|-------------------|---------|
| Build artifact | Single HTML iterations | Multiple demo lineages in repo audits | **Duplicate implementations** — see `DUPLICATES_AND_CONFLICTS.md` §2.5 |
| 26-coin economy screen | Full alphabet grid in demo | 5 MVP currencies in SoT | **Scope mismatch** |
| Process adherence | Freewheeling HTML rebuilds | Masterplan stages documented | **Process gap**, not product conflict |
| ωCoins mention | Locked at high tier | Not in SoT | **Unknown coin** — preserve only |

---

## 11. Canonical Candidates

| Candidate | Target |
|-----------|--------|
| 9-step presenter flow as canonical demo narrative | `INVESTOR_DEMO/DEMO_PATHS_AND_FLOWS.md` |
| Free exploration mode after guided flow | Demo UX pattern |
| March 23 five-step polish/deploy checklist | Demo completion criteria |
| Honest process note: HTML demo vs Vite scaffold fork | `DECISIONS/ARCHITECTURE_DECISIONS.md` |

---

## 12. Preserve-Only Notes

- `i-app-masterplan.md` referenced but not extracted in this thread — locate in IVAULT
- Screen line counts (683, 490) as build milestones

---

## 13. Obsolete Notes

- Rebuilding entire HTML file for each feature add — acknowledged as inefficient vs Vite scaffold path

---

## 14. Follow-Up Extraction Targets

- Conv `9f29c850` — Application development masterplan and stages (P0 rank 11)
- Conv `ee00baba` — Vite React shell (same day, April 10)
- Verify state of `~/i-app-demo/` scaffold on owner machine
