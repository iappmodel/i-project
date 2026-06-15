# INVENTION_033 — Headless Replay Regression Harness

**Inventor:** Marcelo Silva
**Category:** Trade Secret
**Family:** Attention Verification
**Date:** 2026-06-15

## Problem Solved

Eye-tracking and gaze-based attention verification systems are extremely difficult to regression-test because they depend on live camera input, face detection, and real-time processing pipelines. When developers refactor the gaze pipeline, zone detection, dwell logic, or commit gating, they cannot verify behavioral correctness without physically sitting in front of a camera and performing gaze patterns. This makes regression testing impractical and allows subtle behavioral changes to silently corrupt attention verification accuracy.

## Current Industry Approach

Eye-tracking SDKs (Tobii, GazePoint) provide recording and playback tools, but these operate at the SDK level and replay raw gaze coordinates without exercising the full application pipeline (smoothing, zone resolution, dwell advancement, fixation detection, blink gating, commit logic). Academic gaze analysis tools replay recorded data but do not integrate with proof-of-presence verification systems. No existing tool provides a headless driver that replays recorded gaze frames through a complete attention verification pipeline and produces deterministic golden digest lines for regression comparison.

## How [ i ] Solves It

The [ i ] Headless Replay Regression Harness (`PopReplayDriver`) replays recorded gaze frames through the full attention verification pipeline — pipeline smoothing, tracking state machine, gaze fixation detection, zone resolution, dwell advancement, stale signal policy, and commit gating — without any camera or native I/O. The driver accepts a list of `PopReplayFrame` records (timestamp, gaze coordinates, face detection flag, blink state, filter alpha, landmark freshness) and processes each through the exact same code path used in the live camera loop. It produces a `PopReplayResult` containing: an ordered list of `PopReplayMilestone` events (with human-readable strings like `"dwell_satisfied=center@1200"`, `"commit@1450 zone=center gate=allowed ok=true fresh=true"`), the total zone commit count, the last zone, last fixation state, and last tracking state. These milestone digest lines serve as golden test baselines — developers run the harness before and after refactors and diff the milestone outputs to detect behavioral changes.

## System Description

The `PopReplayDriver` class takes a `PopReplayConfig` (containing calibration parameters: measuredLeft, measuredRight, sessionSamples, avgDwellMs, dwellReleaseMs) and an optional `PopActionExecutor`. On `run(frames)`, it instantiates fresh `GazePipeline`, `TrackingEngine`, and `GazeFixation` instances, then iterates through each frame in order. For frames with `faceDetected: false`, the driver resets all state (pipeline, fixation, tracking, zone, dwell, blink, gaze freshness, action executor) and emits a `face_lost@{tMs}` milestone. For face-detected frames, the driver executes the full pipeline: (1) `runPipelineAndTrackingTick` processes gaze through the smoothing pipeline and tracking state machine. (2) If the tick is valid and landmarks are live, `lastFreshGazeMs` updates. (3) `GazeFixation.update` evaluates fixation state from the pipeline buffer and variance. (4) Zone resolution maps smoothed gaze X to a zone using calibration parameters. (5) `resolveZoneDwellAdvance` advances or resets dwell state based on zone continuity and timing. (6) On blink edge (blink transitions from false to true) with dwell satisfied, fixation confirmed, and tracking active: `PopActionExecutor.tryZoneSelect` evaluates the commit gate with confidence, fixation state, dwell progress, tracking state, calibration status, vision error, distraction detection, autonomy level, stability variance, risk score, fake detection, and gaze freshness. The commit gate result and whether the commit was allowed are recorded as milestones. Throughout execution, milestones are emitted for state transitions: fixation changes, tracking state changes, zone changes, dwell satisfaction events, and commit attempts. The `PopReplayResult` aggregates all milestones and final state for assertion in tests.

## Technical Components

- `pop_replay_driver.dart` — Headless replay driver class with `run(frames)` method
- `pop_replay_types.dart` — `PopReplayFrame`, `PopReplayConfig`, `PopReplayResult`, `PopReplayMilestone` types
- `GazePipeline` — Gaze smoothing and variance calculation pipeline (exercised headlessly)
- `TrackingEngine` — Tracking state machine (lost → acquiring → tracking)
- `GazeFixation` — Fixation detection (unstable → saccade → fixation)
- `resolveZoneFromGaze` — Zone resolution from smoothed gaze X and calibration parameters
- `resolveZoneDwellAdvance` — Dwell timer advancement with zone continuity tracking
- `effectiveZoneDwellMs` — Dynamic dwell threshold calculation
- `PopActionExecutor` — Commit gate with multi-factor evaluation
- `signal_stale_policy.dart` — `isGazeFreshForCommit` enforced during commit gating
- `PipelineTrackingCoordinator` — Coordinates pipeline and tracking tick processing
- Milestone strings — Human-readable event log (e.g., `"zone=center@1200"`, `"dwell_satisfied=left@3400"`)

## Data Flow

1. Test fixture creates a `PopReplayDriver` with calibration config and optional executor.
2. Test provides a list of `PopReplayFrame` records representing a gaze session.
3. Driver iterates each frame through the full pipeline: smoothing → tracking → fixation → zone → dwell → commit gating.
4. At each state transition, a `PopReplayMilestone` is appended with a descriptive string and timestamp.
5. Blink edges with satisfied dwell + fixation + tracking trigger commit gate evaluation.
6. Commit attempt milestones record the zone, gate decision, commit success, and gaze freshness.
7. After all frames are processed, `PopReplayResult` is returned with the complete milestone list and final state.
8. Test assertions compare milestone digest lines against golden baselines.
9. If milestones differ from golden baseline, the refactor introduced a behavioral change.
10. Developers update golden baselines when intentional behavioral changes are made.

