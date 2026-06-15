# INVENTION_027 — Gesture Vocabulary Mapped to Economy Actions

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Attention Economy UX
**Date:** 2026-06-15

## Problem Solved

Mobile applications treat gestures (tap, hold, swipe) as UI navigation primitives disconnected from economic actions. A "like" tap has no financial consequence; a "share" swipe generates no verified value. In attention economy applications, there is no existing system that maps a composable gesture vocabulary directly to verified economic transactions (spending, tipping, boosting) through a proof-of-presence verification layer, while allowing end users to reconfigure the gesture-to-action bindings.

## Current Industry Approach

TikTok and Instagram use fixed gesture mappings: tap to like, double-tap to like (on content), swipe to navigate. These gestures trigger engagement metrics but no financial transactions. Tipping features (YouTube Super Chat, Twitch Bits) are accessed through separate payment UI flows, not through gestural interaction with the content itself. No platform offers user-composable gesture bindings or integrates gesture actions with verified attention sessions.

## How [ i ] Solves It

The [ i ] Gesture Vocabulary system maps a configurable set of touch gestures to economy actions that execute within verified attention sessions. The default preset (Like/Love) maps: tap → Like (no wallet), double-tap → Save, triple-tap → Boost (vCoin spend), hold (≥500ms) → Enter Offer Mode, hold (≥3000ms) → Accelerated Ramp, swipe-up → Tip vCoin, swipe-down → Tip iCoin. Each gesture triggers through the gesture FSM (finite state machine) in `useGestureButton`, which manages deep-hold references, balance clamping, and scroll locking. Economy-affecting gestures (boost, tip) route through Edge Functions (`tip-creator`) for server-side execution. Power users can reconfigure all bindings via the GestureButtonBuilderSheet, accessed through a 1-second hold on the CONTROLS button.

## System Description

The gesture vocabulary operates through a layered architecture. At the base layer, each button on the action rail is a `GestureButton` component governed by a `ButtonInstanceConfig` that defines the gesture bindings. The config specifies what action each gesture trigger (tap, double_tap, triple_tap, hold_arm, hold_deep, swipe_up, swipe_down, swipe_left, swipe_right) maps to. The `useGestureButton` hook implements a finite state machine that tracks touch state, hold duration, swipe direction, and balance limits. When a hold gesture enters "arm" state (≥500ms), the UI transitions to offer mode, displaying a cross-directional swipe interface where up/down direction determines coin type (vCoin/iCoin) and hold duration determines amount via a ramp function. The ramp counter displays the accumulating tip amount in real-time while the user drags. On release, the OfferReviewSheet presents the offer with preset amounts (5/13/49), a slider for custom amounts, and Send/Cancel actions. The REWARD pill at top-right transitions through four states: idle (showing base reward), review (mint glow, tappable), validating (spinner), and settled (fade). All coin debits execute through the `tip-creator` Edge Function when `walletBackend === 'live'`; demo mode uses `sendTipDemo` with explicit feedback (no silent success). The `MediaActionRail` component renders the ordered list of gesture buttons, managing rail order, enable/disable state, and routing callbacks for offers, actions, likes, saves, and builder access. The builder mode (GestureButtonBuilderSheet) allows per-button configuration: users can rebind any gesture trigger to any action, reorder the rail, enable/disable buttons, and persist settings to localStorage.

## Technical Components

- `useGestureButton.ts` — Gesture FSM hook with deep-hold ref, balance clamping, scroll lock
- `useOfferSession.ts` — Offer orchestration (draft → review → validating → settled)
- `useContentLike.ts` — Like toggle with content_likes table integration
- `MediaActionRail.tsx` — Ordered button rail with enable/disable and callback routing
- `GestureButton.tsx` — Individual gesture button with configurable trigger bindings
- `GestureButtonBuilderSheet.tsx` — User-facing gesture configuration UI
- `GestureButtonSettingsSheet.tsx` — Per-button settings panel
- `OfferReviewSheet` — Offer amount review with presets and slider
- `configStore.ts` — Gesture configuration persistence
- `layoutStore.ts` — Rail order persistence
- `presets.ts` — Default gesture binding presets (Like/Love, etc.)
- `types.ts` — ButtonInstanceConfig, OfferSession, WalletBalanceLimits types
- `tipCreator.ts` — Edge function client for `tip-creator`
- `gesture-buttons.css` — Glass visual styles and cross-arm interaction visuals

## Data Flow

1. User touches a gesture button on the action rail.
2. `useGestureButton` FSM processes the touch event (tap duration, swipe vector, hold time).
3. FSM resolves the gesture trigger (tap, double_tap, triple_tap, hold_arm, hold_deep, swipe_*).
4. Config lookup maps the resolved trigger to an action (like, save, boost, offer, tip).
5. For non-economic actions (like, save): local state update + optional content_likes DB write.
6. For offer mode (hold_arm): UI transitions to cross-directional interface; ramp counter begins.
7. User swipes up/down to select coin type; hold duration determines amount via ramp function.
8. On release: OfferReviewSheet presents amount with preset options (5/13/49) and Send/Cancel.
9. On Send: `tip-creator` Edge Function executes server-side debit and credit.
10. REWARD pill transitions: review → validating → settled, providing visual confirmation.

