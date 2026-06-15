# INVENTION_041 — Blink Remote Control System

**Inventor:** Marcelo Silva  
**Category:** Patent  
**Family:** Intent OS / Remote Control  
**Date:** 2026-06-15  
**Feature ID:** F-034  
**Build status:** 50% shipped (lite) | 50% full system

## Problem Solved
Remote control interfaces require dedicated hardware (TV remotes, game controllers) or touch-only interaction that breaks immersion during media consumption. No existing system provides gaze-zone-targeted remote control where blink or dwell commits actions across device sessions, with a composable gesture-combo builder and import/export for user-defined control schemes.

## Current Industry Approach
Smart TV platforms (Apple TV, Roku) use Siri/voice or physical remotes. Accessibility gaze tools (Tobii, Windows Eye Control) move cursors but lack economy-integrated action binding. Smart home systems (Alexa, Google Home) are voice-first without gaze spatial targeting. No platform combines gaze zone selection + blink commit + composable multi-step gesture combos + cross-session device binding.

## How [ i ] Solves It
The [ i ] Blink Remote Control System maps screen zones to remote actions through a gaze-dwell-blink commit pipeline gated by the POP safety stack. Users define gesture combos (multi-step blinks and gestures) via a visual builder; combos are stored locally and exportable as JSON for sharing. A lite panel (`VisionBlinkRemoteLite`) ships today with combo matcher, debug tab, and import/export. The full system extends to cross-device session binding where verified POP on Device A authorizes remote actions on Device B (TV, speaker, smart display) under external OS control policy.

## System Description
The Blink Remote architecture has four layers. **Zone Layer:** gaze coordinates map to screen zones (LEFT, CENTER, RIGHT, and custom regions) via calibration-aware bounds. **Dwell Layer:** user must hold gaze in zone for configurable milliseconds before commit eligibility. **Commit Layer:** blink edge (or configured combo completion) triggers action through `PopActionExecutor` → governance → safety gate chain. **Combo Layer:** `gestureComboStore` persists user-defined sequences (e.g., double-blink + dwell center = "play/pause"); `GestureComboBuilderSheet` provides visual authoring with reorder; `GestureComboMatcherHost` evaluates incoming signals against active combos. Remote actions are classified: navigation (feed, wallet), media (play, pause, skip), and external (blocked from gaze-only paths per high-risk lane). Cross-device mode binds a `remote_session_id` to a validated POP session on the controlling device before relaying actions to a target device API.

## Technical Components
- `VisionBlinkRemoteLite.tsx` — tabbed panel (combos, debug, settings)
- `gestureComboStore.ts` — localStorage persistence, import/export JSON
- `GestureComboBuilderSheet.tsx` — multi-step combo authoring UI
- `GestureComboMatcherHost.tsx` — global combo evaluation in `App.tsx`
- `PopActionExecutor` — unified commit path through safety gates
- `external_os_control_policy.dart` — gaze-isolated external action rules
- `high_risk_action_lane.dart` — blocks financial/OS actions from gaze-only
- POP P6 remote control spec — `docs/legal/POP_PATENT_FAMILY.md` §8

## Data Flow
1. Eye-tracking pipeline produces gaze coordinates + blink events per frame.
2. Zone resolver maps gaze to active screen zone using calibration profile.
3. Dwell timer advances while gaze remains in zone; resets on zone exit.
4. Combo matcher evaluates frame signals against stored combo definitions.
5. On combo match + dwell satisfied + fixation confirmed: commit request enters gate chain.
6. Gate chain validates: not gaze-only financial, confidence > threshold, rate limit OK.
7. Allowed action executes locally or relays to bound remote device session.
8. Action logged to audit trail with session ID, zone, combo ID, timestamp.

## User Flow
User opens Profile → Vision Control Panel → Blink Remote tab. They create a combo: "double-blink while looking at center zone = skip to next video." They export the combo JSON to share. During immersive feed watch, they look at center, double-blink; video skips. For cross-device: user binds living-room TV in settings; verified watch session on phone authorizes TV volume control via gaze+blink on phone screen mapped to TV zones.

## Economic Flow
Remote control actions can trigger economy events: skip on sponsored content may forfeit pending reward; combo-triggered "boost" spends vCoins; remote checkout confirmation requires PIN/FACE_ID lane (not gaze-only). Cross-device binding is a premium capability (pCoins/uCoins gate in production).

## Fraud Prevention
- All commits pass POP safety gate chain — no bypass path
- Gaze-only paths cannot trigger payments or OS-destructive actions
- Rate limit >600ms between commits prevents automation
- Cross-device binding requires active validated POP session on controller
- Combo import validates schema — rejects malformed or oversized payloads

## Unique Elements
1. Gaze-zone + blink commit model for remote control without physical peripheral
2. Composable multi-step gesture combo builder with JSON import/export
3. Integration with POP safety gate chain for all remote commits
4. Cross-device session binding with proof-of-presence on controller device
5. Classification of remote actions into safe navigation vs. blocked high-risk lanes
6. Lite-to-full architecture: shipped combo matcher extensible to full archive UI

## Potential Patent Claims
1. A method for gaze-based remote control comprising: mapping eye gaze to screen zones; requiring dwell in zone before commit eligibility; detecting blink or gesture combo completion; executing remote action through ordered safety gate chain; and blocking financial or operating-system actions when input is gaze-only.
2. A system for user-defined remote control combos comprising: visual combo builder authoring multi-step blink and gesture sequences; local persistence and JSON export/import; runtime combo matcher evaluating eye-tracking frames against stored definitions; and audit logging of committed actions.
3. A cross-device remote control system wherein a first mobile device with validated proof-of-presence session authorizes relay of gaze-mapped remote actions to a second target device under external operating system control policy.

## Potential Competitors
Apple (Switch Control, Vision Pro gaze), Tobii (eye tracking SDK), Microsoft (Eye Control), Amazon (Alexa gaze experiments), Samsung (Smart TV gaze patents)

## Related Files
- `app/src/components/vision/VisionBlinkRemoteLite.tsx`
- `app/src/lib/gestureComboStore.ts`
- `app/src/components/gestureCombo/GestureComboBuilderSheet.tsx`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/external_os_control_policy.dart`
- `docs/legal/POP_PATENT_FAMILY.md` (P6 Remote Control)

## Scores
| Metric | Score (1-10) |
|--------|-------------|
| Priority | 8 |
| Patentability | 8 |
| Business Value | 9 |