## User Flow

A developer is refactoring the gaze smoothing pipeline to improve latency. Before the change, they run the replay harness on the test fixture's recorded gaze frames and capture the golden milestone output: zone transitions at specific timestamps, dwell satisfaction at expected times, and commits gated correctly. After the refactor, they re-run the harness on the same frames. The milestone output shows that zone transitions occur 50ms earlier (expected, due to reduced latency) but dwell satisfaction timing is unchanged and all commits that previously passed still pass. The developer updates the golden baselines for the timing change and ships the refactor with confidence that no behavioral regressions occurred. If instead a commit that previously passed now fails, the diff immediately highlights the regression.

## Economic Flow

The replay harness protects the economic integrity of the attention verification system. Every commit gated through the POP pipeline represents a potential reward payment. If a pipeline refactor silently changes commit gating behavior — making it too permissive (false positives) or too restrictive (false negatives) — the economic impact is direct: either unearned rewards are paid or legitimate attention goes uncompensated. The harness ensures that behavioral changes to the verification pipeline are intentional, documented, and traceable. This reduces the risk of deploying pipeline changes that corrupt the economic accuracy of attention proofs.

## Fraud Prevention

- The harness verifies that commit gating behavior is consistent between live and test paths, preventing divergent behavior that could be exploited.
- Golden baseline comparison catches unintended loosening of commit gates that would allow more false-positive attention proofs.
- The harness exercises the signal stale policy (`isGazeFreshForCommit`) in the same code path as production, ensuring staleness guards are not bypassed in refactors.
- Multi-factor commit gate evaluation (confidence, fixation, dwell, tracking, calibration, vision error, distraction, autonomy, stability, risk, fake detection, gaze freshness) is fully exercised in headless replay.
- `PopActionExecutor` integration ensures the autonomous execution kernel's safety gates are tested without live camera dependencies.
- Milestone-level granularity allows detection of subtle behavioral changes (e.g., a zone transition occurring one frame earlier) that could accumulate into systematic verification drift.

## Unique Elements

1. Headless replay of recorded gaze frames through a complete attention verification pipeline (smoothing → tracking → fixation → zone → dwell → commit gating) without any camera or native I/O dependencies.
2. Deterministic milestone digest lines that capture every state transition and commit attempt in human-readable strings, enabling golden-baseline regression testing.
3. Full commit gate exercise in headless replay, including multi-factor evaluation (confidence, fixation, dwell, tracking, autonomy, risk, staleness) through the same `PopActionExecutor` used in production.
4. Signal stale policy enforcement (`isGazeFreshForCommit`) verified within the replay path, ensuring staleness guards cannot silently regress.
5. Configurable replay parameters (`PopReplayConfig` with calibration, dwell, and release settings) that allow testing across different user calibration profiles.

## Potential Patent Claims

1. A method for regression testing an attention verification pipeline comprising: recording a sequence of gaze frames with timestamps, coordinates, face detection flags, and blink states; replaying said frames through a headless driver that executes the complete attention verification pipeline without camera I/O; capturing state-transition milestones at each pipeline stage; and comparing milestone outputs against golden baseline digests to detect behavioral regressions.
2. A system for headless attention verification testing comprising: a replay driver that instantiates pipeline, tracking, fixation, and commit components; a frame iterator that processes recorded gaze frames through said components in the same code path as live processing; milestone capture at state transitions (fixation changes, zone changes, dwell satisfaction, commit gate decisions); and a result structure containing ordered milestones and final pipeline state for assertion comparison.
3. A method for ensuring attention verification commit consistency comprising: executing recorded gaze sessions through both live and headless processing paths using shared pipeline code; capturing commit gate decisions and their inputs (confidence, fixation, dwell, tracking, freshness) as structured milestones; and detecting divergence between live and headless commit outcomes to prevent production-test behavioral drift.

## Potential Competitors

- Tobii Pro Lab (gaze recording/playback at SDK level, not full pipeline)
- GazePoint Analysis (gaze data replay without attention verification pipeline)
- iMotions (multimodal recording without headless pipeline regression testing)
- EyeLink Data Viewer (eye movement analysis without commit gate testing)
- Custom academic gaze replay tools (per-study, not productized verification pipelines)

## Related Files

- `integrations/eye-tracking/flutter-runtime/lib/replay/pop_replay_driver.dart`
- `integrations/eye-tracking/flutter-runtime/lib/replay/pop_replay_types.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/signal_stale_policy.dart`
- `integrations/eye-tracking/flutter-runtime/lib/engine/gaze_pipeline.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/stability/tracking_engine.dart`
- `integrations/eye-tracking/flutter-runtime/lib/features/gaze/pipeline_tracking_coordinator.dart`
- `integrations/eye-tracking/flutter-runtime/lib/features/intent/zone_dwell_logic.dart`
- `integrations/eye-tracking/flutter-runtime/lib/gaze_fixation.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/pop_action_executor.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/autonomous_execution_kernel.dart`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 8 |
| Patentability | 7 |
| Business Value | 7 |
