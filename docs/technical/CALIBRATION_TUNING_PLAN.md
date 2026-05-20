# Calibration tuning plan — Android eye-tracking runtime

**Date:** 2026-05-20  
**Runtime:** [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/)  
**Device baseline:** Samsung Galaxy S24 Ultra (SM-S928U), Android 15 — see [`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md)  
**Scope:** Calibration, operator HUD, and verification quality. Does **not** rewrite architecture, React app, `source-runtime-candidates`, or native MediaPipe pipeline in this pass.

---

## 1. Current validated state

Physical smoke test on SM-S928U (2026-05-20) confirmed:

| Layer | Status |
|-------|--------|
| APK build / install | Pass |
| Front camera open + image stream | Pass |
| Native `VisionProcessor.process` loop | Pass — non-zero processed FPS, `frame_perf` logs |
| Gaze zone overlay | Pass — after commit `d24a440` (LayoutBuilder fix in `gaze_zone_buttons.dart`) |
| Dart telemetry HUD | Partial — metrics update live but layout/operator quality raw |
| Host unit tests | 185 tests pass (pre-device baseline) |

**Not yet validated:** reliable left/center/right zone selection, production attention gates, 60-second stability run, face-loss/recovery cycle, operator-grade calibration UX.

---

## 2. Current calibration problems

| Problem | Symptom on device | Likely cause |
|---------|-------------------|--------------|
| Gaze zone selection unreliable | LEFT/CENTER/RIGHT highlight lags or mis-assigns | `getZone` uses **raw pipeline gazeX** with fixed ±0.10 deadband; user calibration (`normalizeGazeX`) is computed but **not wired into zone classification** in the live dwell path |
| Single-frame gaze capture | Cal L/R stores one instantaneous sample | `_normalize` captures first frame after button press — no stability gate or multi-frame median |
| Population vs local blend | Zones feel wrong early in session | `effectiveGazeCalibrationBounds` ramps local weight over 200 samples; until then population defaults dominate |
| EAR blink vs zone select mismatch | Blink select uses mean EAR `< 0.08` edge in `_trySelectZoneOnMeanEarClosedEdge`; FSM uses dynamic/normalized thresholds in `BlinkDetector` | Two parallel blink paths with different thresholds |
| Attention score stays 0 | HUD shows `native 0` frequently | Native `computeAttentionScore` starts at 1.0 then subtracts penalties; without stable head + open eyes + neutral gaze, score collapses; no Flutter-side production mapping |
| Debug HUD overflow | Text clips on 1080×2340 | Unconstrained multi-line `Text` at bottom-left |
| Operator controls noisy | 10+ debug buttons overlap preview | Dev/lab panel not grouped or collapsible |
| Calibration FSM under-instrumented | Operator cannot tell if sample was accepted | Phase label only; no success/fail feedback per capture |

---

## 3. Existing signals available

### Native (`VisionProcessor.kt` → `VisionFrame`)

| Field | Type | Use |
|-------|------|-----|
| `gazeX`, `gazeY` | float | Raw horizontal/vertical gaze (smoothed in native) |
| `headYawRaw` | float | Pre-neutral-subtraction yaw — captured on Cal N |
| `headYaw`, `headPitch`, `headStable` | float/bool | Head pose penalties, attention score |
| `leftEAR`, `rightEAR` | float | Blink, fatigue, open-EAR calibration |
| `attentionScore` | 0–100 | Native attention aggregate |
| `likelyFake`, `fakeStaticGaze`, `fakePerfectStability`, `fakeNoBlink` | bool | Anti-spoof heuristics |
| `faceConfidence` | 0–1 | Segmentation mask fraction |
| `nativeDecodeMs`, `nativeProcessMs`, `nativeTotalMs` | float | Perf telemetry |
| `landmarks`, `leftEye`, `rightEye` | lists | Landmark count / quality checks |

### Flutter pipeline

| Signal | Source | Use |
|--------|--------|-----|
| Pipeline gaze `(x, y)` | `GazePipeline` + `runPipelineAndTrackingTick` | Pointer dot, zone dwell (`getZone(smoothGazeX)`) |
| Fixation state | `GazeFixation` | Dwell gate, blink select |
| Normalized gaze X | `normalizeGazeX` + `effectiveGazeCalibrationBounds` | Computed in `_normalize`; available for tuning |
| Cal samples | `_gazeMeasuredLeft/Right`, `_neutralHeadYaw` | User calibration captures |
| Open EAR baselines | `OpenEarCalibrator` → `_leftOpenEar`, `_rightOpenEar` | Dynamic blink thresholds, fatigue |
| EAR norm / fatigue | `normalizedEarPair`, `earFatigueLevel` | Engagement state, attention bonus |
| Blink FSM | `BlinkDetector` | Count, dominance, dynamic thresholds |
| Attention kernel | `AttentionKernel.telemetryNotifier` | CONF/STAB/HEAD/VEL/FIX/PASS/REASON |
| Frame perf | `FramePerfMetrics` / `[frame_perf]` logs | Camera vs processed FPS, drops |
| Calibration FSM | `CalibrationPhase` | idle → sampling-* → ready |

---

## 4. What must be measured next

Record on SM-S928U (or equivalent) **before** changing thresholds:

1. **Raw gazeX range** — neutral, look-left extreme, look-right extreme (10+ frames each, note median + stddev).
2. **Pipeline gazeX range** — same poses after `GazePipeline` filter (what `getZone` actually sees).
3. **Zone boundary sweep** — slow left→right sweep; log zone transitions vs subjective gaze direction.
4. **Cal L/R/N capture values** — HUD `min`/`max`/`yaw₀` after operator calibration sequence.
5. **Open EAR baselines** — `leftOpenEAR` / `rightOpenEAR` after Cal EAR (eyes open, neutral lighting).
6. **Blink closure depth** — mean EAR at closed vs dynamic `closeTh` (0.7× baseline).
7. **Native attention components** — correlate `attentionScore` with headStable, avgEAR, gazeX variance, blink rate (logcat or HUD).
8. **Anti-spoof flags** — when `likelyFake` fires on real user vs photo/video.
9. **Dwell timing** — time to zone lock at default `_zoneDwellMs` (behavior profile dependent).
10. **Processed FPS under calibration** — ensure tuning session stays ≥4 processed FPS.

**Artifact:** dated folder e.g. `docs/technical/smoke-runs/2026-05-20-sm-s928u-calibration/` with CSV or markdown table of samples.

---

## 5. Left / center / right calibration strategy

### Current flow

1. Operator taps **Cal L** → `_pendingCaptureLeft` → next valid `gazeX` stored as `_gazeMeasuredLeft`.
2. **Cal R** → `_gazeMeasuredRight`.
3. **Cal N** → native `calibrateHeadPose` + `_neutralHeadYaw` from `headYawRaw`.
4. `effectiveGazeCalibrationBounds` blends measured L/R with population defaults (`populationGazeXLeft/Right`) weighted by `_gazeSessionSamples`.
5. Live zone classification uses **`getZone(smoothGazeX)` on raw pipeline X** with ±0.10 deadband — **not** normalized or calibrated bounds.

### Tuning targets (measure first, then adjust)

| Knob | File | Current | Tuning action |
|------|------|---------|---------------|
| Raw zone deadband | `lib/gaze_zone.dart` → `getZone` | ±0.10 | Widen/narrow based on measured pipeline X spread on SM-S928U |
| Normalized zone bands | `lib/gaze_zone.dart` → `getGazeZone` | 0.33 / 0.66 | Use **after** wiring normalized gaze into dwell path (future pass) |
| Gaze X offset | `lib/gaze_normalize.dart` → `gazeXCalibrationOffset` | 0.09 | Re-evaluate vs neutral capture |
| Population defaults | `populationGazeXLeft/Right` | 0.076 / 0.132 | Update from device cohort if local cal skipped |
| Local weight ramp | `lib/trust_merge.dart` → `computeLocalWeight` | 200 samples | Consider faster ramp for lab sessions |
| Capture quality | `lib/main.dart` → `_normalize` | single frame | **Future:** require fixation + N-frame median before accepting sample |

### Recommended operator sequence (device)

1. Face center, good lighting → **Cal N** (head neutral).
2. Fixate physical left target → **Cal L** (hold 1 s, verify HUD `min=` updates).
3. Fixate physical right target → **Cal R** (verify HUD `max=` updates).
4. Return neutral → confirm zone = CENTER stable for ≥2 s.
5. Sweep L→R → log false transitions.

---

## 6. Blink / EAR calibration strategy

### Current flow

1. **Cal EAR** → `OpenEarCalibrator` averages 30 frames → `_leftOpenEar`, `_rightOpenEar`.
2. Slow EMA drift: `openEarBaselineEmaAlpha = 0.01` during non-blink frames.
3. `BlinkDetector` uses dynamic raw thresholds when `rawMeanBaseline` set: close ≈ 0.7× mean open, open ≈ 0.9×.
4. Parallel path `_trySelectZoneOnMeanEarClosedEdge` uses fixed `0.08` close threshold for zone **select** blink.

### Tuning targets

| Knob | File | Current | Notes |
|------|------|---------|-------|
| Sample count | `OpenEarCalibrator.sampleCount` | 30 | Increase if lighting noisy |
| Close fraction | `rawDynamicCloseFraction` | 0.7 | Lower → more sensitive blink |
| Open fraction | `rawDynamicOpenFraction` | 0.9 | Hysteresis band |
| Fixed select threshold | `main.dart` `_blinkCloseThreshold` | 0.08 | Align with dynamic close or gate on calibrated baseline |
| Blink duration | `BlinkDetector.min/maxBlinkDurationMs` | 80–400 ms | Reject noise vs slow blinks |
| Cooldown | `BLINK_COOLDOWN_MS` | 250 ms | Triple-blink cancel timing |

### Recommended operator sequence

1. **Cal EAR** with eyes open, neutral expression (~1 s).
2. Verify HUD: `leftOpenEAR`, `rightOpenEAR`, dynamic close threshold line.
3. Deliberate blink → `Blink: true`, count increments.
4. Dwell zone → close eyes → zone select (heavy haptic).
5. 2 blinks confirm / 3+ cancel — verify FSM resets.

---

## 7. Attention scoring strategy

**Do not invent production scoring in this pass.** Document wiring only.

### Native score (`VisionProcessor.computeAttentionScore`)

Starts at 1.0, applies fractional penalties/bonuses, clamps, ×100:

| Condition | Effect |
|-----------|--------|
| `!headStable` | −30% |
| `avgEAR < EAR_THRESHOLD` | −40% |
| `\|gazeX\| > ATTENTION_GAZE_X_THRESHOLD` | −20% |
| Low gaze variance (steady) | +bonus |
| Neutral head yaw/pitch | +bonus |
| Micro-saccades detected | +bonus |
| Blink rate in expected band (60 s window) | +bonus |

Score 0 common when: eyes closed, head moving, gaze off-center, or no face.

### Flutter overlay

- `attentionWithFatigueBonus` adds +0.1 display bump when EAR fatigue < 0.05 (not a production gate).
- `AttentionKernel` produces separate CONF/STAB telemetry for pointer smoothing — not mapped to native 0–100.

### Production path (future, out of scope here)

1. Log native score + component flags during 60 s sessions.
2. Define MVP cutoff (e.g. median ≥ X over window Y) from measured distribution — **not** guessed.
3. Wire to `VerificationResultScreen` / Step 4 gates in integration track.
4. Keep anti-spoof (`likelyFake`) as hard fail or review flag.

---

## 8. Anti-spoof / authenticity strategy

Native flags (already on HUD):

| Flag | Meaning (heuristic) |
|------|---------------------|
| `likelyFake` | OR of below |
| `fakeStaticGaze` | Gaze unnaturally static |
| `fakePerfectStability` | Variance too low for too long |
| `fakeNoBlink` | No blinks in auth window |

**Tuning approach:** measure false positive rate on real user (normal movement, talking, reading) vs photo/screen replay. Do **not** tighten native heuristics until FP rate is logged. Flutter side: surface flags clearly; use `faceConfidence` alongside for segmentation quality.

---

## 9. Operator HUD cleanup plan

### Done (first pass)

- Bottom-left lab HUD: bounded width/height + scroll — prevents overflow on 1080×2340; all metrics retained.

### Next passes (UI only, no gaze math)

| Item | Proposal |
|------|----------|
| Collapsible lab panel | Single “Lab” toggle; default collapsed on non-debug builds |
| Calibration strip | Group Cal L/R/N/EAR with phase indicator + ✓ on capture |
| Dev controls | Move Lock/Explore/AO kill to overflow menu |
| Attention kernel panel | Anchor above dwell ring; truncate long REASON |
| Typography | 12 px monospace for numeric blocks; 14 px for labels |
| Product summary row | One line: `Zone · Attention · Cal ready` for operator glance |

---

## 10. Next device-test checklist

Run from `integrations/eye-tracking/flutter-runtime/`:

```bash
flutter pub get
flutter analyze
flutter run -d R5CX2137BEB
```

Optional logcat:

```bash
adb logcat -s VisionProcessor flutter IRIS
```

### Session checklist

- [ ] HUD scrolls without clipping; all metric lines visible
- [ ] Cal N → Cal L → Cal R → Cal EAR sequence completes; FSM → `ready`
- [ ] Record `min`/`max`/`yaw₀`/open EAR values in run notes
- [ ] Neutral gaze holds CENTER ≥5 s
- [ ] Look left/right: zone matches ≥80% subjective (log mismatches)
- [ ] Dwell + blink selects zone; haptic fires
- [ ] 2-blink confirm / 3-blink cancel works
- [ ] Native `attentionScore` non-zero during stable neutral + open eyes (note value range)
- [ ] `likelyFake` false during normal use
- [ ] `frame_perf`: processed FPS ≥4 sustained 60 s
- [ ] One face-loss/recovery cycle (cover camera 3 s, uncover)
- [ ] No layout assertion spam
- [ ] Save screenshot + metric snapshot to smoke-runs folder

### Pass criteria for calibration pass

| Criterion | Target |
|-----------|--------|
| Cal FSM reaches `ready` | 4/4 operator attempts |
| Zone accuracy (subjective) | ≥80% after calibration |
| Blink select success | ≥3/5 dwell+blink attempts |
| HUD readable | No overflow on SM-S928U |
| 60 s stability | No crash; processed FPS stable |

---

## References

| Doc | Path |
|-----|------|
| Smoke test result | [`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md) |
| Smoke test plan | [`ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md) |
| Runtime README | [`integrations/eye-tracking/flutter-runtime/README.md`](../../integrations/eye-tracking/flutter-runtime/README.md) |

### Key source files

| Area | Path |
|------|------|
| Main loop + HUD | `lib/main.dart` |
| Zone UI | `lib/gaze_zone_buttons.dart` |
| Zone thresholds | `lib/gaze_zone.dart` |
| Gaze normalize | `lib/gaze_normalize.dart` |
| Calibration FSM | `lib/features/calibration/calibration_phase.dart` |
| EAR calibrate | `lib/ear_calibration.dart` |
| Blink FSM | `lib/blink_detector.dart` |
| Attention kernel | `lib/attention_kernel.dart` |
| Native attention | `android/.../VisionProcessor.kt` |
