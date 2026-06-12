# Abacus AI — Phased Build Prompts for [ i ]

**Use when:** Building incrementally on Abacus. Run prompts in order.  
**Full spec:** `ABACUS_AI_BUILD_PROMPT.md`

---

## Phase 0 — Scaffold

```text
Create a mobile-first React+TypeScript+Vite app for "[ i ]" — Attention Wallet and Media Marketplace.

Requirements:
- iPhone frame 375×812 centered on dark void background #070709
- Fonts: Syne, DM Sans, JetBrains Mono from Google Fonts
- CSS tokens: --icoin #4ade80, --vcoin #f59e0b, --text-primary #f0ede8
- React Router or state machine for screen navigation
- DemoContext: wallet balances (iCoins 847, vCoins 1240, pending 2), mock transactions
- Subtle top banner: "Demo · Mocked data"
- No backend. localStorage for flags.

Do not build content yet — shell + routing + design tokens only.
```

---

## Phase 1 — Immersive Feed (default home)

```text
Add the [ i ] Immersive Feed screen — this is the DEFAULT HOME after splash.

VISUAL (Picture 2 — mandatory):
- Full-bleed background image/video (use sunset landscape placeholder)
- Glass overlays only — NO dashboard cards
- TOP: 2px timer line at 38% progress
- TOP-RIGHT: glass pill "50ic"
- CENTER: ELO face membrane placeholder (frosted SVG contour face, idle breathe animation)
- BOTTOM-LEFT: OUT-PROFILE — avatar "RA", "RAFAELO", "Cape Town"
- RIGHT RAIL: 4 glass circles 40px — heart, message, share, settings icons
- BOTTOM: 5-tab dock — Feed, Promo, Create (+ raised), Wallet, Profile — light soft UI bar

Interactions:
- Swipe up/down changes clip (3 mocked clips with lane dots)
- Clip 2 = Nike sponsored with "Watch & Earn +2.00 ic" badge — tap opens Offer Detail route
- Wallet tab opens glass bottom sheet (stub)
- Glass style: rgba(7,7,9,0.42) backdrop-blur 10px

Reference feel: TikTok full-bleed + Apple glass, NOT fintech dashboard.
```

---

## Phase 2 — Loop 1 spine (Watch → Verify → Earn)

```text
Wire [ i ] Loop 1 end-to-end with these screens and navigation:

1 OFFER DETAIL
- Nike Pegasus 41 — Run Your World
- Reward +2.00 iCoins, watch 4:30, requirements: full watch + eye-tracking + attention ≥70
- Split row: Creator 60% / Viewer pool 30% / Platform 10%
- CTA "Start watching"

2 CAMERA CONSENT
- "Gaze processing stays on your device"
- "Allow camera & start" | "Skip eye-tracking (0.5×)"

3 ACTIVE WATCH
- Full-screen gradient/video placeholder
- Countdown timer, attention score ring (animate 65→82), earn counter ticking
- Simulated gaze dot moving on screen
- Camera tracking badge
- "Complete & verify" enabled at 100%

4 VERIFICATION (5-GATE)
- Gates pass one-by-one (~550ms each): Device · Dwell · Attention · Completion · Fraud
- Green checks, then "Collect reward"

5 REWARD REVEAL
- Large "+2.00 iCoins" mint glow animation
- Status: PENDING VALIDATION (not instant available)
- Nike campaign source, attention 80/100
- CTA "See wallet update" → updates DemoContext pending balance

All mocked. No real camera. Pending-first honesty.
```

---

## Phase 3 — Wallet + Convert + Withdraw

```text
Build [ i ] Wallet surfaces:

GLASS SHEET (from feed Wallet tab):
- iCoins available 847.00 (mint, JetBrains Mono)
- vCoins 1,240 (amber) — separate row, never combined
- Pending +2.00 with pulsing indicator
- Lifetime earned 12,450 read-only
- 5 recent transactions with icons and status tags
- Filter chips: All / Earned / Spent / Pending
- CTAs: Withdraw · Convert · Transfer · Promote

CONVERT SCREEN:
- rCoins → iCoins, rate 100:1 (trust tier 2)
- Amount input, confirmation, success toast

WITHDRAW PREVIEW:
- 849 iCoins = $8.49 USD
- Methods: Bank (free), PayPal, Gift Card, Crypto
- Instant debit note: 1.5% fee
- Confirm → success state

After reward from Loop 1, pending Nike +2.00 appears at top of tx list.
```

