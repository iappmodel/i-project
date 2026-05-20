# Android eye-tracking smoke test — result

**Date:** 2026-05-20  
**Outcome:** **Partial pass** — real camera runtime and overlay rendering verified on physical hardware; production verification quality not yet met.  
**Plan:** [`ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md)  
**Runtime:** [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/)

---

## 1. Device

| Field | Value |
|-------|--------|
| Model | Samsung Galaxy S24 Ultra |
| Marketing / product | SM-S928U |
| Flutter `device_id` | `R5CX2137BEB` |
| OS | Android 15 (API 35) |
| Display (session) | 1080×2340 |

---

## 2. Runtime path

Promoted IVAULT eye-tracking Flutter runtime:

`integrations/eye-tracking/flutter-runtime/`

Promoted from `source-runtime-candidates/from-Desktop-IVAULT-DEMOS-REPOS-eye_tracking_app/` per [`FLUTTER_RUNTIME_PROMOTION_REPORT.md`](FLUTTER_RUNTIME_PROMOTION_REPORT.md).

---

## 3. Commands run

From repository root (session on 2026-05-20):

```bash
cd integrations/eye-tracking/flutter-runtime

flutter pub get
flutter doctor -v
flutter devices
flutter run -d R5CX2137BEB
```

**Host baseline (same day, before device run):** `flutter test` — 185 tests passed (see promotion / hygiene docs).

**Optional logcat (not required for this session’s pass signals):**

```bash
adb logcat -s VisionProcessor flutter IRIS
```

---

## 4. What passed

| Check | Result |
|-------|--------|
| Android device detected | `R5CX2137BEB` → **SM S928U** in `flutter devices` / run target |
| Debug APK build | `✓ Built build/app/outputs/flutter-apk/app-debug.apk` |
| APK install | `Installing build/app/outputs/flutter-apk/app-debug.apk...` (~5.3s) |
| App launch | `Launching lib/main.dart on SM S928U in debug mode...`; DevTools / VM service available |
| Front camera opened | Camera **1** `CAMERA_FACING_FRONT` for `com.example.eye_tracking_app` |
| Camera image stream | `startPreviewWithImageStream`; preview session configured |
| Camera ACTIVE | `CAMERA_STATE_ACTIVE` for front camera (app client) |
| Gaze-zone overlay | LEFT / CENTER / RIGHT targets rendered over live preview (post-fix) |
| Live telemetry | Lab HUD / on-screen metrics updated during capture |
| `frame_perf` logs | Periodic Dart summaries with camera FPS, processed FPS, drops, native ms |
| Native processing loop | Non-zero `processed` FPS; `native(last decode=…, process=…, total=…)` in `frame_perf` |
| UI stability after overlay fix | No layout assertion spam; session continued with camera + metrics |
| Layout assertions (post-fix) | **None** — no `Stack requires bounded constraints` / FlutterError overlay loop |

---

## 5. What failed before fix

Before commit `d24a440` (*Fix gaze zone overlay layout on Android*), the smoke run reached a working camera and processing pipeline but **the gaze-zone overlay crashed the Flutter layout**:

| Symptom | Detail |
|---------|--------|
| Runtime error | `A Stack requires bounded constraints from its parent.` |
| Origin | `gaze_zone_buttons.dart` (~line 70 in failing build) |
| Context | `GazeZoneButtons` used as a `Positioned(top/left/right)` overlay in `main.dart`, which supplies **unbounded max height** (`0.0<=h<=Infinity`) |
| Effect | Overlay UI failed; camera/native loop could still run underneath, but lab UI was not usable for zone/telemetry proof |

Camera permission, APK deploy, front-camera open, and `vision_channel` processing were already working; the blocker was **overlay layout only**.

---

## 6. What was fixed

**Commit:** `d24a440` — *Fix gaze zone overlay layout on Android*  
**File:** `integrations/eye-tracking/flutter-runtime/lib/gaze_zone_buttons.dart`

**Change (surgical, no native/MediaPipe edits):**

- Replaced `Stack` + `Positioned` top/bottom (requires finite max height) with a **`LayoutBuilder`** + **`Column`** pattern preserved from the iTrack dirty worktree review.
- **Unbounded height** (camera overlay case): tight `Column` — zone `Row` + fixed spacer + `SELECTED:` banner.
- **Bounded height**: `Column` + `Spacer` — zones pinned top, banner at `selectionBannerBottom`.

Preserves LEFT / CENTER / RIGHT behavior, selection banner, and compact overlay mode; does not alter gaze math or `vision_channel` payloads.

**Post-fix verification:** `flutter analyze lib/gaze_zone_buttons.dart` clean; `flutter run -d R5CX2137BEB` with overlay + telemetry stable (see §8–9).

---

## 7. Evidence from logs

Excerpts from the 2026-05-20 device session (`flutter run -d R5CX2137BEB`). Timestamps are local log time on device.

### Camera 1 front opened

```
I/CameraManagerGlobal: Camera 1 facing CAMERA_FACING_FRONT state now CAMERA_STATE_OPENING for client com.example.eye_tracking_app ...
I/CameraManagerGlobal: Camera 1 facing CAMERA_FACING_FRONT state now CAMERA_STATE_OPEN for client com.example.eye_tracking_app ...
I/Camera: startPreview
```

### Image stream + ACTIVE

```
I/Camera: startPreviewWithImageStream
I/CameraManagerGlobal: Camera 1 facing CAMERA_FACING_FRONT state now CAMERA_STATE_ACTIVE for client com.example.eye_tracking_app ...
```

### `app-debug.apk` built and installed

```
✓ Built build/app/outputs/flutter-apk/app-debug.apk
Installing build/app/outputs/flutter-apk/app-debug.apk...           5.3s
```

### `frame_perf` emitted

```
I/flutter: [frame_perf] fps(camera=57.0, processed=3.9) drop(throttle=48, busy=2, invalid=5) ms(avg encode=48.74, channel=36.82, post=4.87) native(last decode=4.00, process=11.68, total=15.80)
```

Earlier in the same session (camera warming, face not yet stable):

```
I/flutter: [frame_perf] fps(camera=59.9, processed=0.0) drop(throttle=48, busy=0, invalid=12) ms(avg encode=37.46, channel=13.33, post=0.00) native(last decode=2.40, process=3.87, total=6.32)
```

### Processed FPS observed (native loop engaged)

Sustained non-zero `processed` FPS after stream + face in frame (representative samples):

```
I/flutter: [frame_perf] fps(camera=37.4, processed=7.5) ... native(last decode=4.34, process=70.58, total=74.95)
I/flutter: [frame_perf] fps(camera=31.0, processed=8.0) ... native(last decode=4.37, process=27.70, total=32.14)
I/flutter: [frame_perf] fps(camera=28.9, processed=7.0) ... native(last decode=4.16, process=82.07, total=86.26)
```

Camera-side FPS in the same window was roughly **28–60 fps**; processed FPS **~4–8 fps** under load (throttle/busy drops present — expected for JPEG + native Face Landmarker on device).

### NDK version warning (non-blocking)

```
Your project is configured with Android NDK 27.0.12077973, but the following plugin(s) depend on a different Android NDK version:
- speech_to_text requires Android NDK 28.2.13676358
```

Build still completed; track under remaining issues.

---

## 8. Screenshot evidence note

**Captured (internal):** Live front-camera preview with gaze-zone overlay showing **LEFT**, **CENTER**, and **RIGHT** targets, plus live telemetry (attention / gaze / EAR-style lab readouts on the HUD).

**Not committed to git** in this pass — store under a dated run folder if archiving formally, e.g. `docs/technical/smoke-runs/2026-05-20-sm-s928u/` per the smoke test plan §9.

Redact faces if sharing externally.

---

## 9. Remaining issues

| Issue | Notes |
|-------|--------|
| Calibration not tuned | Zone thresholds / head-pose baseline need device-specific tuning |
| Debug HUD overflowing | Lab telemetry layout clips on 1080×2340; needs layout pass |
| Attention score not productionized | Native 0–100 score exists; not mapped to MVP gates or `process-earning` |
| Native metrics need cleaner operator display | `frame_perf` is engineer-oriented; product-facing summary TBD |
| NDK mismatch warning | `speech_to_text` wants NDK **28.2.13676358**; project on **27.0.12077973** |
| 60-second stability run | **Not completed** in this session — plan §8 still open |
| Face-loss/recovery cycle | Not formally recorded in pass table |
| `PlatformException` storm check | No storm observed in fix verification window; not exercised for full 60s |

---

## 10. Verdict

| Layer | Verdict |
|-------|---------|
| **Real camera runtime** | **PASS** — front camera, image stream, ACTIVE state, APK deploy |
| **Overlay rendering after fix** | **PASS** — `GazeZoneButtons` renders; no bounded-`Stack` crash |
| **Production verification quality** | **NOT YET** — calibration, HUD, attention productization, 60s stability, gate wiring |

**Stakeholder boundary:** This run proves **device-level** camera → native vision → Dart telemetry on Android. It does **not** prove MVP Step 4 “verified attention” in production or investor-demo integration.

---

## 11. Next technical tasks

1. **Calibration tuning** — head pose baseline and gaze zone boundaries on SM-S928U class hardware  
2. **Telemetry HUD cleanup** — bounded, readable debug panel without overflow  
3. **Attention scoring thresholds** — define production cutoffs from native `attentionScore`  
4. **Blink reliability** — validate EAR down-cross vs native blink framing under motion/lighting  
5. **Android 60-second stability run** — continuous capture, one face-loss/recovery cycle, recorded `adb logcat` + `frame_perf` artifact  
6. **NDK alignment (optional)** — set `ndkVersion = "28.2.13676358"` in `android/app/build.gradle.kts` if plugin warnings become build failures  
7. **Gate mapping** — connect `VisionFrame` fields to `VerificationResultScreen` / canonical Step 4 (separate integration track)

---

## Record outcome (plan §8)

| Field | Value |
|-------|--------|
| Date | 2026-05-20 |
| Device model / Android version | Samsung Galaxy S24 Ultra (SM-S928U) / Android 15 |
| `device_id` | R5CX2137BEB |
| Pass / Fail | **Partial pass** (runtime + overlay yes; full smoke plan no) |
| Overlay fix commit | `d24a440` |
| Notes | Camera + native metrics OK; overlay fixed same day; 60s window deferred |

---

## 11. Follow-up calibration pass

**2026-05-20:** First-pass instrumentation cleanup and calibration tuning plan added after partial smoke pass.

- **Tuning plan:** [`CALIBRATION_TUNING_PLAN.md`](CALIBRATION_TUNING_PLAN.md) — practical device run, pass/fail tables, artifacts to capture.
- **Adaptive system:** [`ADAPTIVE_CALIBRATION_SYSTEM.md`](ADAPTIVE_CALIBRATION_SYSTEM.md) — invisible UX, local profile model, adaptive loop, MVP phasing.
- **Code (safe HUD + scaffold):** Lab telemetry panel bounded + scrollable; `lib/calibration/adaptive_calibration_profile.dart` (observe-only stubs, not wired). No gaze math or native pipeline changes.
- **Next device run:** `flutter run -d R5CX2137BEB` → follow CALIBRATION_TUNING_PLAN § Practical device run (sections A–F).

---

## 12. Follow-up — verification stability layer v1

**2026-05-20 (post smoke):** On-device session confirmed **DWELL_READY: CENTER** with stable camera stream (~29–33 fps), processed fps ~5–10, and usable zone overlay after layout fix.

**Next layer:** Dart-side **Verification Stability Layer v1** — observe-only rolling-window smoother for operator confidence bands (not fraud detection, not production scoring, not reward gating). See [`VERIFICATION_STABILITY_LAYER_V1.md`](VERIFICATION_STABILITY_LAYER_V1.md).

**Code:** `integrations/eye-tracking/flutter-runtime/lib/verification/verification_stability_layer.dart` — wired to lab HUD only; gaze/dwell/intent behavior unchanged.

---

## References

| Doc | Path |
|-----|------|
| Smoke test plan | [`ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md) |
| Calibration tuning plan | [`CALIBRATION_TUNING_PLAN.md`](CALIBRATION_TUNING_PLAN.md) |
| Adaptive calibration system | [`ADAPTIVE_CALIBRATION_SYSTEM.md`](ADAPTIVE_CALIBRATION_SYSTEM.md) |
| Runtime README | [`integrations/eye-tracking/flutter-runtime/README.md`](../../integrations/eye-tracking/flutter-runtime/README.md) |
| iTrack layout review | [`ITRACK_DIRTY_RUNTIME_REVIEW.md`](ITRACK_DIRTY_RUNTIME_REVIEW.md) |
| MVP canonical flow | [`docs/MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md) |
