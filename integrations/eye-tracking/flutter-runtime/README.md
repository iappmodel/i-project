# Eye-tracking Flutter runtime (promoted)

**Status:** Promoted working copy for Android device verification (2026-05-20).  
**Recovery layer:** [`../source-runtime-candidates/`](../source-runtime-candidates/) (unchanged originals)

## Source base

| | |
|--|--|
| **Promoted from** | `source-runtime-candidates/from-Desktop-IVAULT-DEMOS-REPOS-eye_tracking_app/` |
| **Original machine path** | `/Users/2023macbookpro/Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app` |
| **Provenance** | [`PROMOTION_MANIFEST.md`](PROMOTION_MANIFEST.md), [`DELTA_NOTES.md`](DELTA_NOTES.md) |
| **Technical report** | [`../../../docs/technical/FLUTTER_RUNTIME_PROMOTION_REPORT.md`](../../../docs/technical/FLUTTER_RUNTIME_PROMOTION_REPORT.md) |

## What this runtime does

On-device **camera → MediaPipe Face Landmarker → gaze / blink / attention signals** for the [ i ] verified-attention product concept:

1. **Capture** — `package:camera` via `lib/features/camera/camera_session_controller.dart`
2. **Native vision** — Android `VisionProcessor.kt` (EAR blink, iris gaze, head pose, attention score 0–100)
3. **Dart pipeline** — fixation, zones, calibration, intent OS, autonomous kernel (lab / R&D UI in `lib/main.dart`)
4. **Bridge** — `vision_channel` MethodChannel in `lib/features/vision/vision_channel_bridge.dart`

This is the **real** attention stack behind MVP Step 4 (“Attention is verified”) in [`docs/MVP_CANONICAL_FLOW.md`](../../../docs/MVP_CANONICAL_FLOW.md). It is **not** wired to `investor-demo` or HTML loops yet — those still use mocked gaze.

## Key runtime files

| Layer | Path | Role |
|-------|------|------|
| Entry | `lib/main.dart` | Flutter app: camera loop, gaze UI, intent OS integration |
| Attention scoring | `lib/attention_kernel.dart` | Dart-side attention state / telemetry |
| Gaze engine | `lib/engine/gaze_pipeline.dart`, `lib/gaze_fixation.dart` | Fixation and pipeline orchestration |
| Blink | `lib/blink_detector.dart` | Dart blink logic (complements native EAR) |
| Vision bridge | `lib/features/vision/vision_channel_bridge.dart` | `processFrame` / `calibrateHeadPose` |
| Native | `android/app/src/main/java/.../VisionProcessor.kt` | MediaPipe Tasks API, EAR, gaze X/Y, segmentation |
| ML assets | `android/app/src/main/assets/face_landmarker.task`, `selfie_segmenter.tflite` | Required at runtime |
| Tests | `test/*.dart` | 26 unit tests (channel bridge, gaze, governance, etc.) |
| Shared core | `core/` | Calibration, stability, pointer control (top-level package) |

## Relation to [ i ] verified attention

| MVP layer | Location | Uses live camera? |
|-----------|----------|-----------------|
| Presenter demo | `integrations/eye-tracking/demos/investor-demo/` | No — mocked `WatchVerifyScreen` |
| HTML loop | `06_feed_earning_loops/iapp_loop1_watch_verify_earn.html` | Cosmetic gates |
| **This runtime** | `flutter-runtime/` | **Yes** — intended proof layer for Step 4 gates (device signal, dwell, attention score) |

Future work: map `VisionFrame` / native attention fields to the five gates in `VerificationResultScreen.tsx` and `process-earning` schema (see canonical flow Step 4).

## How to test later (Android)

From this directory:

```bash
cd integrations/eye-tracking/flutter-runtime
flutter pub get
flutter test
flutter devices          # confirm Android device/emulator
flutter run -d <device>  # smoke: camera permission, live attention HUD
```

**Smoke checklist:** front camera opens → `vision_channel` returns maps with gaze/EAR → attention value updates on face present → no channel crash when face lost.

## Current limitations

- **Android-first** — no `ios/` tree in promoted copy; iOS called out of v1 scope in integration map
- **Not linked** to archive React/HTML demos or wallet settlement
- **iTrack deltas not applied** — see [`DELTA_NOTES.md`](DELTA_NOTES.md)
- **`android/local.properties`** may point at another machine’s SDK; regenerate locally
- **Backup artifact** — `MainActivity.kt.bak_step_fixation` left as-is from source
- **Heavy UI / intent lab** — `main.dart` is a research shell, not the investor-demo skin (by design: no UI redesign in promotion)

## Repository hygiene

Generated Flutter outputs (`.dart_tool/`, `build/`, `.flutter-plugins-dependencies`, etc.) are **not** committed. A local [`.gitignore`](.gitignore) excludes them; after clone run `flutter pub get` and `flutter test` to recreate caches. Details: [`../../../docs/technical/FLUTTER_RUNTIME_REPO_HYGIENE.md`](../../../docs/technical/FLUTTER_RUNTIME_REPO_HYGIENE.md).

## Reversibility

Delete `integrations/eye-tracking/flutter-runtime/` to undo; candidates under `source-runtime-candidates/` are untouched.
