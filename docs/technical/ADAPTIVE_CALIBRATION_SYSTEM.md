# Adaptive calibration system — Android eye-tracking runtime

**Date:** 2026-05-20  
**Runtime:** [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/)  
**Companion:** [`CALIBRATION_TUNING_PLAN.md`](CALIBRATION_TUNING_PLAN.md) (device measurement procedures)  
**Smoke baseline:** [`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md)

---

## 1. Product principle

Calibration must be **invisible, simple, and user-adaptive**.

| Principle | Meaning |
|-----------|---------|
| Invisible | The user never “configures a machine.” No sliders, no multi-step wizard, no jargon. |
| Simple | First use feels like opening the camera — the app learns while they interact. |
| Adaptive | Thresholds drift toward each user’s natural gaze range, blink pattern, head pose, and session context. |
| Explainable | Every adjustment is a deterministic rolling average or bounded EMA — no black-box ML in MVP. |
| Local-first | Profile lives on device; no backend; no raw video stored. |
| Safe-by-default | Low confidence → population defaults; verification gates require minimum confidence. |

**Non-goals (this design):** federated learning, neural personalization, production reward scoring, native MediaPipe changes.

---

## 2. User experience

### First-use micro-calibration (~3–5 s, zero setup screen)

1. User opens app → front camera starts (already true on Android runtime).
2. Brief on-screen cue: *“Look at the center for a moment”* — no buttons required.
3. System collects ~30 frames of neutral gaze + open EAR + head yaw while face is detected and stable.
4. Optional passive left/right discovery during first zone interactions (see passive loop below).
5. User proceeds to normal LEFT / CENTER / RIGHT interaction; calibration continues in background.

**Lab/dev builds** retain Cal L/R/N/EAR buttons for operator measurement; **product builds** hide them and rely on adaptive + micro-calibration.

### Passive calibration during normal use

While the user dwells, selects zones, and blinks:

- Confirmed zone selections (dwell + blink) become **labeled gaze samples** for L/C/R bounds.
- Open-eye frames during fixation update EAR baselines (slow EMA, already partially implemented).
- Head-neutral periods update yaw/pitch comfort range.
- Face scale / landmark spread proxy **phone distance**; brightness variance proxy **lighting quality**.
- Fatigue drift tracked via EAR baseline − current mean (already in `earFatigueLevel`).

The user should experience improving zone accuracy over the first 1–2 minutes, then stability across sessions.

### No complicated setup screen

| Avoid | Use instead |
|-------|-------------|
| Multi-page calibration wizard | Micro-calibration overlay (single sentence) |
| Manual threshold entry | Rolling averages + population priors |
| “Calibrate again” as primary flow | Settings → “Reset eye tracking” (rare) |
| Exposing EAR/gaze numbers | Optional lab HUD in debug only |

---

## 3. Signals to learn

All signals are **derived metrics** from `VisionFrame` + Flutter pipeline — never raw frames.

| Signal | Source | Session use | Long-term use |
|--------|--------|-------------|---------------|
| Neutral gaze X/Y | Pipeline gaze during stable center fixation | Session baseline offset | Long-term neutral centroid |
| Left / center / right thresholds | Gaze X at confirmed zone selects + micro-cal extremes | Session L/R bounds | Merged with population priors |
| EAR open baseline | Mean L/R EAR while eyes open, non-blink | Session open baseline | Long-term open baseline |
| Blink closed threshold | Observed closure depth on registered blinks | Dynamic close fraction | Personalized close/open hysteresis |
| Head yaw / pitch comfort | `headYaw`, `headPitch` when `headStable` | Session neutral pose | Allowed range before penalty |
| Phone distance / angle | Face bbox scale or landmark span (future); proxy: `faceConfidence` + stable head | Session context flag | “Typical hold distance” band |
| Lighting quality | Frame-to-frame EAR/gaze variance + optional native `selfieQuality` | Session quality score | Down-weight bad sessions |
| Fatigue drift | `earFatigueLevel` EMA | Session fatigue offset | Long-term diurnal pattern (future) |

**Existing runtime hooks:** `_gazeMeasuredLeft/Right`, `_neutralHeadYaw`, `OpenEarCalibrator`, `LearningStore.updateCalibration`, `UserProfile.calibrationDrift`, `effectiveGazeCalibrationBounds`, `BlinkDetector` dynamic thresholds.

---

## 4. Calibration profile model

Scaffold: [`lib/calibration/adaptive_calibration_profile.dart`](../../integrations/eye-tracking/flutter-runtime/lib/calibration/adaptive_calibration_profile.dart)

### Structure

```
AdaptiveCalibrationProfile
├── GazeThresholds          (leftBound, centerNeutral, rightBound, deadband)
├── EarBaseline             (leftOpen, rightOpen, closeFraction, openFraction)
├── HeadPoseComfort         (neutralYaw, neutralPitch, maxDelta)  [future field]
├── EnvironmentContext      (lightingScore, distanceBand)           [future field]
├── CalibrationConfidence   (0–1 composite + per-domain scores)
├── session                 (rolling, reset each app launch)
├── longTerm                (persisted JSON across launches)
└── driftCorrection         (small bounded offset applied to gaze normalize)
```

### Confidence score

Composite \([0, 1]\) from weighted domains:

| Domain | Weight (MVP) | Increases when |
|--------|--------------|----------------|
| Gaze L/R | 0.35 | Both bounds observed OR ≥3 confirmed zone samples per side |
| Neutral | 0.20 | ≥30 stable neutral frames captured |
| EAR open | 0.25 | Open baseline from ≥30 open-eye frames |
| Blink close | 0.10 | ≥5 registered blinks with closure depth |
| Head pose | 0.10 | Neutral yaw captured + stable head ≥10 s |

**Gates (future verification):** require `confidence.overall ≥ 0.6` before treating calibration as production-ready; `< 0.3` → population defaults only.

### Rolling averages

- **Session baseline:** EMA with α = 0.1–0.2 for fast adaptation within a sitting.
- **Long-term baseline:** EMA with α = 0.02–0.05 across persisted sessions.
- **Merge rule:** `effective = merge(session, longTerm, sessionWeight)` where `sessionWeight` rises with session sample count (same pattern as `trust_merge.dart`).

### Drift correction

- Small bounded offset on normalized gaze X (extends `UserProfile.calibrationDrift` concept).
- Updated when confirmed selection gaze disagrees with assigned zone center by > deadband.
- Clamp: ±0.05 normalized units per session; ±0.10 long-term.

---

## 5. Adaptive loop

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ OBSERVE  │───▶│ COMPARE  │───▶│ ADJUST   │───▶│ VALIDATE │───▶│ PERSIST  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │               │
  VisionFrame    vs profile +     EMA / merge    confidence +    local JSON
  + pipeline     population      bounded step   outlier reject   (future)
  + intent       priors                           (blink sanity)
  events
```

### Observe (every processed frame)

- Append to rolling buffers when: face present, not blinking, fixation stable (optional gate).
- On `IntentEngine` zone select: record `(zone, gazeX, timestamp)` as labeled sample.

### Compare

- Neutral frames → distance from `GazeThresholds.centerNeutral`.
- Labeled zone → distance from expected bound side.
- EAR → distance from open baseline; blink episodes → closure depth.

### Adjust

- If sample passes quality gates (stable, confidence OK, not outlier): apply EMA to session profile.
- Periodically fold session → long-term (on pause, background, or every N selections).

### Validate

- Reject samples when: `likelyFake`, low `faceConfidence`, extreme head motion, blink in progress.
- Require minimum buffer size before adjusting L/R bounds (avoid single-frame capture bug).

### Persist

- MVP: `SharedPreferences` or app-documents JSON file with schema version.
- Store **only** derived doubles, ints, timestamps, confidence — no images, no landmarks.

---

## 6. Safety

| Rule | Implementation |
|------|----------------|
| Never store raw video | Profile JSON only; no frame buffers on disk |
| Derived metrics only | Gaze bounds, EAR means, yaw offsets, confidence, timestamps |
| Reset calibration | Settings action clears long-term + session; re-runs micro-calibration |
| Confidence before verification | Verification gate reads `CalibrationConfidence.overall`; no reward if below threshold |
| Outlier rejection | Z-score or fixed band on gaze/EAR updates |
| Anti-spoof | Native `likelyFake` blocks profile updates (observe-only log in MVP scaffold) |

---

## 7. MVP implementation

Phased, deterministic, local-only:

| Step | Deliverable | Status |
|------|-------------|--------|
| 1 | `AdaptiveCalibrationProfile` model + JSON serde stubs | **Scaffold** (`lib/calibration/adaptive_calibration_profile.dart`) |
| 2 | Observe-only hook in `main.dart` — log profile snapshot every 30 s debug | Next |
| 3 | Wire micro-calibration on first launch (neutral buffer, no UI change) | Next |
| 4 | Passive L/R from zone selects → `GazeThresholds` | Next |
| 5 | Replace single-frame Cal L/R with median-of-N in lab buttons | Tuning pass |
| 6 | `shared_preferences` or file persistence + reset | Next |
| 7 | Apply profile to `getZone` / `normalizeGazeX` with confidence blend | After device data |
| 8 | Verification confidence gate | Integration track |

**Start with:** population defaults (`populationGazeXLeft/Right`, fixed deadband) + rolling session EMA overlay.

**Reuse:** `OpenEarCalibrator`, `effectiveGazeCalibrationBounds`, `LearningStore.updateCalibration`, `calibration_phase.dart` FSM (lab).

---

## 8. Future implementation

| Capability | Notes |
|------------|-------|
| Personalized model | On-device regression or small k-NN (`core/calibration/adaptive_calibration_engine.dart` exists as NN baseline) |
| Federated / on-device learning | Differential privacy aggregates; out of scope for archive MVP |
| Anti-spoof challenge-response | “Blink twice” / “look left” prompts when `likelyFake` or low confidence |
| Adaptive fraud thresholds | Tighten `likelyFake` sensitivity per user blink/gaze variance distribution |
| Environment profiles | Separate sub-profiles for “desk” vs “handheld” lighting/distance |

---

## 9. Runtime files likely involved

| File | Role |
|------|------|
| `lib/main.dart` | Frame loop, micro-cal trigger, observe hook, lab Cal buttons |
| `lib/calibration/adaptive_calibration_profile.dart` | Profile model (new scaffold) |
| `lib/features/calibration/calibration_phase.dart` | FSM labels for lab / debug |
| `lib/gaze_zone.dart` | `getZone` / `getGazeZone` thresholds |
| `lib/gaze_normalize.dart` | Bounds, offset, population merge |
| `lib/trust_merge.dart` | Local vs global weight curve |
| `lib/ear_calibration.dart` | Open EAR, dynamic blink fractions |
| `lib/blink_detector.dart` | Blink FSM, closure detection |
| `lib/ear_normalize.dart` | Normalized EAR pair |
| `lib/gaze_zone_buttons.dart` | Zone UI (presentation only) |
| `lib/features/vision/vision_frame.dart` | Native signal contract |
| `lib/features/gaze/drift_adjusted_gaze.dart` | Drift-adjusted raw gaze |
| `lib/core/intent_os/learning/learning_store.dart` | Existing drift / behavior EMA |
| `lib/core/intent_os/learning/user_profile.dart` | `calibrationDrift` |
| `lib/core/intent_os/intent_engine.dart` | Zone select events for labeled samples |
| `core/calibration/adaptive_calibration_engine.dart` | Future k-NN gaze mapping (core/) |

---

## 10. Next implementation step

1. **Land scaffold** — `AdaptiveCalibrationProfile` with stub `observeFrame` / `observeZoneSelection` / `toJson` / `fromJson` (no callers yet).
2. **Observe-only in debug** — instantiate profile in `main.dart`, call `observeFrame` with throttled debugPrint; **do not** change zone math or verification.
3. **Device run** — execute [`CALIBRATION_TUNING_PLAN.md`](CALIBRATION_TUNING_PLAN.md) § “Practical device run” to collect baseline numbers before wiring adjustments.
4. **Persistence** — add `shared_preferences` dep + reset API when observe-only logs look sane.

**Explicit constraint:** Do not apply profile to verification or reward gates until confidence model is validated on SM-S928U class hardware.

---

## References

| Doc | Path |
|-----|------|
| Device tuning procedures | [`CALIBRATION_TUNING_PLAN.md`](CALIBRATION_TUNING_PLAN.md) |
| Smoke test result | [`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md) |
| Runtime README | [`integrations/eye-tracking/flutter-runtime/README.md`](../../integrations/eye-tracking/flutter-runtime/README.md) |
