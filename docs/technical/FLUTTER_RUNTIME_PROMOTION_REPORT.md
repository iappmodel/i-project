# Flutter runtime promotion report

## 1. Promotion date

**2026-05-20**

---

## 2. Source candidate used

| Field | Value |
|-------|--------|
| **Selected candidate** | `integrations/eye-tracking/source-runtime-candidates/from-Desktop-IVAULT-DEMOS-REPOS-eye_tracking_app/` |
| **Original path** | `/Users/2023macbookpro/Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app` |
| **Selection rationale** | Largest complete tree (199 files): `lib/`, `android/`, `core/`, `test/`, `pubspec.yaml`, ML assets, `VisionProcessor.kt` |
| **Destination** | `integrations/eye-tracking/flutter-runtime/` |
| **Copy method** | `rsync -a` (no transforms) |

---

## 3. Files and folders promoted

**Top-level (6):** `android/`, `core/`, `lib/`, `test/`, `pubspec.yaml`, plus promotion docs (`README.md`, `DELTA_NOTES.md`, `PROMOTION_MANIFEST.md`).

| Area | Count / notes |
|------|----------------|
| **Total files (runtime)** | 199 from source + 3 promotion docs |
| **`lib/`** | App entry, `engine/`, `features/` (camera, vision, gaze, calibration, intent), `core/intent_os/`, perception |
| **`android/`** | Gradle project, `VisionProcessor.kt`, `MainActivity.kt`, manifests, launcher assets |
| **`android/app/src/main/assets/`** | `face_landmarker.task`, `selfie_segmenter.tflite` |
| **`core/`** | `calibration/`, `commands/`, `control/`, `stability/`, `pipeline.dart` |
| **`test/`** | 26 Dart test files |

**Not promoted into this folder:** iTrack deltas, `attention_mediapipe` plugin, `from-home` partial — see [`integrations/eye-tracking/flutter-runtime/DELTA_NOTES.md`](../../integrations/eye-tracking/flutter-runtime/DELTA_NOTES.md).

---

## 4. Runtime capabilities preserved

| Capability | Implementation |
|------------|----------------|
| Camera capture | `package:camera`, `camera_session_controller.dart` |
| Native face mesh | MediaPipe Face Landmarker (`face_landmarker.task`) |
| EAR blink detection | `VisionProcessor.kt` + `blink_detector.dart` |
| Gaze / fixation | `gaze_pipeline.dart`, `gaze_fixation.dart`, native gaze X/Y |
| Attention score 0–100 | Native scoring + `attention_kernel.dart`, `attentionWithFatigueBonus` in `main.dart` |
| Head pose calibration | `calibrateHeadPose` on `vision_channel` |
| Selfie segmentation | `selfie_segmenter.tflite` in `VisionProcessor.kt` |
| Intent OS / governance | `lib/core/intent_os/` (governance kernel, autonomous execution) |
| Unit test coverage | Channel bridge, gaze policies, safety kernel, calibration phase |

---

## 5. Known risks

| Risk | Mitigation |
|------|------------|
| **Never built in archive CI** | Run `flutter pub get`, `flutter test`, then one device `flutter run` |
| **`android/local.properties` from recovery host** | Delete or let Flutter/Android Studio regenerate |
| **iTrack fork not merged** | May contain perf fixes (JPEG resize path) — review before production |
| **Plugin alternative exists** | `attention_mediapipe` could replace inlined `VisionProcessor` — architectural decision pending |
| **No iOS tree** | Android-only smoke for MVP proof layer |
| **Demo disconnect** | Investor-demo still mocks gaze; gates are cosmetic until bridged |
| **Backup Kotlin file** | `MainActivity.kt.bak_step_fixation` — ignore unless diffing history |
| **Large `main.dart` lab UI** | Not investor-facing; do not confuse with `WatchVerifyScreen.tsx` |

---

## 6. Build and test commands (run later)

```bash
cd integrations/eye-tracking/flutter-runtime

# Toolchain
flutter --version    # SDK >=3.8.1 per pubspec.yaml
flutter pub get

# Static / unit (no device)
flutter analyze
flutter test

# Android device smoke
flutter devices
flutter run -d <android_device_id>
```

Optional plugin evaluation (not part of promoted tree):

```bash
cd integrations/eye-tracking/source-runtime-candidates/from-Desktop-IVAULT-DEMOS-REPOS-eye-earn-sparkle-demo-attention_mediapipe/example
flutter pub get && flutter run -d <device>
```

---

## 7. Recommended Android smoke test

1. Install on physical device (front camera, good lighting).
2. Grant camera permission when prompted.
3. Confirm preview renders and HUD shows attention/gaze metrics.
4. Look away — score should drop or tracking state should degrade predictably.
5. Blink deliberately — blink events or EAR flags should respond (native + Dart).
6. Watch logcat for `VisionProcessor` / `vision_channel` errors.
7. Run `flutter test` on host before/after device pass.

**Pass criteria:** No `PlatformException` on `vision_channel`; non-null `VisionFrame` maps while face visible; app stable for 60s continuous capture.

---

## 8. Connection to `MVP_CANONICAL_FLOW.md`

| MVP step | Canonical flow | This runtime |
|----------|----------------|--------------|
| **Step 3 — Watch** | HTML/React watch HUD; camera consent in HTML only | Supplies **real** camera stream and live attention ring data (when bridged) |
| **Step 4 — Verify** | Five gates (device signal, dwell, attention, completion, fraud) — **mocked** in demos | Intended **proof layer** for gate 1–3 signals (`impressions.attention_score`, dwell) |
| **Step 10 — Eye-tracking appendix** | Notes missing Flutter tree in archive | **Resolved at file level** — tree now at `flutter-runtime/`; still **not wired** to demo spine |

**Next integration step (from canonical flow §243):** Map `WatchVerifyScreen` state fields to `VisionFrame` / native attention outputs, then embed a thin gaze bridge in a future root `app/` workspace.

**References:**

- [`docs/MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md) — Steps 3–4, 10, post-demo engineering
- [`EYE_TRACKING_RUNTIME_RECOVERY_REPORT.md`](EYE_TRACKING_RUNTIME_RECOVERY_REPORT.md) — pre-promotion scan
- [`integrations/eye-tracking/flutter-runtime/README.md`](../../integrations/eye-tracking/flutter-runtime/README.md)

---

## Reversibility

```bash
rm -rf integrations/eye-tracking/flutter-runtime
```

`source-runtime-candidates/` remains the immutable recovery layer.