## User Flow

The user is watching content in the immersive feed. They see glass circular buttons on the right side. They tap the heart button once — it toggles to liked, count updates. They double-tap — content is saved with a toast. They triple-tap — a boost notification appears (vCoin demo). They press and hold the heart for half a second — a cross-directional interface appears. They drag upward while holding to select vCoin tipping, watching the ramp counter increase. On release, a review sheet slides up showing the amount with quick presets (5, 13, 49) and a custom slider. They tap Send, the reward pill shows "Validating..." then fades to settled. For power users: holding the CONTROLS button for 1 second opens the gesture builder, where they can rebind any gesture to any action on any button.

## Economic Flow

Every gesture in the vocabulary has an economic weight. Free gestures (tap → like) generate engagement signals that influence feed ranking and creator reputation. Economy gestures (triple-tap → boost, hold → offer/tip) trigger verified financial transactions. Boosts spend the user's vCoins to amplify content visibility. Tips transfer iCoins or vCoins from viewer to creator through the `tip-creator` Edge Function. The ramp function during hold-and-swipe ensures tip amounts scale with intentional hold duration, preventing accidental large transactions. Balance clamping in the gesture FSM prevents tips that exceed wallet balance. All transactions are server-authoritative — the gesture UI is an input layer, not an execution layer.

## Fraud Prevention

- Economy-affecting gestures (boost, tip) execute exclusively through Edge Functions; client-side code cannot directly debit or credit wallets.
- Balance clamping in the gesture FSM prevents over-spending before the transaction reaches the server.
- The OfferReviewSheet requires explicit user confirmation (Send) before any transaction executes, preventing accidental gestures from triggering financial actions.
- Hold time thresholds (500ms for arm, 3000ms for deep) prevent accidental activation.
- Scroll lock during gesture interaction prevents simultaneous scrolling and accidental tips.
- Demo mode (`sendTipDemo`) is explicitly separated from live mode (`tip-creator`), preventing test transactions from affecting real balances.
- Gesture button configurations are persisted to localStorage, not server state, preventing configuration injection attacks.

## Unique Elements

1. A composable gesture vocabulary where each touch gesture (tap, multi-tap, hold tiers, four-way swipe) maps to configurable economy actions (like, save, boost, tip with coin-type selection) rather than fixed UI navigation.
2. Hold-to-arm offer mode with directional swipe for coin-type selection (up = vCoin, down = iCoin) and hold-duration ramp for amount determination — a single continuous gesture selects currency, determines amount, and initiates a financial transaction.
3. User-composable gesture bindings via GestureButtonBuilderSheet: end users can rebind any gesture trigger to any action on any button, creating personalized economic interaction patterns.
4. Integration of gesture-triggered economy actions with proof-of-presence verification sessions — gestures only execute economy actions during verified attention sessions.
5. Four-state REWARD pill (idle → review → validating → settled) that provides visual feedback on transaction lifecycle within the immersive glass overlay.

## Potential Patent Claims

1. A method for executing financial transactions through touch gestures on a media player comprising: detecting a gesture type from a configurable vocabulary of touch interactions; mapping the detected gesture type to an economic action through a user-customizable binding configuration; executing the economic action through a server-side verification pipeline; and displaying transaction lifecycle feedback through a glass-morphism overlay element.
2. A system for gesture-based cryptocurrency tipping comprising: a hold-to-arm gesture that activates an offer mode; directional swipe detection that selects between multiple currency types; a continuous hold-duration ramp function that determines transaction amount; and a review interface requiring explicit confirmation before server-side transaction execution.
3. A user interface system for composable gesture-to-economy mappings comprising: a configurable gesture button with bindable trigger types (tap, multi-tap, hold, swipe); a gesture builder interface allowing end-user reconfiguration of gesture-action bindings; and persistent storage of custom gesture configurations per user.
4. A method for preventing accidental financial transactions in a gesture-based economy comprising: time-gated hold thresholds before activating financial gesture modes; balance clamping in the gesture state machine; scroll locking during gesture interaction; and mandatory review confirmation before server-side execution.

## Potential Competitors

- TikTok (fixed gesture mappings, no economy actions)
- Instagram (tap-to-like, no configurable gestures)
- YouTube Super Chat (button-triggered payments, not gesture-based)
- Twitch Bits (button-triggered donations, not gesture-based)
- Cash App (payment gestures, no content integration)

## Related Files

- `MASTER_BRAIN/UX/USER_GESTURE_BUTTONS.md`
- `app/src/components/gestureButtons/MediaActionRail.tsx`
- `app/src/components/gestureButtons/GestureButton.tsx`
- `app/src/components/gestureButtons/GestureButtonBuilderSheet.tsx`
- `app/src/hooks/useGestureButton.ts`
- `app/src/hooks/useOfferSession.ts`
- `app/src/hooks/useContentLike.ts`
- `app/src/services/tipCreator.ts`
- `app/src/lib/gestureButtons/types.ts`
- `app/src/lib/gestureButtons/presets.ts`
- `app/src/lib/gestureButtons/configStore.ts`
- `app/src/styles/gesture-buttons.css`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 9 |
| Patentability | 9 |
| Business Value | 9 |
