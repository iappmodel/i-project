# INVENTION_038 — Timer Line + Coin Pill Top Chrome

**Inventor:** Marcelo Silva
**Category:** Design Patent
**Family:** Immersive UI Design
**Date:** 2026-06-15

## Problem Solved
Attention-monetization platforms face a fundamental UI tension: users need real-time feedback on session progress and earning potential, but traditional progress bars and dashboard widgets destroy the immersive full-bleed media experience. Displaying earning status in a separate screen or heavy overlay breaks flow and reduces the very engagement the platform is trying to measure and reward.

## Current Industry Approach
TikTok and Instagram show a thin playback progress bar at the bottom of videos but communicate nothing about earning or value. YouTube shows a progress bar but earning information (for creators) is buried in a separate Studio dashboard. Ad platforms show countdown timers for skippable ads but provide no value feedback to viewers. No consumer platform combines session progress with real-time earning feedback in a minimal chrome layer that preserves full-screen immersion.

## How [ i ] Solves It
The [ i ] platform introduces two coordinated top-chrome elements: the Timer Line and the Coin Pill. The Timer Line is a 2px-tall full-width progress bar positioned directly under the device notch, tracking session progress — white fill for organic content, amber fill for sponsored earning windows. The Coin Pill is a floating glass capsule in the top-right showing the exact coin amount on offer (e.g., "50ic") with a progress ring that fills as the user meets engagement criteria. Together, they provide real-time visual feedback of the attention-to-value conversion without any dashboard chrome, popup overlays, or screen transitions. Skipping or scrubbing pauses the earn timer — anti-farm by design. On completion, the Timer Line turns mint green (iCoin color) and the Coin Pill pulses with a glow animation, then transitions through Review → Validate → Settled phases before fading to wallet.

## System Description
The Timer Line occupies the `immersive-feed__timer` zone per Picture 2 design law — a 2px bar from left edge to right edge, positioned 8px below the top of the screen (under the notch). In organic mode, it reflects media playback progress with a white fill and subtle glow. In sponsored/earn mode, the fill color shifts to amber (`#f59e0b`), the track gains a box-shadow glow, and a timestamp label appears ("earn window · 3:04"). Skipping pauses the timer per offer rules — the media continues but the earn clock stops. At 100% completion, the fill transitions to mint green (`#4ade80`) and a radial flash confirms completion. The Coin Pill sits at the top-right corner of the immersive screen, rendered as a glass capsule (`rgba(7,7,9,0.42)`, `backdrop-filter: blur(10px)`, thin white border) containing a coin amount in monospace type and a small coin indicator. During sponsored content, a progress ring (SVG circle with animated stroke-dashoffset) wraps the pill, filling as engagement criteria are met. The pill transitions through six phases: Offer → Display → Accumulating → Complete (pulse animation) → Review ("tap to edit") → Validating (spinner) → Settled (fade out). The complete phase triggers a scale-up + glow animation (`rewardPulse` keyframes). The Timer Line completion is one input to the 5-gate POP verification engine — duration alone never authorizes settlement.

## Technical Components
- Timer Line: 2px `div` with CSS `width` transition, positioned absolute at top of `phone-screen` container
- Timer fill: separate `div` within track, width animated via percentage (8% → 42% → 68% → 100%)
- Timer glow: parallel `div` with `filter: blur(4px)` for soft light effect below the fill
- Timer label: centered monospace chip showing session state and elapsed time
- Color states: white (organic), amber `#f59e0b` (earn window), mint `#4ade80` (complete)
- Coin Pill: glass capsule with `backdrop-filter: blur(10px)`, `border-radius: 18px`, `position: absolute; top: 52px; right: 14px`
- Progress ring: SVG `<circle>` with `stroke-dasharray: 201` and animated `stroke-dashoffset` for arc progress
- Pill phases: CSS `data-phase` attribute driving 6 visual states via attribute selectors
- Completion animation: `@keyframes rewardPulse` (scale 1.06 → 1.1 → 1.06, 0.7s, 2 iterations)
- Glow effects: `box-shadow: 0 0 22px rgba(74,222,128,0.45)` on complete, `text-shadow: 0 0 12px rgba(74,222,128,0.8)` on amount
- Skip-pause logic: earn timer stops on scrub/skip events per `OfferDetailScreen` rules
- Verification link: Timer completion feeds POP 5-gate as duration-gate input
- React component: `ImmersiveFeedScreen.tsx` with `immersive-feed__timer` class
- CSS: `gesture-buttons.css` for glass styling tokens

## Data Flow
1. Media begins playback → Timer Line starts advancing (white fill, organic mode)
2. If content is sponsored → Timer color shifts to amber, Coin Pill activates with offered amount
3. Timer fill width updates in sync with session elapsed time / required duration
4. Coin Pill progress ring advances based on engagement criteria (dwell, attention score, completion)
5. If user skips/scrubs → earn timer pauses (amber fades), media continues, pause chip appears
6. Timer reaches 100% → fill transitions to mint green, radial completion flash appears
7. Coin Pill enters Complete phase → pulse animation, glow, amount highlight
8. Pill transitions to Review → Validating (spinner) as 5-gate POP engine processes server-side
9. On approval → Pill enters Settled phase (fade out), value credits to wallet pending balance
10. Timer Line resets for next content item

