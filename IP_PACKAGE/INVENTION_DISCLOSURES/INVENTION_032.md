# INVENTION_032 — Signal Stale Policy with Backpressure Safety

**Inventor:** Marcelo Silva
**Category:** Trade Secret
**Family:** Attention Verification
**Date:** 2026-06-15

## Problem Solved

Eye-tracking and gaze-based attention verification systems process frames from camera pipelines that can experience backpressure — frames arriving late, dropped frames, or processing pipeline stalls. When these stale or delayed gaze signals are used for attention verification, they produce false-positive dwell confirmations and invalid proof-of-presence commits. Existing gaze tracking systems either ignore staleness entirely or use coarse timeout resets that lose valid accumulated dwell state unnecessarily.

## Current Industry Approach

Academic eye-tracking libraries (GazePoint, Tobii SDK) provide raw gaze data without staleness policies; applications must implement their own. Mobile face-tracking frameworks (ARKit, MediaPipe) report frame timestamps but do not cancel dependent state (dwell timers, intent signals) when frame gaps indicate pipeline backpressure. Most attention measurement SDKs (TVision, Lumen, RealEyes) operate at low sampling rates and do not implement per-frame staleness cancellation because they aggregate over longer windows. No existing system combines sub-second frame gap detection with gaze freshness validation and dwell/intent state cancellation as a unified staleness policy.

## How [ i ] Solves It

The [ i ] Signal Stale Policy (`signal_stale_policy.dart`) implements a three-guard staleness system that operates at the frame level within the native Flutter eye-tracking pipeline. Guard 1: **Frame Gap Detection** — if the gap between the current frame and the last processed frame exceeds `kMaxFrameGapMs` (350ms), all dwell and intent state is cancelled via `shouldCancelStaleTracking`. This catches pipeline backpressure events where frames are delayed or dropped. Guard 2: **Held Face Expiry** — if the face detection age exceeds `kMaxHeldFaceAgeMs` (500ms), the held-face state expires via `isHeldFaceExpired`, preventing stale face detections from sustaining gaze tracking. Guard 3: **Gaze Freshness for Commits** — even when tracking appears active, commits to the proof pipeline require that the last fresh gaze reading occurred within `kMaxGazeFreshnessDuringHoldMs` (200ms) of the commit attempt, enforced by `isGazeFreshForCommit`. Additionally, `isInvalidGaze` rejects non-finite or null gaze coordinates before they can influence any downstream processing. This policy prevents stale data from producing false attention proofs while preserving valid accumulated state when the pipeline is healthy.

## System Description

The signal stale policy is a Dart library with four pure functions and three tunable constants. `kMaxFrameGapMs` (350ms) is the maximum allowable gap between consecutive processed frames; beyond this, dwell and intent state must reset because the pipeline cannot guarantee continuous attention tracking. `kMaxHeldFaceAgeMs` (500ms) defines the maximum age of a face detection frame before the held-face state expires; this handles cases where the face detector reports a face but subsequent frames are delayed. `kMaxGazeFreshnessDuringHoldMs` (200ms) is the maximum age of fresh gaze data that may be used for POP commits during a hold window; even if tracking state appears valid, commits require recent gaze evidence. The `shouldCancelStaleTracking` function takes the last processed frame timestamp and current time, returning true when the gap exceeds the threshold — the caller (main.dart hot path) then resets dwell progress, intent state, and zone selection. The `isHeldFaceExpired` function takes the frame age in milliseconds and returns true when the held face should be released. The `isInvalidGaze` function validates that both x and y gaze coordinates are non-null and finite (not NaN, not infinity). The `isGazeFreshForCommit` function validates that the last fresh gaze timestamp is positive and within the freshness window of the current time. These functions are called from the replay driver (`pop_replay_driver.dart`) and the main camera processing loop, ensuring consistent staleness enforcement in both live and test paths.

## Technical Components

- `signal_stale_policy.dart` — Core staleness policy library with four pure functions
- `kMaxFrameGapMs` (350ms) — Maximum inter-frame gap before dwell/intent cancellation
- `kMaxHeldFaceAgeMs` (500ms) — Maximum face detection age before held-face expiry
- `kMaxGazeFreshnessDuringHoldMs` (200ms) — Maximum gaze age for commit freshness
- `shouldCancelStaleTracking()` — Frame gap detection and state cancellation trigger
- `isHeldFaceExpired()` — Held face age validation
- `isInvalidGaze()` — Null/non-finite gaze coordinate rejection
- `isGazeFreshForCommit()` — Commit-time gaze freshness validation
- `pop_replay_driver.dart` — Headless replay driver that enforces the same policy in tests
- `main.dart` — Live camera processing loop that calls policy functions on every frame
- `tracking_engine.dart` — Tracking state machine that consumes policy decisions
- `zone_dwell_logic.dart` — Dwell timer that resets on stale tracking cancellation

## Data Flow

