# P0-001: Complete App Feature Breakdown and Specifications

**Extraction batch:** P0 Batch 01  
**Extracted:** 2026-05-21

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `f7ba2d60-acf4-45c2-850a-5ff8b29eb064` |
| Title | Complete app feature breakdown and specifications |
| Date created | 2026-03-21 |
| Date updated | 2026-03-23 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json#f7ba2d60-acf4-45c2-850a-5ff8b29eb064` |
| Messages | 144 |
| Export caveat | Many artifact/code blocks show "This block is not supported on your current device yet" — structured summaries preserved; full artifact bodies not in export |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 237 | P0 | Source of Truth, Economy, Investor Demo, Attention, Trust, Cross-platform, Dev Workflow |

**Keywords matched:** `[ i ]`, i app, attention wallet, eye tracking, gaze, remote control, campaign, investor, demo, earn, rewards, wallet, trust, verification, iapp, media marketplace, Cursor

---

## 3. Project-Specific Summary

This thread is the **master feature inventory session** for [ i ]. The owner requested a definitive list of every feature, characteristic, and spec accumulated across prior sessions. Claude produced a **15-section, 60+ feature breakdown** organized into four layers (CORE, UX, ECONOMY, TECH), plus a recommended build sequence and infrastructure plan.

The session also established **dual-track development** (DEMO vs PRODUCTION), created five foundational MD files (design system, economy rules, feature bible, lessons, demo spec), and documented multi-environment workflow (Claude.ai for design/demo, Claude Code for production, MD files as shared brain).

Later messages in the thread drift into tooling setup (Cursor, Claude Desktop, project knowledge vs custom instructions, Vercel deploy troubleshooting) — extracted only where they affect project architecture.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-001-01 | Master breakdown uses **15 sections / 4 layers**: CORE, UX, ECONOMY, TECH | High |
| D-001-02 | **Design system first** in production build order; **investor demo first** for tangible output | High |
| D-001-03 | **Two tracks, never mix**: DEMO (mocked, zero backend) vs PRODUCTION (Supabase, real auth/currency) | High |
| D-001-04 | Five MD files are session-start required reading: design-system, economy-rules, feature-bible, lessons, demo-spec | High |
| D-001-05 | Claude.ai = design studio; Claude Code Opus = build engine; MD files = cross-device handoff | High |
| D-001-06 | Project Knowledge (not Custom Instructions) holds app-specific MD files | High |
| D-001-07 | Demo shares design system with production but **no shared backend or auth** | High |
| D-001-08 | Recommended production stack: React · TypeScript · Vite · Supabase · Tailwind · shadcn/ui · Vercel | Medium |

---

## 5. Extracted Feature/System Concepts

### 15-section master breakdown (referenced, artifact body missing from export)

**CORE layer**
- Product identity and thesis (attention wallet + media marketplace)
- Three participants (user, creator, advertiser)
- Core loop: Watch → Verify → Reward → Wallet → Spend/Convert/Withdraw

**UX layer**
- Navigation architecture (5-screen cross-navigation shell)
- Content feed (stories, topics, video interactions, mood sessions)
- Customizable UI layer (button repositioning, toolbar config)
- Onboarding & progressive trust
- Design system (tokens, typography, neumorphic/glass patterns)

**ECONOMY layer**
- 26-coin currency system (see conv 007 for detail)
- Wallet (balances, pending, restricted, history)
- Earn marketplace (watch, survey, GPS campaigns)
- Creator economy (revenue splits, tiers, tips, brand deals)
- Campaign builder (brand-side, conditions engine)

**TECH layer**
- Eye-tracking & remote control
- Trust & anti-abuse
- Cross-platform integration (import pipeline, oCoins provenance, xCoins bridge)
- Analytics & reporting
- Accessibility & edge cases

### Recommended build order (from thread)

1. Design System → 2. Navigation → 3. Onboarding/Trust → 4. Feed → 5. Wallet → 6. Earn → 7. Currency → 8. Creator Economy → 9. Campaign Builder → 10. Eye-tracking → 11. Trust/Anti-abuse → 12. Cross-platform → 13. Customizable UI → 14. Analytics → 15. Accessibility

