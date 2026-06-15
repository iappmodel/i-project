# INVENTION_044 — Wheel Mechanic (Scroll-Direction Attention Earning)

**Inventor:** Marcelo Silva  
**Category:** Patent  
**Family:** Attention Economy UX  
**Date:** 2026-06-15  
**Feature ID:** F-054  
**Build status:** 30% specified | 70% production UX + settlement

## Problem Solved
Attention economy platforms reward passive watch time only. Users who actively navigate content via scroll gestures generate engagement signals that go unmonetized. No system maps scroll direction and velocity to distinct virtual currency types through verified attention sessions.

## Current Industry Approach
TikTok and Instagram reward passive views via algorithmic promotion, not direct user earning from scroll behavior. Mobile games use spin-wheel mechanics for random rewards (gambling-adjacent). Fitness apps reward movement but not content navigation. No platform ties scroll direction to currency class selection (utility vs. cash-equivalent) under POP verification.

## How [ i ] Solves It
The [ i ] Wheel Mechanic detects scroll direction and velocity on the immersive feed. Upward scroll (next content) earns vCoins (utility, non-withdrawable); downward scroll (revisit/save path) earns iCoins (cash-equivalent path) — both gated by active POP attention session. Scroll delta accumulates in session evidence; on session seal, server classifies scroll events and issues appropriate coin type via `issue-reward` with `source: wheel_scroll`. Anti-farm: velocity cap, direction change cooldown, minimum attention score per scroll burst.

## System Description
The wheel mechanic integrates with the immersive feed scroll physics. A **Scroll Classifier** reads delta-Y per frame: positive delta (content moves up = user scrolls down) maps to "advance" class; negative delta maps to "recall" class. A **Velocity Gate** rejects inhuman scroll speeds (>threshold px/ms). A **Session Accumulator** adds classified scroll events to attention session evidence bag. On seal: **Server Classifier** recomputes scroll distribution; **Coin Mapper** applies economy rules — advance bursts → vCoin accrual, recall bursts → iCoin accrual (at reduced rate). Daily caps apply per coin type. UI: subtle wheel indicator at feed edge showing scroll-earning direction hints.

## Technical Components
- Scroll handler on `ImmersiveFeedScreen` vertical gesture
- `attentionSession.recordScrollEvent(direction, velocity, timestamp)`
- Economy rules §4.2 wheel mechanic tier
- `issue-reward` edge: `source_tag: wheel_scroll`, `direction: advance|recall`
- Anti-farm: max scroll events per minute, overrun ratio with content duration
- Prototype reference: `iapp_immersive_feed.html` scroll physics section

## Data Flow
1. User scrolls immersive feed during active attention session.
2. Scroll classifier records direction + velocity per event.
3. Velocity gate drops inhuman bursts.
4. Accumulator stores in session evidence (client).
5. On seal: proof packet includes scroll distribution summary (counts, not raw stream).
6. Server validate-attention recomputes; issue-reward maps to vCoin or iCoin.
7. Wallet updates with coin-type-specific lot.

## User Flow
User watches video; scrolls up to next — small vCoin indicator pulses. Scrolls down to rewatch — iCoin path indicator (lower rate, labeled). End of session: seal proof; wallet shows mixed coin earnings by scroll behavior.

## Economic Flow
vCoins (advance scroll) feed Loop 2 discovery incentives; iCoins (recall scroll) feed Loop 3 value path at reduced rate vs. full watch completion. Prevents farming via velocity caps and POP gate.

## Fraud Prevention
- POP session required — no scroll earning without verified attention
- Velocity cap rejects bot-like scrolling
- Server recomputes scroll classification — client tags advisory only
- Daily cap per coin type from trust tier
- Direction cooldown prevents oscillation farming

## Unique Elements
1. Scroll direction maps to distinct currency classes (utility vs. cash-equivalent)
2. Integration with POP session evidence and server-recomputed settlement
3. Velocity-gated anti-farm without blocking legitimate navigation
4. Wheel mechanic as first-class earn path alongside watch completion

## Potential Patent Claims
1. A method for earning digital currency through content feed scroll gestures comprising: classifying scroll direction into advance and recall categories during a verified attention session; accumulating classified scroll events in session evidence; server-recomputing scroll distribution upon session seal; and issuing distinct virtual currency types based on scroll category.
2. A system for anti-farm scroll-based earning comprising velocity gates, direction change cooldowns, and proof-of-presence session prerequisites before currency issuance.

## Potential Competitors
TikTok (scroll engagement algorithm), Brave (attention tokens), mobile game wheel reward mechanics

## Related Files
- `MASTER_BRAIN/ECONOMY/i-app-economy-rules.md`
- `06_feed_earning_loops/iapp_immersive_feed.html`
- `app/src/screens/ImmersiveFeedScreen.tsx`
- `app/supabase/functions/issue-reward/index.ts`

## Scores
| Metric | Score (1-10) |
|--------|-------------|
| Priority | 7 |
| Patentability | 7 |
| Business Value | 7 |
