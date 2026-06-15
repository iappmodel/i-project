# INVENTION_020 — Fibonacci Offer Ramp Curves

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Attention Economy UX
**Date:** 2026-06-15

## Problem Solved

Digital tipping and micro-payment interfaces face a fundamental UX tension: users either select a fixed amount from a limited set of options (which feels impersonal and static) or manually enter an amount (which introduces friction and decision fatigue). No existing system provides a continuous, gesture-driven amount escalation that follows a mathematically defined curve tied to engagement duration, creating a gamified "the longer you hold, the more you offer" experience that naturally maps to the user's level of appreciation.

## Current Industry Approach

Tipping interfaces on social platforms (YouTube Super Chat, TikTok gifts, Twitch Bits) present fixed denomination options that the user selects from a menu. Payment apps (Venmo, Cash App) require manual amount entry. Some live-streaming platforms offer animated gift effects that scale with price, but the amount is still selected from a preset list rather than continuously escalated through a gesture. No competitor uses Fibonacci-sequence-based escalation curves mapped to gesture hold duration for real-time amount ramp-up.

## How [ i ] Solves It

The [ i ] Fibonacci Offer Ramp system maps the duration of a gesture hold (e.g., holding a "tip" button) to an escalating offer amount that follows a Fibonacci-inspired curve. Three ramp profiles — gentle, standard, and aggressive — use different Fibonacci-based step arrays. A configurable tick interval (default 140ms) advances the step index as the user holds the gesture. A "deep hold" modifier (activated after an extended hold threshold) applies a 1.35x multiplier to the current curve value. The amount is always clamped between a configurable minimum and maximum, and further clamped to the user's available wallet balance. This creates an intuitive, gamified micro-payment experience: a quick tap gives a small tip, a sustained hold escalates through a satisfying mathematical progression, and a deep hold intensifies the escalation — all without requiring the user to type a number or select from a menu.

## System Description

The ramp system consists of three predefined Fibonacci-based step curves stored as integer arrays: `gentle` ([0, 1, 2, 3, 5, 8, 13, 21, 34] — 9 steps, max 34), `standard` ([0, 1, 2, 3, 5, 8, 13, 21, 34, 49, 73, 99] — 12 steps, max 99), and `aggressive` ([0, 2, 5, 8, 13, 21, 34, 49, 73, 99, 150, 200] — 12 steps, max 200). Each curve begins near zero and escalates following Fibonacci-like intervals, though the aggressive profile starts at 2 and reaches higher values more quickly. The `rampStepIndex()` function converts elapsed offering time in milliseconds to a step index by dividing by the tick interval (default 140ms). The `rampAmount()` function maps a step index to a curve value: it clamps the index to the curve's valid range, retrieves the value, applies the 1.35x deep-hold multiplier if active, and clamps the result between the configured minAmount and maxAmount. The ramp configuration is embedded in each `ButtonInstanceConfig` as a `ButtonRampConfig` object with preset name, minAmount, and maxAmount. The `clampTipAmount()` utility further constrains the final amount to the user's wallet balance for the selected coin type. During the gesture lifecycle (idle → arming → armed → offering → review), the ramp activates during the "offering" phase and the amount display updates in real-time with each tick, creating a visual escalation effect.

## Technical Components

- `app/src/lib/gestureButtons/ramp.ts` — Core ramp logic: `STEP_CURVES` (3 Fibonacci profiles), `rampStepIndex()`, `rampAmount()` with deep-hold multiplier
- `app/src/lib/gestureButtons/types.ts` — `ButtonRampConfig` type (preset, minAmount, maxAmount), `GesturePhase` enum, `OfferSession` type with coin and amount
- `app/src/lib/gestureButtons/offerService.ts` — Offer lifecycle management (createOfferDraft, transitionOffer, formatCoinLabel)
- `app/src/lib/gestureButtons/presets.ts` — Preset button configurations with embedded ramp configs (like-love: standard/99, comment: gentle/50, share: gentle/50)
- `app/src/lib/gestureButtons/configStore.ts` — Persistent button configuration storage with ramp config preservation

## Data Flow

1. User initiates a tip gesture by pressing and holding a gesture button on the immersive feed.
2. After the arming threshold (default 500ms), the gesture transitions from "arming" to "armed."
3. The user swipes in a direction mapped to a coin type (e.g., swipe up for viCoin, swipe down for iCoin).
4. The gesture transitions to "offering" and the elapsed offering timer begins.
5. `rampStepIndex()` converts elapsed milliseconds to a step index (elapsed / 140ms tick).
6. `rampAmount()` maps the step index to the appropriate curve value based on the button's ramp preset (gentle/standard/aggressive).
7. If the hold exceeds the deep-hold threshold (default 3000ms), the 1.35x multiplier activates.
8. The amount is clamped to [minAmount, maxAmount] from the ramp config.
9. `clampTipAmount()` further constrains to available wallet balance.
10. The real-time amount is displayed to the user, escalating visually with each tick.
11. User releases to confirm the current amount; the offer transitions to "review" then "settled."

## User Flow