1. Camera pipeline delivers a frame with timestamp, gaze coordinates, face detection flag, and blink state.
2. `isInvalidGaze(x, y)` validates that gaze coordinates are non-null and finite; invalid frames are rejected.
3. `shouldCancelStaleTracking(lastProcessedFrameMs, nowMs)` checks if the gap since the last processed frame exceeds 350ms.
4. If stale: dwell progress resets to 0, intent state clears, zone selection resets, blink counter resets.
5. If not stale: gaze data proceeds to the pipeline for smoothing, zone resolution, and dwell advancement.
6. `isHeldFaceExpired(frameAgeMs)` validates that the current face detection is fresh (≤500ms age).
7. If face expired: held-face state releases, preventing stale face data from sustaining tracking.
8. When a commit opportunity arises (blink edge + dwell satisfied + fixation confirmed): `isGazeFreshForCommit(lastFreshGazeMs, nowMs)` validates that gaze data is within 200ms freshness.
9. If gaze is fresh: commit proceeds through the POP action executor.
10. If gaze is stale: commit is blocked, preventing stale gaze data from producing false attention proofs.

## User Flow

The user is watching content in the immersive feed while the eye-tracking system verifies their attention. The system processes camera frames at ~30fps. If the user's phone briefly stutters (background process spike, thermal throttle), the frame pipeline pauses for 400ms. The signal stale policy detects this 400ms gap (exceeds 350ms threshold) and cancels the accumulated dwell progress. When frames resume, dwell must re-accumulate from scratch — the system does not grant attention credit for the stale gap period. The user experiences a brief reset of the attention timer but no false credits are awarded. Similarly, if gaze data becomes stale during a commit attempt (phone held at angle where face detection persists but gaze accuracy degrades), the 200ms freshness guard prevents a commit until fresh gaze is reconfirmed.

## Economic Flow

The signal stale policy directly protects the economic integrity of attention rewards. Each false-positive attention proof would result in an unearned reward payment. By cancelling dwell state when frame gaps indicate pipeline backpressure, the system ensures that only continuously tracked attention generates earning credits. The 200ms commit freshness requirement means that at the moment a proof-of-presence commit is generated, the gaze data underpinning it is guaranteed to be recent. This translates to higher-quality attention proofs for advertisers: every verified attention session has continuous, fresh tracking evidence with no stale gap periods counted toward dwell thresholds.

## Fraud Prevention

- Frame gap detection (350ms) prevents replay attacks where pre-recorded gaze frames are fed with inconsistent timestamps.
- Gaze freshness for commits (200ms) prevents the accumulation of stale gaze data during hold windows, closing a vector where valid dwell could be combined with stale gaze to produce commits.
- Invalid gaze rejection (NaN, infinity, null) prevents malformed gaze data injection from producing false tracking state.
- Held face expiry (500ms) prevents face detection persistence from sustaining tracking when the actual face has departed.
- The same policy functions execute in both live camera path and headless replay regression, ensuring consistency and preventing test/production divergence.
- Constants are tuned to balance fraud prevention (tighter = safer) with user experience (looser = fewer false resets).

## Unique Elements

1. Three-guard staleness policy combining frame gap detection, held face expiry, and commit-time gaze freshness validation into a unified per-frame safety system.
2. Sub-second backpressure detection (350ms frame gap threshold) that cancels dwell and intent state when the native camera pipeline experiences processing delays.
3. Commit-time gaze freshness validation (200ms window) that ensures proof-of-presence commits are backed by recent gaze evidence, independent of overall tracking state.
4. Pure-function design enabling identical staleness enforcement in both live camera processing and headless replay regression testing.
5. Tunable constants (`kMaxFrameGapMs`, `kMaxHeldFaceAgeMs`, `kMaxGazeFreshnessDuringHoldMs`) that allow sensitivity adjustment without algorithmic changes.

## Potential Patent Claims

1. A method for preventing stale gaze data from influencing attention verification comprising: detecting inter-frame gaps in a camera processing pipeline exceeding a backpressure threshold; cancelling accumulated dwell and intent state upon backpressure detection; validating gaze freshness within a sub-second window before permitting proof-of-presence commits; and rejecting non-finite or null gaze coordinates before downstream processing.
2. A system for backpressure-aware attention tracking comprising: a frame gap detector that monitors elapsed time between consecutive processed camera frames; a dwell state cancellation trigger activated when frame gaps exceed a configurable threshold; a gaze freshness validator that requires recent gaze evidence within a commit window; and a held-face expiry mechanism that releases face detection state when detection age exceeds a maximum.
3. A method for ensuring proof-of-presence commit integrity comprising: tracking the timestamp of the last fresh gaze reading; at commit time, validating that the gaze reading age does not exceed a freshness threshold; blocking the commit and requiring re-acquisition of fresh gaze when the threshold is exceeded; and maintaining consistent freshness enforcement across live processing and replay regression paths.

## Potential Competitors

- Tobii SDK (gaze tracking without staleness policy)
- MediaPipe FaceMesh (face detection without frame gap cancellation)
- RealEyes (attention measurement at lower sampling rates)
- Apple ARKit (face tracking without economic staleness enforcement)
- Lumen Research (attention measurement without per-frame freshness validation)

## Related Files

- `integrations/eye-tracking/flutter-runtime/lib/core/signal_stale_policy.dart`
- `integrations/eye-tracking/flutter-runtime/lib/replay/pop_replay_driver.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/stability/tracking_engine.dart`
- `integrations/eye-tracking/flutter-runtime/lib/features/intent/zone_dwell_logic.dart`
- `integrations/eye-tracking/flutter-runtime/lib/engine/gaze_pipeline.dart`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 9 |
| Patentability | 7 |
| Business Value | 8 |
