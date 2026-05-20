---
title: Gaze Dart pipeline
tags: [eye-tracking, gaze, flutter, smoothing]
created: 2026-04-17
code: lib/engine/gaze_pipeline.dart, gaze_fixation, gaze_zone
---

# Gaze Dart pipeline

> [!tip] Product rule
> Require **`FixationState.fixation`** before advancing UI or firing actions from gaze; do not treat unstable / saccadic samples as actionable (`AGENTS.md`).

## Role

Consume **raw platform gaze** (+ head pose, blink flags where wired) and produce **stable coordinates**, **quality**, and **variance** for fixation logic.

## Layers (order)

1. **Raw** `gazeX` / `gazeY` + `valid` from [[native-android-vision]] path.
2. **`GazePipeline`** (`lib/engine/gaze_pipeline.dart`)
   - `GazeBuffer`, **`GazeFilterStack`**, `GazeQuality`
   - Head guard: beyond `kHeadGazeMaxAbs`, hold last x/y (`kHeadPoseLimit` from head confidence module)
   - Dead zone, velocity limit, inter-eye normalization, output clamp
   - Invalid input → **`{ valid: false }` only** (no fixation fields inside this map)
3. **`gaze_normalize.dart`** — fixed bounds horizontal normalize (see `AGENTS.md` for constants).
4. **`gaze_zone.dart`** — **LEFT / CENTER / RIGHT** from normalized X.
5. **`GazeFixation`** + `GazeTraceBuffer` in **`main.dart`** — fixation from variance / stability.

## Adjacent modules

- `gaze_filter.dart`, `gaze_filter_stack.dart`, `gaze_velocity.dart`, `trajectory_buffer.dart`
- `gaze_dead_zone.dart`, `gaze_quality.dart`, `gaze_buffer.dart`

## Related

- Upstream: [[native-android-vision]]
- Intent / action: [[intent-os-overview]], then [[kernel-autonomous-execution]]
- Dashboard: [[00-MOC-eye-tracking-app]]

## Brainstorm

- [[gaze latency budget]]
- [[calibration vs fixed bounds]]
- [[zone semantics for new layouts]]
