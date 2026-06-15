# INVENTION_021 — Composable Gesture Economy Buttons

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Attention Economy UX
**Date:** 2026-06-15

## Problem Solved

Social media action buttons (like, comment, share) are fixed-function and platform-defined — users cannot customize which gestures trigger which economic actions, nor can they compose multi-action buttons that combine social signals with monetary transactions. This one-size-fits-all approach limits user expression and prevents the convergence of social interaction and micro-economy that an attention marketplace requires.

## Current Industry Approach

Every major social platform (Instagram, TikTok, YouTube, Twitter/X) ships a fixed action rail with predetermined buttons (like, comment, share, save) where each button has one action and one gesture (tap). Some platforms add a long-press for a secondary action (e.g., Instagram's reaction picker), but these are platform-controlled and not user-configurable. No existing platform allows users to define custom gesture-to-economy-action bindings, compose multi-gesture buttons (tap vs. hold vs. swipe in different directions), or create new button instances with user-defined action mappings and ramp configurations.

## How [ i ] Solves It

The [ i ] Composable Gesture Economy Button system allows each button on the media action rail to support multiple gesture types (tap, double_tap, triple_tap, hold_arm, hold_deep, swipe_up, swipe_down, swipe_left, swipe_right), each independently mapped to an economy action (like, tip with coin type, save, share, noop, or custom). Users can customize bindings through a builder sheet, change ramp configurations (Fibonacci profiles with min/max), adjust glass chrome appearance, and create entirely new button instances. Buttons are composable: a single button can be tapped to like, double-tapped to save, triple-tapped to boost, swiped up to tip viCoin, and swiped down to tip iCoin — all through a unified gesture interpretation layer. The offer lifecycle (draft → review → validating → settled → cancelled) manages economic transactions, while the gesture phase state machine (idle → arming → armed → offering → review) handles the UX timing. Button configurations are persisted locally with preset normalization that preserves user customizations across app sessions.

## System Description

The system comprises five modules. The **types module** defines the gesture vocabulary: 9 gesture triggers (tap, double_tap, triple_tap, hold_arm, hold_deep, swipe_up, swipe_down, swipe_left, swipe_right), 6 button actions (like, tip with coin type, save, share, noop, custom with ID), button chrome configuration (icon, glass opacity, size), threshold configuration (armMs, deepHoldMs, directionThresholdPx, doubleTapMs, tripleTapMs, builderHoldMs), ramp configuration (Fibonacci preset, min/max amounts), and the complete ButtonInstanceConfig that combines all of these with an ID, label, and enabled flag. Each button instance carries an array of GestureBindings mapping triggers to actions, plus helper functions for binding lookup and coin-type inference from swipe direction. The **presets module** defines four default button presets: Like/Love (tap=like, double_tap=save, triple_tap=custom:boost, swipe_up=tip:vicoin, swipe_down=tip:icoin, ramp=standard/99), Comment (tap=custom:open_comments, ramp=gentle/50), Share (tap=share, ramp=gentle/50), and Controls (tap=custom:open_controls, builderHoldMs=1000). The **configStore** handles persistent storage (localStorage with versioned key), loading with preset normalization (merging user overrides with preset defaults), saving, upserting, per-trigger binding updates, and reset-to-defaults. The **layoutStore** manages the rail order (which buttons appear, in what order) with localStorage persistence and a method to add new user-defined button IDs. The **offerService** manages the economic transaction lifecycle: creating offer drafts (with coin type, amount, direction, optional content/creator IDs), transitioning offer status, and formatting coin labels for display. The ramp module (covered in INVENTION_020) provides Fibonacci-based amount escalation during the offering gesture phase.

## Technical Components

- `app/src/lib/gestureButtons/types.ts` — Core type definitions: GestureTrigger (9 types), ButtonAction (6 types), GestureBinding, ButtonThresholds, ButtonRampConfig, ButtonInstanceConfig, GesturePhase, OfferSession, OfferStatus, helper functions (bindingFor, coinFromDirection, clampTipAmount)
- `app/src/lib/gestureButtons/presets.ts` — Default button presets (Like/Love, Comment, Share, Controls, Blank), preset card descriptions, DEFAULT_RAIL_BUTTON_IDS
- `app/src/lib/gestureButtons/configStore.ts` — Persistent button config management: loadButtonConfigs, saveButtonConfig, getButtonConfig, upsertButtonConfig, updateBinding, resetButtonConfig with preset normalization
- `app/src/lib/gestureButtons/layoutStore.ts` — Rail order persistence: loadRailOrder, saveRailOrder, addUserButtonId
- `app/src/lib/gestureButtons/offerService.ts` — Offer lifecycle: createOfferDraft, transitionOffer, formatCoinLabel, newOfferId
- `app/src/lib/gestureButtons/ramp.ts` — Fibonacci ramp curves (covered in INVENTION_020)
- `app/src/components/MediaActionRail.tsx` — React component rendering the button rail
- `app/src/components/GestureButton.tsx` — Individual gesture button component
- `app/src/components/GestureButtonBuilderSheet.tsx` — Customization UI for button configuration

## Data Flow

1. App loads button configurations from localStorage via `loadButtonConfigs()`, merging saved user overrides with preset defaults through `normalizeConfig()`.
2. Rail order is loaded from localStorage via `loadRailOrder()`, defaulting to `DEFAULT_RAIL_BUTTON_IDS` (like-love, comment, share, controls).
3. For each button in the rail, a GestureButton component is rendered with the full ButtonInstanceConfig.
4. When the user initiates a gesture, the gesture detector identifies the trigger type (tap, double_tap, triple_tap, hold, swipe direction).
5. `bindingFor()` looks up the matching GestureBinding from the button's bindings array.
6. If the action is `tip`, `coinFromDirection()` determines the coin type from the swipe direction.
7. The gesture phase state machine transitions through idle → arming → armed → offering → review.
8. During the "offering" phase, the ramp module computes escalating amounts (see INVENTION_020).
9. `createOfferDraft()` creates an OfferSession with coin type, amount, direction, and content metadata.
10. `transitionOffer()` moves the offer through its lifecycle: draft → review → validating → settled (or cancelled).
11. The settled offer is submitted to the server for wallet debit and creator credit.
12. User can customize bindings through the builder sheet, which calls `updateBinding()` and `saveButtonConfig()`.

## User Flow

1. User sees the action rail on the right side of the immersive feed (4 glass buttons: heart, comment, share, controls).
2. **Quick interactions:** User taps the heart to like, double-taps to save, taps comment to open comments, taps share to share.
3. **Tipping:** User holds the heart button (arming phase), then swipes up to tip viCoin or down to tip iCoin. The amount escalates with hold duration.
4. **Power gesture:** User triple-taps the heart to trigger a "boost" custom action.
5. **Customization:** User long-presses the controls button (builderHoldMs threshold) to open the Gesture Button Builder Sheet.
6. **In the builder:** User can change what each gesture does (e.g., remap swipe_left to a custom action), adjust the ramp profile (gentle/standard/aggressive), set min/max amounts, change the button icon and glass opacity, or create entirely new buttons.
7. **New buttons:** User creates a new button from the blank preset, assigns custom bindings, and it appears in the rail.
8. **Persistence:** All customizations are saved locally and survive app restarts.

## Economic Flow

1. Social actions (like, save, share, comment) generate engagement-based viCoin rewards through the reward pipeline (see INVENTION_019).
2. Tip actions (swipe directions mapped to coin types) create direct value transfers from the user's wallet to the content creator.
3. Custom actions can trigger platform-specific economy operations (boost = amplified distribution, which may cost coins).
4. The composability of gesture-to-action bindings means users can optimize their economic interaction style — some may prefer aggressive tip ramps, others gentle.
5. The offer lifecycle ensures economic transactions are explicit (draft, review, confirmation) rather than accidental.

## Fraud Prevention

- Wallet balance clamping via `clampTipAmount()` prevents tipping more than available balance.
- The offer lifecycle requires explicit review and confirmation before settlement, preventing accidental large tips.
- Ramp maximums (configurable per button) cap the maximum amount of any single gesture-initiated transaction.
- Offer sessions include content and creator IDs for auditability.
- The server-side settlement process validates the offer against wallet state and enforces economic rules (see INVENTION_019).
- Configuration normalization on load ensures that corrupted or manipulated localStorage values fall back to safe preset defaults.

## Unique Elements

1. **Multi-gesture composable buttons** — A single button supports 9 distinct gesture types (tap, double_tap, triple_tap, hold_arm, hold_deep, 4 swipe directions), each independently mapped to different economy actions.
2. **User-configurable gesture-to-economy bindings** — Users can customize which gesture triggers which economic action on any button, creating personalized interaction patterns.
3. **Gesture-driven currency selection** — Swipe direction determines coin type (e.g., up for viCoin, down for iCoin), enabling single-gesture currency-aware tipping.
4. **Builder sheet for button creation** — Users can create entirely new button instances from blank presets, define custom bindings, and add them to the action rail.
5. **Unified gesture phase state machine** — A single state machine (idle → arming → armed → offering → review) manages the UX timing for all gesture types, with configurable thresholds per button.
6. **Offer lifecycle with state transitions** — Economic transactions follow an explicit lifecycle (draft → review → validating → settled → cancelled) with structured state transitions rather than immediate execution.

## Potential Patent Claims

1. A method for composing gesture-to-economy-action mappings on a media platform, comprising: providing a button instance configuration comprising a plurality of gesture bindings, each binding mapping a distinct gesture trigger from a set including tap, multi-tap, hold, and directional swipe to an economy action from a set including like, tip with coin type, save, share, and custom; detecting a user gesture on the button and identifying the matching gesture trigger; invoking the bound economy action, wherein tip actions determine currency type from swipe direction; and managing the resulting economic transaction through an offer lifecycle state machine.
2. A system for user-configurable economy buttons in a media interface, comprising: a preset store defining default button configurations with gesture-to-action binding arrays, threshold configurations, and ramp profiles; a configuration store that persistently saves user customizations merged with preset defaults; a layout store managing the order and composition of buttons in an action rail; a builder interface allowing users to modify gesture bindings, ramp parameters, and visual chrome; and an offer service that manages economic transaction lifecycles initiated by gesture actions.
3. A computer-implemented method for gesture-driven micro-payments with composable currency selection, comprising: rendering an action button on a media interface with a plurality of gesture bindings; upon detecting a directional swipe gesture, determining a coin type from the swipe direction; entering an offering phase where an amount escalates based on hold duration following a configurable ramp curve; clamping the amount to a button-level maximum and a wallet balance for the determined coin type; and creating an offer session with the determined coin type, computed amount, and content metadata that progresses through a confirmation lifecycle before settlement.

## Potential Competitors

- **Instagram** — Fixed action buttons (like, comment, share, save); no user customization or multi-gesture support
- **TikTok** — Fixed action rail with gifts menu; no composable gesture bindings
- **YouTube** — Like, dislike, share, save, Super Chat; fixed actions, no gesture customization
- **Twitter/X** — Like, retweet, reply, share; no gesture-based economy actions
- **Twitch** — Emotes and bits with fixed UI; no composable gesture buttons
- **WeChat** — Red envelope tips with fixed UI; no gesture-driven amount escalation

## Related Files

- `app/src/lib/gestureButtons/types.ts`
- `app/src/lib/gestureButtons/presets.ts`
- `app/src/lib/gestureButtons/configStore.ts`
- `app/src/lib/gestureButtons/layoutStore.ts`
- `app/src/lib/gestureButtons/offerService.ts`
- `app/src/lib/gestureButtons/ramp.ts`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 8 |
| Patentability | 9 |
| Business Value | 9 |
