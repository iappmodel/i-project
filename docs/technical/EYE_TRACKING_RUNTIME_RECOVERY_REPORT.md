# Eye-tracking runtime recovery report

## 1. Search date

**2026-05-20** (local scan on macOS darwin 24.6.0)

---

## 2. Search locations

| Location | Accessible | Notes |
|----------|------------|-------|
| `/Users/2023macbookpro/eye_tracking_app` | Yes | Current “live” repo — **Next.js + investor-demo only**; no Flutter camera runtime in tree |
| `/Users/2023macbookpro/Desktop` | Yes | **Primary recovery:** `Desktop/iTrack` and `Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app` |
| `/Users/2023macbookpro/Documents` | Yes | No matching runtime filenames |
| `/Users/2023macbookpro/Downloads` | Yes | MediaPipe Studio PNG exports only (documentation screenshots) |
| `/Users/2023macbookpro/Library/Mobile Documents` | Not scanned | Path not accessible in this environment (iCloud) |

**Content-term hits (representative):** MediaPipe Face Landmarker, CameraX, EAR blink logic, iris/landmark gaze, fixation pipeline — confirmed in `VisionProcessor.kt` and `lib/main.dart` under Desktop copies.

---

## 3. Expected runtime files found

| Expected name | Found | Recovery source (original path) |
|---------------|-------|----------------------------------|
| `lib/main.dart` | Yes | `Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app/lib/main.dart` (camera + full pipeline entry) |
| `main.dart` | Yes | Same + `attention_mediapipe/example/lib/main.dart` |
| `VisionProcessor.kt` | Yes | `.../android/app/src/main/java/com/example/eye_tracking_app/VisionProcessor.kt` |
| `gaze_pipeline.dart` | Yes | `lib/engine/gaze_pipeline.dart` |
| `gaze_fixation.dart` | Yes | `lib/gaze_fixation.dart` + `lib/engine/gaze_fixation.dart` |
| `blink_detector.dart` | Yes | `lib/blink_detector.dart` |
| `frame_processor.dart` | Yes | `lib/core/perception/frame_processor.dart` |
| `camera_controller` (pattern) | Yes (renamed) | `lib/features/camera/camera_session_controller.dart` |
| `vision_processor` (pattern) | Yes | `VisionProcessor.kt` |
| Face mesh / MediaPipe | Yes | Embedded in `VisionProcessor.kt`; assets `face_landmarker.task`, `selfie_segmenter.tflite` |
| `gaze_calibration.dart` | Partial | `lib/ear_calibration.dart`, `core/calibration/adaptive_calibration_engine.dart`, `lib/features/calibration/calibration_phase.dart` |
| `attention_verifier.dart` | Partial | `lib/attention_kernel.dart` (attention scoring, not separate verifier module) |

---

## 4. Expected runtime files not found

| Expected name | Status |
|---------------|--------|
| `attention_verifier.dart` | **Not found** by exact filename anywhere searched |
| `gaze_calibration.dart` | **Not found** by exact filename (calibration implemented under other names) |
| `camera_view.dart` | **Not found** (camera via `package:camera` in `main.dart` + `camera_session_controller.dart`) |
| `lib/main.dart` in `~/eye_tracking_app` | **Not present** in current home repo |
| Full Flutter app in i-project `integrations/eye-tracking/source/` prior import | **Not present** (only partial Dart intent OS + Next.js) |

---

## 5. Other relevant runtime-like files found (not moved)

| Path | Role |
|------|------|
| `/Users/2023macbookpro/Desktop/iTrack/` | Sibling copy of Flutter runtime; differs slightly from IVAULT archive (`main.dart`, `blink_detector.dart`, `gaze_zone_buttons.dart`) |
| `Desktop/IVAULT/SYSTEMS:APPS:REFFERENCES/mediapipe-master/` | Upstream MediaPipe reference tree (not app runtime) |
| `Desktop/IVAULT/DEMOS:REPOS/eye-earn-sparkle-archive/attention_mediapipe/` | Duplicate of attention plugin |
| `integrations/eye-tracking/demos/investor-demo/` | React **mock** verify flow (already in archive) |
| `integrations/eye-tracking/prototypes/i-mvp-prototype/` | Simulated gaze UI (already in archive) |

---

## 6. Files copied into `source-runtime-candidates`

**Destination:** `integrations/eye-tracking/source-runtime-candidates/`  
**Total:** **305 files** (~9.2 MB)  
**Manifest:** [`integrations/eye-tracking/source-runtime-candidates/COPY_MANIFEST.md`](../../integrations/eye-tracking/source-runtime-candidates/COPY_MANIFEST.md)

