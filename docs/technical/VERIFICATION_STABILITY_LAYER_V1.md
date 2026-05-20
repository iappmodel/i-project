# Verification Stability Layer v1

**Date:** 2026-05-20  
**Runtime:** [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/)  
**Code:** [`lib/verification/verification_stability_layer.dart`](../../integrations/eye-tracking/flutter-runtime/lib/verification/verification_stability_layer.dart)

---

## 1. Problem

Physical Android smoke on Samsung SM-S928U proved the promoted runtime works end-to-end (camera, native processing, overlay, dwell). Operators still see **noisy** Dart-side signals:

| Signal | Observed behavior |
|--------|-------------------|
| Invalid frames | Spikes to **8–11** drops per perf window |
| Processed FPS | **~5–10** (usable but uneven) |
| Gaze zone | Band flicker without smoothing |
| Attention score | Native 0–100 exists; **not** productionized |
| Dwell | **DWELL_READY: CENTER** achieved; not tied to verification gates |

JNI `GetEnv` warnings and image-buffer GC drops were noted but **do not block v1**.

---

## 2. Why this layer exists

Verification Stability Layer v1 is a **lightweight, local, explainable** Dart module that:

- Maintains a **~2 second rolling window** of runtime samples
- Computes **ratios and confidence sub-scores** (valid frames, zone consistency, blink, FPS, dwell readiness)
- Emits an **operator-visible confidence band** (`POOR` → `STRONG`) and a short **reason** string

It is **not** fraud detection, **not** production attention scoring, and **not** connected to rewards or backend APIs.

**POPS alignment:** The stability layer should produce **proof confidence** (bands, ratios, reasons) for inclusion in a delayed proof packet—not **instant reward truth**. Settlement follows multi-signal POPS review; see [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md).

---

## 3. Inputs

Each [`VerificationSignalSample`](../../integrations/eye-tracking/flutter-runtime/lib/verification/verification_stability_layer.dart) may include:

| Field | Source (runtime) |
|-------|------------------|
| `timestampMs` | Frame clock |
| `zone` | Current dwell band (`LEFT` / `CENTER` / `RIGHT`) when pipeline valid |
| `gazeX` | Smoothed pipeline X or raw drift-adjusted X |
| `normalizedGazeX` | `normalizeGazeX` output when calibration samples exist |
| `meanEar` | Mean of left/right EAR when finite |
| `blinkDetected` | Dart blink detector state |
| `validFrame` | Pipeline `isValid` (face + gaze path) |
| `processedFps` | Estimate from [`FramePerfMetrics`](../../integrations/eye-tracking/flutter-runtime/lib/features/vision/frame_perf_metrics.dart) window |
| `dwellReady` | `_dwellSatisfiedForStint` |

Native MediaPipe / Kotlin pipeline and camera setup are **unchanged**.

---

## 4. Rolling-window logic

1. **Ingest** one sample per processed frame (invalid frames included for valid-ratio truth).
2. **Prune** samples older than **2000 ms**.
3. **Metrics** over the window:
   - **validFrameRatio** — fraction with `validFrame == true`
   - **zoneConsistency** — share of valid samples matching the mode zone
   - **stableZone** — mode zone with hysteresis (adopt ≥55%, hold ≥45% vs last stable)
   - **dwellReadiness** — fraction of samples with `dwellReady`
   - **blinkConfidence** — EAR plausibility + low blink-edge churn
   - **fpsConfidence** — mapped from average `processedFps` (tuned for ~5–10 fps “usable” band)
4. **Weighted score** → confidence band (see §5).

On face loss, the layer **resets** (window cleared); gaze/dwell state continues to use existing logic.

---

## 5. Confidence bands

| Band | Typical meaning |
|------|-----------------|
| **POOR** | Low valid-frame ratio and/or very low processed FPS |
| **WARMING** | Window filling or mixed valid/invalid; zone or FPS still settling |
| **USABLE** | Stable enough for operator observation (~smoke-test class device) |
| **STRONG** | High valid ratio, zone consistency, FPS, and supporting blink/dwell signals |

Output snapshot fields: `stableZone`, `confidenceBand`, ratios, `reason` (compact operator string).

---

## 6. What it does NOT do yet

- Does **not** change gaze zone selection, dwell timers, or blink-to-select
- Does **not** gate rewards, `process-earning`, or MVP Step 4 verification screens
- Does **not** replace native `attentionScore` or anti-spoof flags
- Does **not** call backend or persist profiles
- Does **not** implement fraud / liveness enforcement

---

## 7. How to test on Android

From repository root:

```bash
cd integrations/eye-tracking/flutter-runtime
flutter pub get
flutter analyze
flutter run -d R5CX2137BEB
```

**On device:**

1. Grant camera; confirm front preview and zone overlay.
2. Hold gaze in **CENTER** until log shows `DWELL_READY: CENTER` (unchanged behavior).
3. Open **lab HUD** (bottom-left scroll panel).
4. Read **Verification stability (observe)** section:
   - Band should move from **WARMING** → **USABLE** (or **STRONG**) within ~2–4 s of stable face.
   - `stable=` should track your held zone.
   - `valid=` should reflect invalid-frame spikes (drops when face lost or pipeline invalid).

Optional logcat (unchanged):

```bash
adb logcat -s VisionProcessor flutter IRIS
```

---

## 8. Pass / fail criteria

| Criterion | Pass | Fail |
|-----------|------|------|
| `flutter analyze` | No issues | Any analyzer error |
| HUD panel | Band + stable zone + reason update live | Missing or frozen |
| Gaze / dwell | Same as pre-layer (`DWELL_READY` still fires) | Dwell timing or zone logic changed |
| Native / camera | No edits to Kotlin / MediaPipe / camera | Any native diff for this task |
| Rewards / backend | No wiring | Any reward or API hook |

**v1 device pass (operator):** With face centered and processed FPS ≥5, band **USABLE** or **STRONG** for ≥3 s; `stable=CENTER` while holding center; reason string non-empty.

---

## 9. Next future step

1. **Optional control hook** — use `confidenceBand >= USABLE` as a soft gate for calibration prompts only (still not rewards).
2. **Attention productization** — map native + stability snapshot to MVP thresholds (separate doc/track).
3. **60-second stability run** — record band transitions + `frame_perf` artifact per smoke plan.
4. **Calibration tuning** — feed normalized gaze into stability window once L/R samples are reliable ([`CALIBRATION_TUNING_PLAN.md`](CALIBRATION_TUNING_PLAN.md)).

---

## References

| Doc | Path |
|-----|------|
| Smoke test result | [`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md) |
| Calibration tuning | [`CALIBRATION_TUNING_PLAN.md`](CALIBRATION_TUNING_PLAN.md) |
| Runtime README | [`integrations/eye-tracking/flutter-runtime/README.md`](../../integrations/eye-tracking/flutter-runtime/README.md) |