1. User is watching media on the immersive feed and wants to tip the creator.
2. User presses and holds the like/love button (heart icon).
3. After a brief arming period, the button indicates it's ready for a tip gesture.
4. User swipes up (for viCoin) while holding — the offer amount begins escalating.
5. The amount display updates in real-time: 1... 2... 3... 5... 8... 13... 21... following the Fibonacci curve.
6. The longer the user holds, the higher the offer goes — creating a satisfying "how generous do I feel?" moment.
7. If the user holds deeply (past the deep-hold threshold), amounts escalate faster with the 1.35x multiplier.
8. User releases when the amount feels right — no typing, no menu selection.
9. The offer enters review, and the user confirms or cancels.

## Economic Flow

1. The ramp curve converts gesture duration (a continuous time signal) into a discrete currency amount.
2. Value flows from the user's wallet (iCoin or viCoin balance) to the content creator.
3. The gentle/standard/aggressive profiles allow platform-level tuning of micro-payment velocity — gentle for cautious economies, aggressive for high-engagement markets.
4. The deep-hold multiplier rewards sustained commitment: users who are truly enthusiastic can signal it through longer holds.
5. Wallet balance clamping ensures users cannot offer more than they have, preventing over-commitment.
6. The Fibonacci progression creates natural "breakpoints" that feel satisfying to land on (3, 5, 8, 13, 21...), encouraging slightly higher tips than arbitrary linear ramps would produce.

## Fraud Prevention

- Wallet balance clamping (`clampTipAmount`) ensures offers never exceed available funds.
- The ramp maximum (configurable per button, e.g., 99 for standard, 200 for aggressive) creates an upper bound on any single tip.
- The offer lifecycle requires explicit confirmation (review phase) before settlement.
- Ramp configuration is stored per-button with defaults, preventing manipulation of curve parameters without persistent configuration changes.
- The tick interval (140ms) creates a natural pace that prevents instantaneous escalation to maximum values.

## Unique Elements

1. **Fibonacci-based escalation curves** — Tip amounts follow Fibonacci-inspired mathematical progressions rather than linear ramps or fixed denominations, creating a natural-feeling escalation with satisfying breakpoints.
2. **Gesture-duration-to-amount mapping** — Continuous gesture hold time is converted to a discrete currency amount through configurable tick intervals, eliminating manual amount entry and menu selection.
3. **Three tunable ramp profiles** — gentle, standard, and aggressive profiles allow platform-level economy tuning while maintaining the same Fibonacci-based mathematical foundation.
4. **Deep-hold multiplier** — An extended hold beyond a threshold activates a 1.35x multiplier, rewarding sustained engagement commitment and creating a secondary escalation layer.
5. **Real-time wallet-clamped amount display** — The escalating amount is displayed in real-time during the gesture, clamped to both the ramp maximum and the user's available wallet balance.

## Potential Patent Claims

1. A method for determining a micro-payment amount through a gesture interface, comprising: detecting a gesture hold on a user interface element mapped to an economic action; computing a step index from elapsed hold duration divided by a configurable tick interval; mapping the step index to an amount value using a Fibonacci-based step curve selected from a plurality of profiles; applying a multiplier when the hold duration exceeds a deep-hold threshold; clamping the amount to a configured maximum and to the user's available wallet balance; and displaying the escalating amount in real-time during the gesture.
2. A system for gamified micro-payments in a media platform, comprising: a ramp engine with a plurality of Fibonacci-based step curves defining amount-over-time profiles; a gesture detection module that converts hold duration to a step index via a configurable tick interval; a balance constraint module that clamps computed amounts to a wallet balance for a selected currency type; and a real-time display module that renders the escalating amount as the user maintains the gesture, transitioning through an offer lifecycle from draft to review to settlement.
3. A computer-implemented method for escalating offer amounts during a gesture-driven tipping interaction, comprising: maintaining a plurality of Fibonacci-based step curves with distinct escalation aggressiveness; computing an offer amount by indexing into a selected curve based on elapsed gesture duration; activating a multiplicative boost when the gesture exceeds a configurable deep-hold threshold; constraining the offer to a maximum and to the user's wallet balance; and persisting the offer through a state machine lifecycle requiring explicit user confirmation.

## Potential Competitors

- **YouTube (Super Chat)** — Fixed denomination selection; no gesture-based escalation
- **TikTok (Gifts)** — Pre-priced virtual gifts from a menu; no continuous ramp
- **Twitch (Bits/Cheers)** — Fixed bit amounts; no hold-duration escalation
- **Instagram (Badges)** — Fixed-price badges in live; no gesture-driven amount
- **Twitter/X (Tips)** — Manual amount entry; no gesture ramp
- **Patreon** — Fixed tier pledges; no real-time gesture-based amount selection

## Related Files

- `app/src/lib/gestureButtons/ramp.ts`
- `app/src/lib/gestureButtons/types.ts`
- `app/src/lib/gestureButtons/offerService.ts`
- `app/src/lib/gestureButtons/presets.ts`
- `app/src/lib/gestureButtons/configStore.ts`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 7 |
| Patentability | 8 |
| Business Value | 8 |
