# P0-014: UX/UI Strategy Separation (OpenAI)

**Extraction batch:** P0 Batch 02  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | OpenAI |
| Conversation ID | `69b4d658-8874-8333-aa87-4ac20502409c` |
| Title | UX/UI Strategy Separation |
| Date created | 2026-03-14 |
| Date updated | 2026-03-15 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CHATGPT/gpt chats/conversations-003.json#69b4d658-8874-8333-aa87-4ac20502409c` |
| Messages | 12 |
| Attachments | 5 UI reference images (glassmorphism mocks) |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 129 | P0 | UX, Tech Architecture, Economy, Attention, Dev Workflow |

---

## 3. Project-Specific Summary

Primary **UX constitution + implementation playbook** for [ i ] on mobile (Flutter). Repositioning document ("The Solution") is embedded: **attention wallet + media marketplace**, kill 5-screen cross navigation, adopt **Feed / Earn / Wallet / Profile**, soft depth not neumorphism, three product loops, Vicoin/Icoin model with 4 wallet states, progressive onboarding, earn-as-marketplace, wallet-as-dashboard, 5-step sponsored watch funnel, optional attention verification, accessibility rules.

Delivers **Flutter feature-first folder tree** (~200 files), Riverpod state management, 3-pass build order, full **`AGENTS.md`**, **`TASK_QUEUE.md`**, **`PROJECT_RULES.md`** templates for Codex. Strategy: **ChatGPT for decisions, Codex for files**; separate chats per domain with single master spec to prevent drift.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-014-01 | Replace 5-screen cross with **4-tab bottom nav** | High |
| D-014-02 | **Glassmorphism + soft depth**; never dominant neumorphism | High |
| D-014-03 | **Riverpod** for Flutter state | High |
| D-014-04 | Eye-tracking = **optional module**; never MVP dependency | High |
| D-014-05 | iGo under Earn ecosystem (local missions) | High |
| D-014-06 | `experimental_remote_control` feature flag isolated | High |
| D-014-07 | ChatGPT planning threads + Codex implementation threads + `AGENTS.md` | High |

---

## 5. Extracted Feature/System Concepts

### Information architecture

| Tab | Purpose |
|-----|---------|
| Feed | Immersive media; minimal anchors; layered disclosure |
| Earn | Offer marketplace; sponsored watch; iGo hooks |
| Wallet | Financial dashboard; payout readiness |
| Profile | Identity, settings, verification, creator tools |

### Verification module

- Consent → active camera → result → pending review → retry
- Remote control: focus ring, dwell-to-select, settings toggle

### TASK_QUEUE phases 0–9

Foundation → shell → onboarding → feed → earn → wallet → profile → verification → iGo → QA/investor demo mode

---

## 6. Extracted UX/Design Ideas

- Design law citations: Hick, Fitts, Jakob, Nielsen, Zeigarnik, goal-gradient, WCAG
- Persistent media anchors: creator, reward badge, audio, actions, wallet chip, sponsored progress only when relevant
- Active viewing screen: video + reward + progress + verification indicator + exit only
- Plain-language camera consent; failed verification shows reason

---

## 7. Extracted Technical Architecture Ideas

```
lib/core/     app, router, theme, constants, analytics, services
lib/shared/   models, widgets, components
lib/features/ auth, onboarding, feed, earn, wallet, profile, settings,
              verification, igo, experimental_remote_control
```

- Pass 1: shell + theme primitives + 4 placeholder screens
- Pass 2: offer cards, wallet cards, media surface
- Pass 3: flows (auth, sponsored watch, convert, withdraw, verification, iGo)

---

## 8. Extracted Economy/Currency Ideas

| Coin | Earn | Spend |
|------|------|-------|
| Vicoins | Organic/platform behavior | Boosts, tips, utilities, gamified |
| Icoins | Verified sponsored actions | Payout, redemption, transfers |

Wallet states: available, pending, restricted, lifetime earned.

Non-MVP rewards excluded: birthdays, "being online", vague good deeds.

---

## 9. Extracted Investor/Demo Ideas

- Phase 9: investor demo mode in TASK_QUEUE
- KPI stacks for users, advertisers, platform (completion rates, fraud flags, CAC to first payout)

---

## 10. Conflicts with Current Masterbrain

| Topic | Thread | SoT | Verdict |
|-------|--------|-----|---------|
| Product identity | Attention wallet + marketplace | Same | **Strong align** |
| Currency names | Vicoins / Icoins | a/i/v/e/o | **Naming conflict** |
| Flutter vs web stack | Flutter + Riverpod primary | Archive has Vite/React demos + flutter-runtime | **Implementation fork** |
| PROJECT_RULES early draft | "futuristic social platform" wording | SoT wallet-centric | **Wording drift** in §1–2 of template |

---

## 11. Conflicts with P0 Batch 1

| Topic | Batch 01 | This thread |
|-------|----------|-------------|
| Navigation | 9-step demo can use cross motifs (002) | Explicitly kills cross nav | **014 wins** for IA |
| Design v2 | Glass + light neumorphic settings (003) | Glass + soft depth | **Aligns** |
| 60/30/10 | Repeated (002, 007) | Implied in creator economy cites | **Aligns** |
| Instant demo credit | Demo instant wallet (002) | Pending states required | **Conflict** with demo behavior |

---

## 12. Canonical Candidates

| ID | Candidate | Confidence |
|----|-----------|------------|
| CC-B02-01 | 4-tab IA + kill cross-nav | High |
| CC-B02-02 | 5-screen sponsored watch funnel | High |
| CC-B02-03 | Soft depth placement rules | High |
| CC-B02-04 | AGENTS.md / TASK_QUEUE.md templates | Medium (process) |
| CC-B02-05 | Attention verification UX copy patterns | High |
| CC-B02-06 | Flutter folder taxonomy | Medium (if Flutter = production) |

---

## 13. Preserve-Only Notes

- Codex/OpenAI product marketing citations in thread
- Image assets as style references only — not literal copy
- Early PROJECT_RULES "social platform" phrasing — superseded by later AGENTS.md in same thread

---

## 14. Obsolete Notes

- 5-screen cross as primary navigation
- Full neumorphism as main visual system
- Earning for birthdays / vague benevolence
- Desktop dashboard layouts on phone

---

## 15. Follow-Up Extraction Targets

- Reconcile Flutter tree vs `eye-earn-sparkle` React archive
- Owner pick: Vicoin/Icoin vs canonical 5-coin for AGENTS.md promotion
- Map TASK_QUEUE to `MVP_CANONICAL_FLOW.md`
