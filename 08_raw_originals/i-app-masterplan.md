# [ i ] App — Build Masterplan
> The strategic execution plan for building the [ i ] attention wallet & media marketplace.
> Two parallel tracks. Six stages. Every part builds on the last.
> Read this at the start of every session alongside the feature bible.

---

## Architecture Overview

```
STAGE 0 ─── Foundation (shared)
   │
   ├── DEMO TRACK ──────────────────────── PRODUCTION TRACK
   │                                        │
STAGE 1 ─── Demo: Core Screens             │
STAGE 2 ─── Demo: Interactive Flows         │
STAGE 3 ─── Demo: Polish & Deploy      STAGE 3 ─── Prod: Backend Foundation
   │                                        │
   │  ← investor pitch happens here →       │
   │                                        │
   │                                    STAGE 4 ─── Prod: Core Consumer App
   │                                    STAGE 5 ─── Prod: Economy & Marketplace
   │                                    STAGE 6 ─── Prod: Creator & Brand Tools
```

**Critical rule:** Demo stages (1–3) are the immediate priority. Production stages (3–6) begin after the demo is deployed and investor conversations are underway. Stage 0 is shared — everything built here serves both tracks.

---

## STAGE 0 — Foundation (Shared)
**Timeline:** 2–3 sessions
**Goal:** Design system implemented as reusable code. Every UI session after this references these components — nothing is invented from scratch.
**Unlocks:** Every stage that follows.

### Part 0.1 — Project Scaffold
| Task | Details |
|---|---|
| Vite + React + TypeScript init | `npm create vite@latest i-app -- --template react-ts` |
| Tailwind CSS 4 setup | With custom config from design system |
| Folder structure | `src/components/`, `src/screens/`, `src/hooks/`, `src/data/`, `src/lib/` |
| Google Fonts loaded | Syne, DM Sans, JetBrains Mono |
| CSS custom properties | Full token set from `i-app-design-system.md` |
| Tailwind config extension | Colors, fonts, radius, spacing overrides |
| Git init + .gitignore | Standard React/Vite ignores |

**Deliverable:** Empty app that loads with correct fonts, colors, and dark background. Nothing else visible.

### Part 0.2 — Primitive Components
| Component | Variants | Notes |
|---|---|---|
| `NeuButton` | default, hover, active, disabled | The signature neumorphic button |
| `NeuButtonCircle` | default, active (with glow) | Toolbar/action style |
| `Card` | surface, elevated | With border-subtle/border-mid |
| `GlassOverlay` | modal, bottom-sheet | Backdrop blur + border |
| `CurrencyChip` | iCoins, vCoins | Color-coded, labeled, mono font |
| `EarnProgressBar` | standard | Lime→green gradient fill |
| `AttentionRing` | SVG animated | Cyan/amber/rose by score threshold |
| `Badge` | default, accent variants | Small pill with label |
| `Avatar` | with gradient ring, seen state | For stories bar |
| `BottomSheet` | standard | Slide-up glass panel |

**Deliverable:** Storybook-style preview page showing every component in every state.

### Part 0.3 — Motion System
| Animation | Implementation |
|---|---|
| Spring easing constants | CSS variables + Framer Motion config |
| Button press | scale(0.97) + shadow-in, 120ms |
| Reward moment | scale(1.15) → scale(1) spring + glow pulse |
| Coin unlock | scale(0→1) + glow + 300ms stagger |
| Screen transitions | Slide from swipe direction, 350ms |
| Content fade | opacity 0→1, 200ms |
| `prefers-reduced-motion` | Wrapper that disables all above |

**Deliverable:** Motion preview page demonstrating each animation.

### Part 0.4 — Layout Shell
| Element | Details |
|---|---|
| App shell | Full viewport, `--bg-void` background |
| Bottom tab bar | 4 tabs (Feed, Earn, Wallet, Profile) + safe area |
| Header bar | 56px height, logo left, actions right |
| Screen container | Scrollable content area between header and tabs |
| Tab routing | Simple state-based screen switching (no router yet) |

**Deliverable:** App shell with tabs that switch between empty placeholder screens.

---

## STAGE 1 — Demo: Core Screens
**Timeline:** 3–4 sessions
**Goal:** All 9 presenter screens exist as static views with mocked data. No interactivity yet — just the visual narrative.
**Unlocks:** Stage 2 (interactions) and investor walkthrough rehearsal.
**Depends on:** Stage 0 complete.