---

## Phase 4 — Gesture buttons + Offer flow

```text
Implement [ i ] gesture button system on the LIKE/heart button in immersive feed:

Defaults:
- Single tap → toggle like + count
- Double tap → "Saved to vault" toast
- Triple tap → "Boost queued" demo toast
- Hold 500ms → cross-arm UI appears
- Hold + swipe up → vCoin tip ramp counter
- Hold + swipe down → iCoin tip ramp counter
- Release → OfferReviewSheet: presets 5/13/49, slider, Send/Cancel

REWARD pill states:
idle "50ic" → review (mint glow) → validating spinner → settled fade

Long-press CONTROLS 1s → gesture builder sheet (rebind actions, save localStorage).

Rail must capture pointer — feed does not scroll during gesture.
```

---

## Phase 5 — ELO companion layer

```text
Add ELO AI companion to [ i ] immersive feed:

- Center glass face membrane: SVG procedural contours (brows, eyes, jaw), semi-transparent
- Idle: subtle breathe + head tilt CSS animation
- Small pill bottom-center: "Say ELO" — tap arms mic (mock)
- On activate: 1.35s emergence draw animation, face fades in
- First visit: sheet "I heard you" onboarding
- Tap face → glass presence panel: chat input (mock replies), personality picker
- Personality: mentor / companion / muse; operating mode Founder/Monk/Artist
- Persist config in localStorage

ELO is center membrane. RAFAELO OUT-PROFILE stays bottom-left. Do not replace creator chip.
```

---

## Phase 6 — Promo tab + Creator economics

```text
Add to [ i ]:

EARN MARKETPLACE (Promo tab):
- Balance strip: iCoins / pending / vCoins
- Hero Nike offer card
- Category pills: Watch · Survey · GPS · Action
- 4 offer cards (2 instant, 2 conditional)

CREATOR ECONOMICS SCREEN (presenter slide):
- Large visual: 60% Creator / 30% Viewer / 10% Platform
- Creator tier table: Newcomer 1.0× → Signature 2.0×
- Simple CPM earnings simulator
- Footnote: illustrative only

GPS MAP (stub):
- Map placeholder with 2 pins, tap pin → check-in flow → +reward toast

Link Promo tab in bottom dock. Keep immersive glass language throughout.
```

---

## Phase 7 — Presenter mode + polish

```text
Polish [ i ] prototype for investor demo:

ANIMATIONS:
- Reward reveal: scale 1→1.1 + mint box-shadow pulse
- Gate checks: staggered 550ms with spring ease
- Coin credit: +1 float up fade
- prefers-reduced-motion: disable nonessential motion

PRESENTER MODE (?presenter=1):
- Fixed bottom chips: ← Prev | Next →
- Linear tour order: Splash → Feed → Offer → Consent → Watch → Verify → Reward → Wallet → Convert → Withdraw → Economics → Roadmap
- Current step label top-center

SPLASH:
- [ i ] bracket logo, Syne 700
- "Your attention has value"
- Tap anywhere → Feed

ROADMAP CLOSER:
- 3 bullets: POP proof layer, eye-tracking on-device, attention marketplace vision

Deploy-ready static build. Must work on iPhone Safari.
```

---

## Phase 8 — Onboarding (optional)

```text
Add [ i ] first-run onboarding:

1 Welcome — value prop
2 Mock sign-up (name only)
3 Coin intro — aCoins (attention), iCoins (cash), vCoins (utility) — 3 unlock cards
4 Wheel button tutorial — scroll up=vCoins, scroll down=iCoins, heart=both
5 Guided first earn — deep-link to Nike offer
6 Eye-tracking consent — skippable
7 Profile setup stub

Set localStorage onboardingComplete=true. Skip on return visits.
```

---

## Quick reference — phase order

| Phase | Delivers |
|-------|----------|
| 0 | Scaffold + tokens + routing |
| 1 | Immersive feed home |
| 2 | Loop 1 watch→verify→earn |
| 3 | Wallet convert withdraw |
| 4 | Gesture buttons |
| 5 | ELO companion |
| 6 | Promo + economics |
| 7 | Presenter polish |
| 8 | Onboarding (optional) |

**Minimum investor demo:** Phases 0–3 + Phase 7 splash/presenter.