---

## 6. Extracted UX/Design Ideas

- Mobile = design chair; desktop = build station; MD files maintain continuity
- Investor demo deployable to Vercel as single HTML — no build step for demo track
- Dark theme base `#070709`; Syne / DM Sans / JetBrains Mono font stack
- Currency colors immutable: iCoins mint `#4ade80`, vCoins amber `#f59e0b`

---

## 7. Extracted Technical Architecture Ideas

- Supabase: RLS on every table; currency mutations via Edge Functions only
- Auth: Supabase Auth only; no custom auth
- Realtime subscriptions must clean up on unmount
- DEMO: static deploy, mocked data, iPhone-safe viewport
- PRODUCTION: full Supabase schema, real ledger holds

---

## 8. Extracted Economy/Currency Ideas

- Vicoins + iCoins dual ledger in project instructions (pre-canonical naming)
- rCoins as internal pipeline — never shown as user balance
- 26-coin A–Z taxonomy referenced across sessions (detailed in conv 007)
- 60/30/10 revenue split referenced in related threads

---

## 9. Extracted Investor/Demo Ideas

- `i-app-demo-spec.md`: 9-step presenter narrative, mocked data, presenter mode
- Deploy target: `iappdemomarcelo.vercel.app`
- Demo validates UX and investor narrative before backend exists

---

## 10. Conflicts with Current Masterbrain

| Topic | Chat claim | `i_SOURCE_OF_TRUTH.md` | Verdict |
|-------|------------|------------------------|---------|
| Currency names | Vicoins / iCoins in CLAUDE.md paste | aCoins, iCoins, vCoins, eCoins, oCoins | **Naming conflict** — chat uses pre-canonical Vicoin/Icoin pair |
| Coin count | 26-coin A–Z system | 5 MVP currencies | **Scope expansion** — alphabet system is experimental until owner reconciles |
| Build priority | Design system first (production) | Investor Demo first | **Partial conflict** — SoT lists Investor Demo #1; chat recommends design system first for production path |
| Eye-tracking timing | Build eye-tracking last (Phase 4) | Optional verification signal in core loop | **Alignment** — SoT doesn't mandate eye-tracking in MVP |

---

## 11. Canonical Candidates

| Candidate | Rationale | Promote to |
|-----------|-----------|------------|
| 15-section feature taxonomy | Most complete structural inventory of [ i ] subsystems | `MASTERBRAIN_STRUCTURE.md` cross-ref or `RESEARCH/` |
| Dual-track DEMO/PRODUCTION split | Repeated across top P0 threads; reduces demo/backend conflation | `INVESTOR_DEMO/DEMO_PATHS_AND_FLOWS.md` |
| Session-start MD file protocol | Operational continuity pattern | `DECISIONS/ARCHITECTURE_DECISIONS.md` |
| Recommended build order (15 steps) | Actionable sequencing | Cross-check with SoT build priority |

---

## 12. Preserve-Only Notes

- Cursor vs Claude Code setup walkthroughs (tooling, not product)
- Vercel deploy troubleshooting (`i-app-demo.html` path errors)
- Project creation mistake / duplicate project guidance
- Remote control feature for Claude Code on phone

---

## 13. Obsolete Notes

- "Both DEMO and PRODUCTION tracks 🔴 Not started" — superseded by subsequent demo HTML builds (conv 002–006)
- Single-environment copy-paste workflow between Claude.ai and Claude Code — replaced by MD-file handoff protocol

---

## 14. Follow-Up Extraction Targets

- Recover actual text of 15-section breakdown if artifacts exist in IVAULT codex or repo docs
- Cross-link to conv `9f29c850` (Application development masterplan) — rank 11 P0
- Locate exported MD files: `i-app-design-system.md`, `i-app-economy-rules.md`, `i-app-feature-bible.md`, `i-app-demo-spec.md` in IVAULT tree