### Part 1.1 — Splash Screen (Presenter Step 1)
| Element | Details |
|---|---|
| `[ i ]` logo | Syne 28px bold, centered, fade-in animation |
| Tagline | "Attention Wallet & Media Marketplace" — DM Sans, text-secondary |
| Background | `--bg-void` with ambient cyan orb, subtle grid texture |
| Entry | Tap anywhere → transitions to feed |

### Part 1.2 — Content Feed (Presenter Step 2)
| Element | Details |
|---|---|
| Stories bar | 5 mocked story avatars with gradient rings |
| Topic filter bar | Horizontal pill row (Friends, Promo, For You, Trending) |
| 4 content cards | 2 organic + 2 sponsored from `DEMO_FEED` data |
| Sponsored badge | "Watch & Earn" badge with iCoin amount |
| Earn progress bar | On sponsored cards, static at 0% |
| Scroll behavior | Vertical scroll-snap between cards |

### Part 1.3 — Wallet Screen (Presenter Step 4)
| Element | Details |
|---|---|
| iCoins balance card | Primary — large amount, mint green glow |
| vCoins balance card | Secondary — amber, slightly smaller |
| Pending indicator | "83.20 pending" with amber dot |
| Quick actions row | Withdraw, Transfer, Exchange, Promote buttons |
| Transaction history | 8 mocked transactions from `DEMO_TRANSACTIONS` |
| Filter chips | All, Earned, Spent, Pending |

### Part 1.4 — Earn Marketplace (Presenter Step 5)
| Element | Details |
|---|---|
| Balance strip | Top bar showing iCoins / pending / vCoins |
| Featured offer | Hero card — Spotify watch campaign |
| Offer list | 3 cards: Watch, Survey, GPS from `DEMO_OFFERS` |
| Category pills | All, Watch, Survey, GPS, Challenges |
| Offer card design | Brand logo area, reward amount, time required, eye-tracking badge |

### Part 1.5 — Economy Overview (Presenter Step 7)
| Element | Details |
|---|---|
| Coin grid | Top 6 coins: aCoins, iCoins, vCoins, eCoins, fCoins, cCoins |
| Coin card | Icon + letter + name + one-line purpose |
| Tap to expand | Shows fuller description (Stage 2 interaction) |
| Conversion flow visual | Pipeline diagram: earning → rCoins → spendable |
| Tier unlock timeline | Visual showing Day 1 → Week 1 → Month 1 unlocks |

### Part 1.6 — Creator Split (Presenter Step 8)
| Element | Details |
|---|---|
| Revenue split viz | Animated donut/flow: 60% creator / 30% viewer / 10% platform |
| Comparison callout | "We take 10%. Others take 45%." |
| Creator tier ladder | 4 tiers with multiplier badges |
| Quality metric note | "Based on engagement quality, not follower count" |

### Part 1.7 — Trust Score (Presenter Step 9)
| Element | Details |
|---|---|
| Trust score display | Ring with 74/100, Tier 3 badge |
| Tier progression | 4-tier ladder with unlock descriptions |
| Score effects | Conversion rate, payout speed, access level per tier |
| Anti-gaming note | "Your reputation is your moat" messaging |

### Part 1.8 — Profile Screen
| Element | Details |
|---|---|
| Avatar + name + handle | Alex Rivera, @alexrivera, verified badge |
| Trust tier badge | Tier 3 — "Established" |
| Stats row | 142K views, 71 engagement score, 23-day streak |
| Wallet summary | iCoins + vCoins mini display |
| Settings stub | Visual only, non-functional |

### Part 1.9 — Presenter Controls
| Element | Details |
|---|---|
| Demo mode banner | Top-right, "Investor Preview", subtle, 50% opacity |
| Triple-tap logo | Reveals presenter step nav |
| Step navigation | ← Step N of 9 → with step titles |
| Reset demo | Returns all state to initial values |
| Free explore toggle | Exits presenter mode, enables full navigation |

**Deliverable:** All 9 screens rendered with mocked data. Presenter can navigate between them. No interactive flows yet — tapping a sponsored card doesn't launch the watch flow.

---

## STAGE 2 — Demo: Interactive Flows
**Timeline:** 3–4 sessions
**Goal:** Every screen comes alive. Tapping things does things. The demo feels like a real app.
**Unlocks:** Investor pitch readiness.
**Depends on:** Stage 1 complete.

