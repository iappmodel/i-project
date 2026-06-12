# Abacus AI — Full Build Prompt for [ i ]

**Purpose:** Copy-paste master command to build an investor-grade interactive prototype on Abacus AI.  
**Canonical law:** `CANONICAL/i_SOURCE_OF_TRUTH.md`, `CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md`, `CANONICAL/FEATURE_BIBLE.md`, `ECONOMY/i-app-economy-rules.md`  
**Updated:** 2026-06-12

---

## How to use

1. Open Abacus AI → **Create App** (or “build from prompt”).
2. Paste the entire block below.
3. Scope: **Mobile-first web app**, dark theme, investor demo, mocked backend.
4. For character limits, use `ABACUS_AI_BUILD_PROMPT_SHORT.md`.
5. For incremental builds, use `ABACUS_AI_BUILD_PROMPT_PHASES.md`.

---

## FULL PROMPT (copy from here)

```text
BUILD A COMPLETE INTERACTIVE PROTOTYPE OF THE MOBILE APP "[ i ]" (pronounced "i" — lowercase bracket-i logo).

═══════════════════════════════════════════════════════════════
SECTION 1 — WHAT [ i ] IS
═══════════════════════════════════════════════════════════════

[i] is an **Attention Wallet and Media Marketplace**.

It transforms human attention into a measurable, rewardable, transferable asset.

TODAY'S PROBLEM:
- Users create value; platforms capture value.
- Advertising runs on weak signals (clicks, views, impressions) that are easy to fake.
- Users are exploited, creators are underpaid, advertisers waste money.

[i]'S SOLUTION — THE ATTENTION ECONOMY:
Instead of: Advertiser → Platform
The flow becomes: Advertiser → Creator → Viewer → Platform
Everyone participates. Everyone earns. Everyone benefits.

TAGLINE OPTIONS (pick one for splash):
- "Your attention has value."
- "Watch. Verify. Earn."
- "The Attention Wallet."

THREE PARTICIPANTS:
1. **User (Viewer)** — Provides verified attention; watches, engages, completes actions; receives rewards; builds an attention portfolio and trust score.
2. **Creator** — Publishes content, runs campaigns, receives tips and revenue share; earns on quality engagement, NOT follower count.
3. **Advertiser/Brand** — Purchases verified human attention; launches campaigns with defined actions, rewards, and verification requirements; gets transparent reporting on genuine consumption.

THE HEARTBEAT — CORE LOOP (must work end-to-end in prototype):
Watch → Verify → Reward → Wallet → Spend / Convert / Withdraw → Repeat

If this loop is broken, the product is broken.

THREE PRODUCT LOOPS (build Loop 1 fully; Loop 2 & 3 as secondary surfaces):

**Loop 1 — Watch → Verify → Earn** (FLAGSHIP — "the money loop")
1. Open Earn marketplace or immersive feed with sponsored content
2. Tap offer — see reward, duration, verification requirements, revenue split
3. Complete — watch video, survey, or GPS check-in
4. Verify — 5-gate qualification engine confirms genuine attention
5. Reward hits wallet — iCoins credited (pending validation first, then available)
6. Cash out, convert, or spend — loop closes

**Loop 2 — Browse → Save → Return** (retention loop)
1. Consume full-bleed media feed
2. Save creators, offers, content to vault/board (double-tap gesture)
3. Notifications for saved creators' new offers
4. Return to saved content
5. Earn again → feeds back into Loop 1

**Loop 3 — Balance → Convert → Use** (value loop)
1. View wallet balances (iCoins, vCoins, pending, restricted)
2. Convert rCoins → iCoins (trust-tier-adjusted rates)
3. Withdraw to bank/PayPal/crypto OR spend on boosts, tips, marketplace

═══════════════════════════════════════════════════════════════
SECTION 2 — CRITICAL VISUAL LAW (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════

The consumer app MUST look like **Picture 2 — Immersive Glass Media Shell**.
DO NOT build a fintech dashboard as the primary UX.

REJECTED AS PRIMARY UX (do not use as home screen):
- Grey card dashboard with "Attention Wallet" page header
- ACOIN/ICOIN grid cards as first screen
- Desktop titlebar above phone mockup
- Dense grey panels, neumorphic 3D stacked buttons
- Card-list TikTok feed with stories row as default home
- Dev/debug footers on user-facing screens

REQUIRED — IMMERSIVE SHELL LAYOUT (mobile phone frame, full-bleed):

| Zone | Element | Description |
|------|---------|-------------|
| Background | Full-bleed photo/video | Edge-to-edge media, no padding on screen |
| Center | **ELO** | Transparent glass face membrane — user AI companion presence |
| Top | **TIMER** | Full-width 2px progress line showing watch/earn progress |
| Top-right | **REWARD pill** | Glass pill showing e.g. "50ic" or "Validating…" |
| Right rail | **LIKE → MESSAGE → SHARE → CONTROLS** | 40px glass circles stacked vertically |
| Bottom-left | **OUT-PROFILE** | Creator avatar + name (e.g. RAFAELO) + location (e.g. Cape Town) |
| Bottom | **5-TAB DOCK** | FEED · PROMO · CREATE (+) · WALLET · IN-PROFILE |

GLASS OVERLAY RULES:
- Background: rgba(7, 7, 9, 0.42) with backdrop-filter: blur(8–10px)
- Thin white borders: 0.5px solid rgba(255,255,255,0.12)
- Soft scrims over media; controls float above content
- Dark luxury aesthetic — void black, not grey fintech

DESIGN TOKENS:
- --bg-void: #070709
- --bg-deep: #0a0a0f
- --bg-surface: #111118
- --text-primary: #f0ede8
- --text-secondary: #9997a0
- --text-muted: #4a4858
- --icoin-primary (mint green): #4ade80
- --vcoin-amber: #f59e0b
- --accent-cyan: #00e5ff
- --accent-lime: #b4ff47

TYPOGRAPHY:
- Headings/display: **Syne** (700 weight, tight letter-spacing)
- Body/UI: **DM Sans**
- All numbers, coin amounts, timers: **JetBrains Mono**
- Dark theme ONLY — no light mode toggle

MOTION:
- Reward moment: scale + mint glow pulse
- Coin credit: +1 pop animation
- Gate verification: sequential pass animation (~550ms per gate)
- Screen transitions: slide from swipe direction
- Respect prefers-reduced-motion

═══════════════════════════════════════════════════════════════
SECTION 3 — INFORMATION ARCHITECTURE (5-TAB BOTTOM DOCK)
═══════════════════════════════════════════════════════════════

Build a light soft-UI bottom bar with raised center "+" button:

1. **FEED** — Immersive media home (DEFAULT landing screen after splash)
2. **PROMO** — Sponsor briefs, earn marketplace, map campaigns
3. **CREATE** — Studio entry (center elevated + button)
4. **WALLET** — Opens as glass bottom sheet overlay (NOT dashboard-first navigation)
5. **IN-PROFILE** — User settings, trust score, personality config

Loop 1 (Watch → Verify → Earn) runs ON TOP of media, not as separate app chrome.

═══════════════════════════════════════════════════════════════
SECTION 4 — ELO — THE AI COMPANION (CENTER MEMBRANE)
═══════════════════════════════════════════════════════════════

ELO is a **living presence membrane** — NOT a chatbot card, NOT a bottom-right orb.

Visual:
- Semi-transparent frosted glass face contours (jaw, brows, eyes, nose, lips)
- Sculptural glass depth (eye sockets, cheek highlights)
- Centered over full-bleed media (~62% width)
- Idle breathe + subtle head tilt animation
- Reacts to speech energy when user talks

Activation flow:
1. Small "Say ELO" pill appears (non-blocking) on feed entry
2. User taps pill → mic arms → says "ELO"
3. Face membrane manifests at center (~1.35s emergence animation)
4. First visit → onboarding sheet: "I heard you"
5. Tap membrane → glass presence panel (chat, insights, personality stack)

Personality stack (settings):
- Primary + optional secondary preset
- Relationship mode: mentor, companion, muse
- Operating mode: Founder, Monk, Artist
- Presence rooms: Philosophy, Focus, Creator, Sleep, Study

ELO must NOT replace the OUT-PROFILE creator chip (bottom-left).

═══════════════════════════════════════════════════════════════
SECTION 5 — GESTURE BUTTONS (RIGHT RAIL)
═══════════════════════════════════════════════════════════════

Every overlay control is user-composable. Ship with these defaults on the LIKE/LOVE button:

| Gesture | Action |
|---------|--------|
| Single tap | Like (toggle, no wallet debit) |
| Double tap | Save to vault |
| Triple tap | Boost (demo stub toast) |
| Hold 500ms | Enter offer mode — cross-arm UI appears |
| Hold + swipe UP | Tip vCoins (ramp counter while held) |
| Hold + swipe DOWN | Tip iCoins (ramp counter while held) |
| Long-press CONTROLS (1s) | Open gesture button builder/settings |

Offer lifecycle on hold+swipe:
1. **Draft** — ramp counter while dragging
2. **Review** — REWARD pill glows mint; OfferReviewSheet opens (presets 5/13/49, slider, Send/Cancel)
3. **Validating** — spinner on pill ("Validating…")
4. **Settled** — highlight, fade out

REWARD pill states:
- idle: "50ic" mono top-right
- review: mint glow, tappable
- validating: "Validating…"
- settled: fade out

Rail buttons (top to bottom): LIKE/LOVE, MESSAGE, SHARE, CONTROLS
All 40px glass circles with backdrop blur.

═══════════════════════════════════════════════════════════════
SECTION 6 — CURRENCY SYSTEM (26+ω TAXONOMY — SHOW TOP 6 IN PROTOTYPE)
═══════════════════════════════════════════════════════════════

TWO CORE WALLET CURRENCIES (always separate, never combined in UI):

| Currency | Symbol | Type | Color | Real value |
|----------|--------|------|-------|------------|
| **iCoins** | i⬡ | Cash-equivalent | Mint #4ade80 | YES — withdrawable to USD |
| **vCoins** | v◈ | Utility credits | Amber #f59e0b | NO — platform features only |

IMMUTABLE: iCoins and vCoins are separate ledgers. Never interchangeable without conversion pipeline.

OTHER COINS TO REFERENCE (unlock progressively):
- **aCoins** — Attention (verified watching — foundation currency)
- **eCoins** — Engagement (likes, comments, shares)
- **rCoins** — Reward hub (all earning flows through here before iCoins)
- **oCoins** — Origin (imported content provenance)

CONVERSION PIPELINE:
Earning coins (a/e/f/w/k/s) → rCoins → iCoins / mCoins / uCoins
Base rate: 100 rCoins = 1 iCoin (improves at higher trust tiers)
iCoins → bCoins (boost): 1:100 one-way burn, irreversible

WALLET 4-STATE MODEL:
- Available balance (iCoins + vCoins)
- Pending balance (awaiting validation)
- Restricted balance (trust hold)
- Lifetime earned (read-only)

THE WHEEL BUTTON (secondary earn mechanic):
- Scroll UP → earn vCoins (outward/social energy)
- Scroll DOWN → earn iCoins (inward/personal value)
- Heart tap → +1 both types
- Mechanical scroll patterns trigger fraud flag (demo toast)

═══════════════════════════════════════════════════════════════
SECTION 7 — ATTENTION VERIFICATION & 5-GATE ENGINE
═══════════════════════════════════════════════════════════════

Goal: qualification, NOT surveillance.

Verification signals (prototype: simulate all):
- Dwell time on content
- Interaction quality (likes, completion)
- Navigation behavior
- Device signals (on-device check)
- Eye tracking (optional — simulated gaze cursor + attention score 0–100)
- Behavioral patterns

5-GATE REWARD QUALIFICATION (all must pass before payout):

Gate 1: Device signal valid (on-device, not emulated) ✓
Gate 2: Dwell threshold met (minimum watch time) ✓
Gate 3: Attention score sufficient (≥70 for sponsored) ✓
Gate 4: Completion event received (video end) ✓
Gate 5: Fraud check passed (behavioral fingerprint clean) ✓

UI: Sequential gate animation, ~550ms per gate, green checkmarks.
After gates pass → reward goes to **Pending Validation** first (not instant available balance).
Show "Pending Validation" state in wallet until settlement completes.

EYE-TRACKING LAYER (DEMO = simulated):
- Simulated gaze cursor on watch screen
- Attention score ring (SVG animated, 0–100)
- Live oscillation (realistic, not perfect 100)
- Camera consent screen before eye-tracked offers: "Processing stays on device"
- Skip option: "Skip eye-tracking (0.5× reward)"
- Tracking badge: camera icon when active

POP (Proof of Presence System) — narrative only in prototype:
Device emits proof packet (derived signals only, no raw gaze transmitted).
Local-first. On-device only.

═══════════════════════════════════════════════════════════════
SECTION 8 — REVENUE MODEL & TRUST
═══════════════════════════════════════════════════════════════

REVENUE SPLIT (canonical — show on offer detail and creator economics screens):
- 60% → Creator
- 30% → Viewer reward pool
- 10% → Platform

Rules:
- Zero platform cut on direct user-to-user tips
- Platform fee on ad/attention value = 10%
- Withdrawal fees separate: Bank ACH free; instant debit 1.5%

TRUST SYSTEM:
Trust is a primary asset. Determines: payout speed, earning limits, conversion rates, feature access.

Trust Tiers (1–4):
| Tier | Score | rCoins→iCoins rate | Cash-out speed | Daily aCoin cap |
|------|-------|-------------------|----------------|-----------------|
| 1 | 0–25 | 100:1 | 14 days | 500 |
| 2 | 26–50 | 95:1 | 7 days | 1,000 |
| 3 | 51–75 | 88:1 | 3 days | 2,500 |
| 4 | 76–100 | 80:1 | Instant | Unlimited |

CREATOR TIERS (quality-based, NOT follower count):
1. Newcomer (1.0×) → 2. Rising (1.25×) → 3. Established (1.5×) → 4. Signature (2.0×)

═══════════════════════════════════════════════════════════════
SECTION 9 — ALL SCREENS TO BUILD (INVESTOR DEMO ORDER)
═══════════════════════════════════════════════════════════════

Build these screens with working navigation between them. Use mocked data throughout — zero real backend required.

**PHASE A — CORE DEMO SPINE (P0 — build first):**

1. **Splash / Identity**
   - [ i ] logo (bracket-i), dark void background
   - Tagline: "Your attention has value"
   - Tap anywhere to continue

2. **Immersive Feed (DEFAULT HOME)**
   - Full-bleed sunset/video background
   - ELO membrane center, timer top, reward pill top-right
   - OUT-PROFILE: RAFAELO · Cape Town (bottom-left)
   - Right rail gesture buttons
   - 5-tab bottom dock
   - One sponsored card with "Watch & Earn +2.00 ic" badge
   - Swipe up/down to change clips (3–4 mocked clips)
   - Lane dots indicator

3. **Offer Detail**
   - Brand: Nike (example)
   - Campaign: "Pegasus 41 — Run Your World"
   - Watch duration: 4:30
   - Reward: +2.00 iCoins
   - Requirements: Full watch, eye-tracking, attention ≥70
   - Split preview: You earn / Creator 60% / Platform 10%
   - CTA: "Start watching"

4. **Camera Consent** (for eye-tracked offers)
   - Transparent notice: "Gaze processing stays on your device"
   - "Allow camera & start" / "Skip eye-tracking (0.5×)"

5. **Active Watch / Verify**
   - Full-screen video placeholder (gradient or loop)
   - Timer countdown + progress line
   - Attention score ring (animated, e.g. 78/100)
   - Earn accrual counter ticking up
   - Eye-tracking badge (camera icon)
   - Simulated gaze cursor
   - "Complete & verify" enabled at ~100% progress

6. **Verification Result (5-Gate)**
   - Sequential animation of 5 gates passing
   - Final score: Attention 80/100 · Watch time complete
   - CTA: "Collect reward"

7. **Reward Reveal**
   - Large mint glow: "+2.00 iCoins"
   - Source: Nike Pegasus 41 campaign
   - Status: "Pending validation" (NOT instant available)
   - Attention score + watch time summary
   - CTA: "See wallet update"

8. **Wallet (Glass Sheet + Full Screen)**
   - iCoins available: e.g. 847.00
   - vCoins available: e.g. 1,240
   - Pending: +2.00 (just earned)
   - Lifetime earned: 12,450
   - Transaction history (5 recent rows with icons)
   - Filter chips: All / Earned / Spent / Pending
   - Quick actions: Withdraw · Convert · Transfer · Promote

9. **Convert Screen**
   - rCoins → iCoins conversion
   - Rate display (trust-tier-adjusted, e.g. 100:1)
   - Amount entry + confirmation
   - Success animation

10. **Withdraw Preview**
    - Available: 849 iCoins = $8.49 USD preview
    - Methods: Bank (free) · PayPal · Gift Card · Crypto
    - Instant debit fee: 1.5%
    - Confirm → success state

11. **Creator Economics**
    - Visual split: 60% Creator / 30% Viewer / 10% Platform
    - Creator tier table
    - Earnings simulator (CPM inputs)
    - Footnote: "Illustrative — live rates vary"

12. **Roadmap / Closer** (optional presenter screen)
    - Eye-tracking proof layer narrative
    - POP v2 status
    - Platform vision timeline

**PHASE B — SECONDARY SURFACES (P1):**

13. **Earn Marketplace (Promo tab)**
14. **GPS Campaign Map**
15. **Profile / In-Profile Sheet**
16. **Gesture Button Builder**
17. **Onboarding Flow**

**PHASE C — CREATOR/BRAND SIDE (P2 — scaffold only):**

18. **Campaign Builder (5 steps)**
19. **Studio Editor (scaffold)**

═══════════════════════════════════════════════════════════════
SECTION 10 — MOCK DATA (USE THESE EXACT VALUES)
═══════════════════════════════════════════════════════════════

DEFAULT USER: Trust tier 2 (score 42) · iCoins 847.00 · vCoins 1,240 · Pending 2.00 · Lifetime 12,450

DEFAULT OFFER: Nike · Pegasus 41 — Run Your World · +2.00 iCoins · 4:30 · attention ≥70

DEFAULT CREATOR: RAFAELO · Cape Town · initials RA

FEED CLIPS: sunset organic · Nike sponsored +2.00ic · music organic · brand promo +1.50ic

═══════════════════════════════════════════════════════════════
SECTION 11 — TECHNICAL REQUIREMENTS
═══════════════════════════════════════════════════════════════

- Mobile-first responsive web (375×812 iPhone frame)
- React + TypeScript + Vite OR Next.js — static deployable
- No backend — mocked data; localStorage for config flags
- Deploy: Vercel/Netlify; must work on iPhone Safari
- Presenter mode: ?presenter=1 with Prev/Next tour
- Subtle banner: "Demo · Mocked data"

═══════════════════════════════════════════════════════════════
SECTION 12 — PRODUCT CHARACTER
═══════════════════════════════════════════════════════════════

Feel: luxury dark, cinematic, trustworthy fintech, human-first, premium-not-casino.
Copy: "Verified attention" not "free money"; "Pending validation" not "instant credit".

═══════════════════════════════════════════════════════════════
SECTION 13 — DO NOT BUILD
═══════════════════════════════════════════════════════════════

No real payments, backend, camera, OAuth, full 26-coin grid, KYC live flow, dashboard home, light mode, neumorphic primary UI.

═══════════════════════════════════════════════════════════════
SECTION 14 — SUCCESS CRITERIA
═══════════════════════════════════════════════════════════════

Investor on iPhone in <3 min: immersive feed → Nike offer → watch+score → 5 gates → pending reward → wallet → withdraw preview → 60/30/10 economics.

Build Phase A first. Mobile-first. Dark immersive glass. Loop 1 end-to-end.
```

---

## Repo reference assets

| Asset | Path |
|-------|------|
| Immersive feed HTML | `06_feed_earning_loops/iapp_immersive_feed.html` |
| Loop 1 flow | `06_feed_earning_loops/iapp_loop1_watch_verify_earn.html` |
| UI simulator | `06_feed_earning_loops/app_ui_simulator.html` |
| React immersive shell | `app/src/screens/ImmersiveFeedScreen.tsx` |
| MVP flow map | `docs/MVP_CANONICAL_FLOW.md` |