### Provenance summary

| Prefix | Files | Description |
|--------|------:|-------------|
| `from-Desktop-IVAULT-DEMOS-REPOS-eye_tracking_app/` | 199 | Full Flutter + Android runtime (lib, core, android, test, `pubspec.yaml`, ML assets) |
| `from-Desktop-IVAULT-DEMOS-REPOS-eye-earn-sparkle-demo-attention_mediapipe/` | 93 | Flutter plugin: CameraX + MediaPipe + OpenCV head pose |
| `from-Desktop-iTrack/` | 5 | Delta variants + duplicate ML assets |
| `from-home-eye_tracking_app/` | 8 | Intent OS Dart only (matches prior import gap) |

### Critical runtime paths preserved (under IVAULT prefix)

- `lib/main.dart` — Flutter app entry, `package:camera`, gaze/blink/intent pipeline
- `android/.../VisionProcessor.kt` — MediaPipe Face Landmarker, EAR blink, gaze x/y, attention scoring
- `android/app/src/main/assets/face_landmarker.task`, `selfie_segmenter.tflite`
- `lib/engine/gaze_pipeline.dart`, `lib/engine/gaze_fixation.dart`, `lib/blink_detector.dart`
- `lib/core/perception/frame_processor.dart`, `camera_service.dart`, `landmark_processor.dart`
- `lib/features/camera/camera_session_controller.dart`, `lib/features/vision/vision_channel_bridge.dart`
- `lib/attention_kernel.dart`, `lib/ear_calibration.dart`

### iTrack deltas (newer/alternate copies)

- `from-Desktop-iTrack/lib/main.dart`
- `from-Desktop-iTrack/lib/blink_detector.dart`
- `from-Desktop-iTrack/lib/gaze_zone_buttons.dart`

---

## 7. Files that appear to be docs/prototypes only

| Location | Type |
|----------|------|
| `~/eye_tracking_app` (current) | Next.js admin, `investor-demo`, Obsidian docs — **no camera runtime** |
| `integrations/eye-tracking/source/` (prior import) | TS/Next + partial `governance_kernel.dart` — **broken without `gaze_fixation.dart`** |
| `integrations/eye-tracking/demos/investor-demo` | Mock attention / verify screens |
| `integrations/eye-tracking/prototypes/i-mvp-prototype` | Simulated eye-tracking indicator |
| `02_clickable_prototypes/`, `06_feed_earning_loops/*.html` | HTML fiction for watch→verify→earn |
| `docs/obsidian-vault/.../native-android-vision.md` | Contract documentation |
| Downloads MediaPipe Studio PNGs | Screenshots only |

---

## 8. Can the repo demo verified attention visually?

**Yes — for presenter/investor flows.**

- `integrations/eye-tracking/demos/investor-demo` (Watch → Verify → Reward with mocked gaze)
- `integrations/eye-tracking/prototypes/i-mvp-prototype` (simulated eye-tracking)
- Rescued HTML loops in `06_feed_earning_loops/`

These are **not** bound to live camera signals.

---

## 9. Can the repo run real camera-based attention verification?

**Not yet as a single runnable target in the archive.**

- **Before this scan:** Real runtime was **missing** from `i_project_migration_archive` and from `~/eye_tracking_app`.
- **After this scan:** Real runtime is **preserved as candidates** under `source-runtime-candidates/` but is **not wired** into a buildable Flutter module at repo root (no `flutter run` path in CI/launcher yet).

Hardware verification requires promoting candidates → `integrations/eye-tracking/flutter-runtime/` (or equivalent), `flutter pub get`, Android device build, and channel bridge tests.

---

## 10. Recommended next technical step

**Promote preserved candidates into a buildable Flutter package** inside the archive:

1. Copy `from-Desktop-IVAULT-DEMOS-REPOS-eye_tracking_app/` → `integrations/eye-tracking/flutter-runtime/` (new folder; do not overwrite existing `source/` Next.js tree).
2. Merge iTrack deltas after diff review (`main.dart`, `blink_detector.dart`).
3. Run `flutter test` + one Android device smoke (`flutter run`) confirming `VisionProcessor` channel returns gaze/EAR.
4. Document run commands in `integrations/eye-tracking/README.md` and link from [`EYE_TRACKING_INTEGRATION_MAP.md`](EYE_TRACKING_INTEGRATION_MAP.md).

Optional parallel: evaluate `attention_mediapipe` plugin for reuse vs inlined `VisionProcessor.kt`.

---

## Appendix: full copied file list

See terminal-generated list at scan time (305 paths). Regenerate:

```bash
find integrations/eye-tracking/source-runtime-candidates -type f | sort
```