### Part 2.1 — Watch & Earn Flow (Presenter Step 3)
The core money-moment of the entire app. This must be flawless.

| Screen | Details |
|---|---|
| Offer detail | Brand, reward amount, watch time, consent toggle |
| Active video | Simulated video (gradient + motion), camera icon, attention ring animating |
| Attention simulation | Score oscillates 60–85 realistically (not perfect, not random) |
| Progress bar | Fills over simulated watch duration (compressed to ~8 seconds for demo) |
| Reward reveal | Coin burst animation, "+$1.50 iCoins" counter ticks up |
| Wallet update | Balance increments with glow, new transaction appears at top |

**Flow:** Feed → tap sponsored card → offer detail → "Start Watching" → active video (8s) → reward reveal → auto-return to feed with updated balance.

### Part 2.2 — Wheel Button (Presenter Step 6)
| Interaction | Details |
|---|---|
| Scroll up | vCoins +1 pop animation (amber) |
| Scroll down | iCoins +1 pop animation (green) |
| Heart tap | Both +1 simultaneously |
| Inertia | Scroll has momentum, coins pop faster during fast scroll |
| Counter | Running total display that increments |
| Fraud hint | If scrolled mechanically fast for 3+ seconds, brief amber warning flash |

### Part 2.3 — Feed Interactions
| Interaction | Details |
|---|---|
| Double-tap to like | Heart pop animation at tap point |
| Stories tap | Opens story viewer (3 mocked stories, tap to advance) |
| Topic pills | Tap to toggle, feed cards filter/reorder with animation |
| Sponsored card tap | Routes to watch & earn flow (Part 2.1) |
| Scroll snap | Cards snap vertically on scroll release |

### Part 2.4 — Wallet Interactions
| Interaction | Details |
|---|---|
| Withdraw tap | Opens payout method selection bottom sheet |
| Method selection | Bank, PayPal, Gift Card, Crypto — visual only |
| Transaction tap | Slides up detail sheet with full transaction info |
| Filter chips | Toggle to filter transaction list |
| Balance animation | Numbers animate on first load (count up from 0) |

### Part 2.5 — Earn Marketplace Interactions
| Interaction | Details |
|---|---|
| Offer card tap | Opens offer detail screen |
| Watch offer → launch | Routes to watch flow (Part 2.1) |
| GPS offer tap | Shows map view with location pulse |
| Survey offer tap | Shows survey preview (visual only) |
| Category pills | Filter offer list |

### Part 2.6 — Economy & Trust Interactions
| Interaction | Details |
|---|---|
| Coin grid tap | Expands to show full description + unlock stage |
| Conversion pipeline | Animated flow when tapped |
| Trust tier tap | Shows unlock details per tier |
| Creator split | Animated on first view (segments grow from center) |

### Part 2.7 — Navigation Polish
| Interaction | Details |
|---|---|
| Tab switching | Smooth crossfade between screens |
| Swipe gestures | Left/right swipe between adjacent screens |
| Back navigation | Consistent back button behavior in all sub-flows |
| Deep transitions | Watch flow → reward → wallet feels seamless |
| State persistence | Earned rewards persist across tab switches during session |

**Deliverable:** Fully interactive demo. Every tap resolves. Investor can explore freely after the guided walkthrough.

---

## STAGE 3A — Demo: Polish & Deploy
**Timeline:** 1–2 sessions
**Goal:** Production-grade polish. Deploy to Vercel. Shareable URL in hand.
**Unlocks:** Investor meetings.
**Depends on:** Stage 2 complete.

### Part 3A.1 — Visual Polish Pass
| Task | Details |
|---|---|
| Ambient orbs | Subtle background gradient orbs on splash, feed, wallet |
| Grid texture | On splash and economy screens |
| Glow consistency | Every interactive glow matches design system exactly |
| Shadow audit | Every neumorphic element on correct base color |
| Font audit | Zero instances of system fonts anywhere |
| Color audit | iCoins always green, vCoins always amber, no exceptions |
| Spacing audit | 16px minimum horizontal padding everywhere |

### Part 3A.2 — Mobile Testing & Fixes
| Task | Details |
|---|---|
| iPhone Safari test | All screens, all interactions |
| Android Chrome test | All screens, all interactions |
| Safe area | Bottom tab clears iOS home indicator |
| Touch targets | All buttons ≥ 44px tap target |
| Scroll behavior | No overscroll bouncing on feed |
| Viewport | No horizontal scroll, no zoom on double-tap |

