# P0-012: Removing the Streak Bar Feature

**Extraction batch:** P0 Batch 02  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `185d9905-0b1e-404e-8f65-affc334854ba` |
| Title | Removing the streak bar feature |
| Date created | 2026-03-18 |
| Date updated | 2026-03-18 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json#185d9905-0b1e-404e-8f65-affc334854ba` |
| Messages | 53 |
| Export caveat | Thread **pivots** from streak removal to Social Command Center / FLUX app build; later messages **re-add** streak UI |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 135 | P0 | Economy, UX, Investor Demo, Cross-platform (drift) |

**Keywords matched:** attention wallet, studio, earn, rewards, wallet, media marketplace

---

## 3. Project-Specific Summary

The owner opened with **"eliminate the streak bar"** and a screenshot of a **12-day streak** banner in the mobile UI. Claude could not edit without source files, then the conversation **abandoned** that task and expanded into a **"Social Media Command Center"** vision (aggregate Instagram/TikTok/YouTube/Facebook), built **FLUX [i]** — a full Vite/React demo with Dashboard, Feed, Earn, Wallet, Studio, Profile — deployed to **`flux-i-app.vercel.app`**.

**Critical extraction note:** Later in the same thread, Claude **adds** a "12-day streak!" banner and streak counter as a feed feature when the owner requests engagement features — **contradicting** the opening removal request. Treat streak UI as **obsolete / rejected** per owner intent unless re-approved.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-012-01 | Owner wants **streak bar removed** from demo UI (12-day streak notification) | High (intent) |
| D-012-02 | Streak-based engagement later proposed by assistant — **not owner-requested** in final feature batch | Medium |
| D-012-03 | FLUX app uses **5-area shell**: Dashboard, Feed, Earn, Wallet, Studio (+ Profile) | High |
| D-012-04 | Deploy target: **flux-i-app** on Vercel | High |

---

## 5. Extracted Feature/System Concepts

### FLUX [i] screens (built in thread)

- **Dashboard** — unified stats (reach, views, Icoins earned today)
- **Feed** — organic + sponsored; sponsored green border; earn badges
- **Earn** — balance strip, hero offer, categories
- **Wallet** — Icoin header, withdraw/convert/send/spend, transactions
- **Studio** — Analytics, Inbox sub-tabs
- **Profile** — identity, 11 connected platforms grid, verification

### Social Command Center roadmap (preserve-only expansion)

Phases 0–6: consumption → identity → publishing → AI intelligence → economy → community. **Not MVP** per SoT — mark experimental.

### Streak bar (original request)

- UI element: persistent "12-day streak" banner with visual bars
- Owner judgment: **gamification that may conflict** with verifiable-rewards-only MVP (aligns with OpenAI UX thread §12)

---

## 6. Extracted UX/Design Ideas

- Warm glass / amber accent FLUX aesthetic (distinct from cold fintech demos in batch 01)
- Sponsored cards: green border glow, "Watch & Earn"
- Studio as creator command center (analytics + inbox)

---

## 7. Extracted Technical Architecture Ideas

- Vite + React + Recharts + lucide-react
- Single `App.jsx` ~1377 lines deployment artifact
- Static HTML fallback (`flux-i.html`) when build fails
- Vercel project `flux-i-app` (separate from `iview` / eye-earn-sparkle projects)

---

## 8. Extracted Economy/Currency Ideas

- Icoins / Vicoins / pending shown in FLUX wallet strip
- Platform aggregation monetization (analytics, scheduling, brand deals) — **Phase 5+**, not core wallet thesis

---

## 9. Extracted Investor/Demo Ideas

- Live URL **flux-i-app.vercel.app** for merged demo
- Full app UI pitch: "all screens" for mobile + web

---

## 10. Conflicts with Current Masterbrain

| Topic | Thread | SoT | Verdict |
|-------|--------|-----|---------|
| Streak rewards | Removed (intent) vs re-added (later msg) | Verifiable rewards only; no vague participation | **Conflict** — follow removal intent |
| Primary nav | Dashboard + 5 areas | Feed/Earn/Wallet/Profile (4 tabs) | **IA conflict** with conv 014 / brief 009 |
| Social command center | Aggregation hub GTM | Attention wallet + marketplace | **Strategic fork** — experimental |
| "11 connected platforms" | Profile grid | Cross-platform import is oCoins/provenance layer | **Scope creep** |

---

## 11. Conflicts with P0 Batch 1

| Topic | Batch 01 | This thread |
|-------|----------|-------------|
| Navigation | 4-tab bottom nav (002, 009) | Dashboard-first + Studio tab |
| Design | Glass/light neumorphic settings (003) | Warm amber FLUX glass |
| Demo URL | iappdemomarcelo / HTML single file (005) | flux-i-app.vercel.app |
| Non-MVP rewards | Excluded in brief (009) | Streak counter reintroduced |

---

## 12. Canonical Candidates

| Candidate | Notes |
|-----------|-------|
| **Anti-pattern:** streak banners for MVP | Flag in `OBSOLETE/` or MVP exclusions |
| FLUX screen inventory | Reference-only for demo archaeology |
| Earn balance strip pattern | Overlaps 009 — prefer brief over FLUX |

---

## 13. Preserve-Only Notes

- Hootsuite/Buffer precedent essays — market research only
- Vercel deploy troubleshooting (zip, base64 App.jsx) — process
- Personal Vercel team/project IDs

---

## 14. Obsolete Notes

- 12-day streak banner UI (owner asked to remove)
- Streak counter in engagement feature list (assistant suggestion)
- Social Media Command Center as **primary** product identity
- Full cross-platform OAuth hub as v1

---

## 15. Follow-Up Extraction Targets

- Locate exact artifact/file containing streak bar (screenshot dated 2026-03-18)
- Diff FLUX App.jsx vs iappdemomarcelo HTML for IA reconciliation
- Owner confirm: reject all streak/gamification surfaces for MVP?