## User Flow
The user opens the immersive feed and sees full-bleed media with a barely-visible 2px line at the top. As they watch, the line advances — a subtle ambient signal that the platform is tracking their session. When sponsored content appears, the line turns amber and a glass pill appears top-right showing the exact coin amount on offer. The user watches; the pill's ring fills. If they skip, a "Timer paused" chip appears. On completion, the line turns green and the pill pulses with a glow — one unmistakable beat confirming they earned. The pill shows "Review" briefly, then "Validating" with a spinner, then fades as the value moves to their wallet. The entire interaction happens within the immersive shell — no modal, no dashboard, no screen change.

## Economic Flow
The Coin Pill displays the pre-committed reward amount from the advertiser's campaign budget. The 60/30/10 revenue split applies: 30% of the campaign impression cost funds the viewer reward pool, from which the pill amount is drawn. The Timer Line + Coin Pill together visualize the moment when attention converts to value — making the economic transaction legible without breaking immersion. Advertisers get completion proof (timer 100% + POP gates), viewers see transparent earning, and the platform takes its 10% cut on settlement.

## Fraud Prevention
- Skip-pause rule: skipping or scrubbing halts the earn timer, preventing passive scroll farming
- Timer completion is only one of five gates — duration alone never authorizes reward
- Server-side settlement: the Coin Pill's "earned" display is indicative only; actual payout requires POP 5-gate approval via Edge Functions
- No partial rewards: if any gate fails, the full amount is withheld (full-or-nothing policy)
- Behavioral fingerprint analysis on scroll patterns detects mechanical/automated viewing
- Timer state is server-validated — client-side timer manipulation does not affect server-side session tracking

## Unique Elements
1. Dual-mode 2px progress line that serves as both media playback indicator (organic) and attention-earning progress bar (sponsored) within the same visual element
2. Color-state system (white → amber → mint green) communicating content type and session status through a single 2px-tall element
3. Floating glass Coin Pill with animated SVG progress ring showing real-time attention-to-value conversion
4. Six-phase pill lifecycle (Offer → Display → Accumulating → Complete → Review → Validating → Settled) with distinct visual treatments per phase
5. Skip-pause earn timer that halts economic accumulation on user skip while media continues — anti-farm by design
6. Completion moment design: synchronized Timer Line green + Pill pulse + radial flash creating one unmistakable "earned it" beat
7. Indicative-only client display with server-authoritative settlement — the pill shows progress but never authorizes payment

## Potential Patent Claims
1. A graphical user interface for a mobile device display, comprising a full-bleed media viewport, a thin progress line at the top edge that transitions between a first color state indicating content playback and a second color state indicating an active earning session, and a floating capsule element displaying a currency amount with an animated circular progress indicator.
2. A method for displaying real-time attention-to-value conversion feedback on a mobile device, comprising rendering a progress bar that changes color based on content monetization status, synchronizing a floating reward indicator with engagement criteria completion, and transitioning the reward indicator through a multi-phase lifecycle from offer display to server-validated settlement.
3. An ornamental design for a digital media interface, comprising a thin full-width progress bar positioned below a device notch, a glass-effect floating capsule in the upper-right corner displaying a monetary value, and coordinated color transitions indicating session progress from organic viewing through sponsored earning to verified completion.
4. A computer-implemented method for preventing attention farming in a reward-bearing media player, comprising pausing an earning timer when a user performs a skip or scrub interaction while continuing media playback, and displaying a visible pause indicator distinguishing the earn-paused state from the media-paused state.

## Potential Competitors
- TikTok (bottom progress bar, no earning feedback)
- YouTube (bottom progress bar, no viewer earning layer)
- Instagram Reels (minimal progress indicator, no monetization chrome)
- Brave Browser (BAT earning but no real-time in-content progress visualization)
- Sweatcoin (step counter overlay but no media-integrated earning chrome)

## Related Files
- `06_feed_earning_loops/timer_line_explainer.html` — Timer Line interactive explainer
- `06_feed_earning_loops/reward_feature_explainer.html` — Reward (Coin Pill) interactive explainer
- `MASTER_BRAIN/CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md` — Picture 2 design law
- `app/src/components/immersive/ImmersiveFeedScreen.tsx` — React implementation
- `app/src/styles/gesture-buttons.css` — Glass styling tokens
- `06_feed_earning_loops/app_immersive.html` — Immersive feed prototype
- `06_feed_earning_loops/iapp_immersive_feed.html` — Full immersive feed HTML prototype

## Scores
| Metric | Score (1-10) |
|--------|-------------|
| Priority | 8 |
| Patentability | 8 |
| Business Value | 8 |