### Part 3A.3 — Deploy
| Task | Details |
|---|---|
| Build test | `npm run build` succeeds with zero errors |
| Preview deploy | Vercel preview URL for testing |
| Production deploy | Final Vercel deploy with custom URL |
| URL test | Shareable link works on iPhone, Android, desktop |
| Bookmark test | Correct title, icon when saved to home screen |

**Deliverable:** Live URL. Works on any phone. Ready to hand to an investor.

---

## STAGE 3B — Production: Backend Foundation
**Timeline:** 3–4 sessions
**Goal:** Supabase infrastructure set up with auth, schema, RLS, and Edge Functions.
**Unlocks:** Stage 4 (consumer app).
**Can run in parallel with:** Stage 3A (demo polish).

### Part 3B.1 — Supabase Project Setup
| Task | Details |
|---|---|
| Create Supabase project | Production instance |
| Auth configuration | Email + social providers |
| Database schema design | Users, wallets, transactions, content, campaigns |
| RLS policies | Every table locked down from day one |
| Edge Functions scaffold | Currency mutations, reward disbursement, webhook handlers |
| Environment variables | `.env.local` template, Vercel/Netlify secrets |

### Part 3B.2 — Schema: Users & Auth
| Table | Key columns |
|---|---|
| `profiles` | id, handle, display_name, avatar_url, trust_score, trust_tier, created_at |
| `user_settings` | id, user_id, notification_prefs, eye_tracking_consent |
| `devices` | id, user_id, device_fingerprint, platform, last_seen |
| Auth triggers | On signup → create profile, assign Day 1 coins |

### Part 3B.3 — Schema: Currency Ledger
| Table | Key columns |
|---|---|
| `wallets` | id, user_id, coin_type, available, pending, restricted, lifetime |
| `transactions` | id, user_id, coin_type, amount, direction, source, status, created_at |
| `conversion_log` | id, user_id, from_coin, to_coin, amount_in, amount_out, rate, trust_tier_at_time |
| Edge Function: `process-earning` | Validates 5-gate qualification → credits wallet |
| Edge Function: `process-conversion` | rCoins → iCoins/mCoins/uCoins with tier-adjusted rates |

### Part 3B.4 — Schema: Content & Campaigns
| Table | Key columns |
|---|---|
| `content` | id, creator_id, type, source_platform, media_url, created_at |
| `campaigns` | id, brand_id, title, reward_type, reward_amount, watch_threshold, budget, status |
| `impressions` | id, campaign_id, user_id, attention_score, watch_duration, reward_amount, qualified |
| `interactions` | id, content_id, user_id, type (like/comment/share/bookmark), created_at |

### Part 3B.5 — Schema: Trust & Anti-Abuse
| Table | Key columns |
|---|---|
| `trust_events` | id, user_id, event_type, delta, reason, created_at |
| `behavioral_signals` | id, user_id, signal_type, data_json, flagged, created_at |
| `strikes` | id, user_id, level, reason, expires_at |
| Edge Function: `evaluate-trust` | Processes events → updates trust_score + tier |

### Part 3B.6 — Realtime Configuration
| Channel | Purpose |
|---|---|
| `wallet:{user_id}` | Balance updates in real-time |
| `campaign:{campaign_id}` | Live impression counts for advertisers |
| `content:{content_id}` | Live reactions/comments |

**Deliverable:** Fully configured Supabase backend. All tables created. All RLS policies enforced. Edge Functions deployed. Auth working. No frontend yet — just the infrastructure.

---

## STAGE 4 — Production: Core Consumer App
**Timeline:** 5–7 sessions
**Goal:** Real working app with auth, feed, wallet, and the watch-to-earn loop connected to the live backend.
**Unlocks:** Stage 5 (marketplace and economy).
**Depends on:** Stage 3B complete.

### Part 4.1 — Auth Flow
| Screen | Details |
|---|---|
| Welcome screen | `[ i ]` identity, value prop, "Get Started" CTA |
| Sign up | Email + password via Supabase Auth |
| Social auth | Google, Apple (if configured) |
| Profile setup | Handle, display name, avatar upload |
| Onboarding | First 3 coins intro, wheel tutorial, first earn moment |

### Part 4.2 — Live Feed
| Feature | Details |
|---|---|
| Content loading | Paginated fetch from `content` table |
| Video playback | Native video or embedded player |
| Stories bar | Real user stories from followed accounts |
| Topic filters | Server-side filtered queries |
| Like/comment/share | Real mutations via interactions table |
| Real-time reactions | Live counts via Realtime subscription |

### Part 4.3 — Live Wallet
| Feature | Details |
|---|---|
| Real balances | Fetched from `wallets` table |
| Real transactions | Paginated from `transactions` table |
| Real-time updates | Balance changes reflected instantly via Realtime |
| Withdraw flow | Edge Function → marks pending → processes payout |
| Conversion flow | rCoins → iCoins via Edge Function with trust-tier rate |

### Part 4.4 — Watch & Earn (Live)
| Feature | Details |
|---|---|
| Campaign display | Real campaigns from `campaigns` table |
| Attention tracking | Device signals collected during watch |
| 5-gate qualification | Edge Function validates all gates |
| Reward disbursement | Edge Function credits wallet on qualification |
| Impression logging | Full record stored for advertiser reporting |

### Part 4.5 — Wheel Button (Live)
| Feature | Details |
|---|---|
| Earning logic | Scroll events → attention verification → coin credit |
| Fraud detection | Behavioral fingerprint check on scroll patterns |
| Rate limiting | Daily soft cap enforcement by trust tier |
| Real-time counter | Live coin pop animations backed by real mutations |

**Deliverable:** Working app with real auth, real balances, and the core earn loop functional end-to-end.

---

## STAGE 5 — Production: Economy & Marketplace
**Timeline:** 4–6 sessions
**Goal:** Full coin economy, earn marketplace, and trust system operational.
**Unlocks:** Stage 6 (creator/brand tools).
**Depends on:** Stage 4 complete.

### Part 5.1 — Coin Unlock System
| Feature | Details |
|---|---|
| Progressive unlocks | Day 1, Week 1, Month 1, Month 2, Month 3+ triggers |
| Unlock animations | Scale + glow + tagline micro-interactions |
| Coin collection grid | All unlocked coins with descriptions |
| Unlock conditions | Activity milestones tracked via Edge Function |

### Part 5.2 — Earn Marketplace
| Feature | Details |
|---|---|
| Marketplace feed | Real campaigns, filterable by type |
| Watch campaigns | Full 5-gate flow connected to backend |
| Survey campaigns | Form-based tasks with completion verification |
| GPS campaigns | Location verification via device geolocation |
| Pending holds | Hold card UI with step-by-step status |
| Earning routes | Community-created campaign sequences |

### Part 5.3 — Trust System
| Feature | Details |
|---|---|
| Trust score display | In profile, with history chart |
| Score events | All trust-affecting actions logged |
| Tier effects | Conversion rates, payout speed, access gates |
| Behavioral fingerprinting | Scroll, tap, and eye-movement baselines |
| Strike system | 3-strike enforcement with appeals |

### Part 5.4 — Anti-Inflation Controls
| Feature | Details |
|---|---|
| Supply tracking | Circulating coin totals monitored |
| Auto-adjustment | Earning rates reduce when supply exceeds 120% of 90-day avg |
| Burn mechanics | bCoins irreversible burn from iCoins |
| Rate review tooling | Admin dashboard for quarterly rate adjustments |

### Part 5.5 — KYC & Payout Infrastructure
| Feature | Details |
|---|---|
| ID verification | Third-party KYC integration (first payout gate) |
| Tax form | $100+/month threshold trigger |
| Payout methods | Bank, PayPal, Gift Card, Crypto |
| Fee schedule | Per-method fees applied via Edge Function |
| Payout processing | Trust-tier-based processing speed |

**Deliverable:** Full economy running. Users can earn, convert, and cash out real value. Trust system prevents abuse.

---

## STAGE 6 — Production: Creator & Brand Tools
**Timeline:** 5–8 sessions
**Goal:** Creator economy, campaign builder, cross-platform import, and analytics.
**Unlocks:** Revenue generation, brand partnerships.
**Depends on:** Stage 5 complete.

### Part 6.1 — Creator Economy
| Feature | Details |
|---|---|
| Creator profile | Tier badge, quality score, earnings breakdown |
| Revenue dashboard | Ad share, tips, subscriptions, brand deals |
| Tipping flow | Tip button → tier selection → confirmation |
| Subscription tiers | Fan / Super Fan / Patron with badges |
| 60/30/10 split | Automated revenue distribution via Edge Function |

### Part 6.2 — Campaign Builder (Brand Side)
| Feature | Details |
|---|---|
| 5-step creation flow | Upload → action config → reward → threshold → schedule |
| Conditions engine | Visual block builder for hold conditions |
| Live preview | See exactly what users will see |
| Studio editor | Trim, split, filter, text, stickers, music overlay |
| Budget management | Spend tracking, pause/resume, analytics |

### Part 6.3 — Cross-Platform Integration
| Feature | Details |
|---|---|
| Instagram import | Content import via API/manual |
| TikTok import | Content import via API/manual |
| YouTube import | Content import via API/manual |
| oCoins provenance | Tag native vs imported content |
| xCoins bridge | Trust Tier 4 gate, platform-specific rates |

### Part 6.4 — Eye-Tracking (Native)
| Feature | Details |
|---|---|
| iOS ARKit | Face tracking via JSI bridge |
| Android MediaPipe | Face mesh via Kotlin TurboModule |
| On-device processing | Zero gaze data transmitted off-device |
| Consent UI | Transparent camera notice |
| Calibration | Per-user, per-content-type dwell thresholds |

### Part 6.5 — Analytics & Reporting
| Feature | Details |
|---|---|
| User-facing | Attention timeline, earning insights, content performance |
| Advertiser-facing | Impression quality, attention depth, campaign ROI |
| Admin | Platform health, circulating supply, conversion rates |
| Exports | CSV for all reporting views |

### Part 6.6 — Customizable UI Layer
| Feature | Details |
|---|---|
| Floating action buttons | Draggable, repositionable, persistent |
| Toolbar customization | Corner placement, orientation toggle |
| Creator mode feed builder | Block-based custom feed creation |
| Reels view | Full-screen scroll-snap with action rail |

**Deliverable:** Complete platform. Creators can earn, brands can run campaigns, users can earn and cash out.

---

## Dependency Map

```
Stage 0 (Foundation)
  ├─→ Stage 1 (Demo: Screens)
  │     └─→ Stage 2 (Demo: Interactions)
  │           └─→ Stage 3A (Demo: Polish & Deploy) ──→ INVESTOR PITCH
  │
  └─→ Stage 3B (Prod: Backend) ─── can start during Stage 2
        └─→ Stage 4 (Prod: Core App)
              └─→ Stage 5 (Prod: Economy)
                    └─→ Stage 6 (Prod: Creator & Brand)
```

---

## Session Estimation

| Stage | Sessions | Calendar estimate |
|---|---|---|
| **Stage 0** — Foundation | 2–3 | Week 1 |
| **Stage 1** — Demo screens | 3–4 | Week 1–2 |
| **Stage 2** — Demo interactions | 3–4 | Week 2–3 |
| **Stage 3A** — Demo deploy | 1–2 | Week 3 |
| **Stage 3B** — Backend | 3–4 | Week 3–4 (parallel) |
| **Stage 4** — Core app | 5–7 | Week 4–6 |
| **Stage 5** — Economy | 4–6 | Week 6–8 |
| **Stage 6** — Creator/Brand | 5–8 | Week 8–12 |
| **TOTAL** | ~30–40 sessions | ~10–12 weeks |

**Demo ready:** ~Week 3 (Stages 0–3A)
**MVP ready:** ~Week 6 (through Stage 4)
**Full platform:** ~Week 12 (all stages)

---

## Priority Rules

1. **Demo-first.** Stages 0–3A are the critical path to investor conversations. Nothing else matters until there's a live URL.
2. **Foundation once.** Stage 0 components are shared between demo and production. Build them right the first time.
3. **Backend can overlap.** Stage 3B (Supabase setup) can begin while Stage 3A (demo polish) is wrapping up.
4. **Each stage is shippable.** Every stage produces a deployable artifact. No stage ends in a broken state.
5. **Earn loop is the heartbeat.** At every stage, the Watch → Verify → Earn → Wallet flow must work. It's the product.

---

## What to Build First (Next Session)

**Stage 0, Part 0.1 — Project Scaffold.**

```
1. Vite + React + TypeScript
2. Tailwind CSS with [ i ] design tokens
3. Google Fonts (Syne, DM Sans, JetBrains Mono)
4. CSS custom properties from design system
5. App shell: void background, fonts rendering, nothing else
```

Say "go" and we start.
