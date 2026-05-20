## Product scope

- **Definition of “100% done”** (Android vs iOS, demo vs production): see [docs/DECISIONS.md](docs/DECISIONS.md). Current target is **Phase 1 — Android research prototype**; cross-platform production is **Phase 2** and must not block Phase 1 completion claims.

## Learned User Preferences

- When changing Android Gradle in this repo, keep valid Kotlin DSL in `android/app/build.gradle.kts` (for example `implementation("artifact:version")`), not Groovy `build.gradle` syntax.
- For camera or vision milestones, prefer getting preview, permissions, and builds working before layering more features.
- Prefer `ResolutionPreset.medium` over `high` for the front `CameraController` in this repo unless profiling shows landmark or gaze quality needs the extra resolution.
- For dwell, zone selection, and intent triggers, require `FixationState.fixation` before advancing UI or firing actions (do not treat unstable or saccadic gaze as actionable).
- Prefer event-driven intent handling (`EventBus`/`IntentEngine`/`ActionEngine`) and avoid direct UI actions coupled to raw fixation conditionals in feature logic.
- For security/privacy guidance, user prefers exact click-by-click steps with no vagueness and explicit clarification of whether actions were chat/tool operations or terminal commands.

## Learned Workspace Facts

- Flutter app uses `camera` and `permission_handler`; Android declares `CAMERA` in `AndroidManifest.xml` and requests runtime permission in Dart.
- `android/app/build.gradle.kts` sets `compileSdk = 36` for current `camera_android` expectations; `ndkVersion` is pinned to an explicit revision (`27.0.12077973`), not `flutter.ndkVersion`.
- `dependencies` in `android/app/build.gradle.kts` includes `com.google.mediapipe:tasks-vision:0.10.0`; manifest merger requires at least API 24, so `defaultConfig` uses `minSdk = maxOf(flutter.minSdkVersion, 24)` with `versionCode` / `versionName` from the Flutter Gradle extension.
- iOS and macOS targets need `NSCameraUsageDescription` in their Runner `Info.plist` files for camera access.
- `CameraController.startImageStream` is treated as Android/iOS-only in app code because the plugin can assert on other platforms; macOS desktop runs may use `flutter run -d macos` when no mobile device is attached.
- `android/app/src/main/assets` exists for bundled Android assets (for example ML models): `face_landmarker.task` and **`selfie_segmenter.tflite`** (MediaPipe image segmenter float16 bundle). Android loads the segmenter with **`ImageSegmenter.createFromOptions`** + **`ImageSegmenter.ImageSegmenterOptions`** (`setOutputCategoryMask(true)`, confidence masks off) and `BaseOptions.setModelAssetPath("selfie_segmenter.tflite")` — there is no `createFromFile` on the Tasks API. With a detected face, **`selfieQuality`** is the mean of `qualityScores` (or `-1`), and **`faceConfidence`** is the fraction of **category-mask** pixels equal to category **`1`** (person), via **`ByteBufferExtractor`** over `width * height` bytes (or `-1` if missing).
- Widget tests target the public root widget `EyeTrackingApp` in `lib/main.dart`. Android `MethodChannel('vision_channel')` handles `processFrame` with **JPEG or PNG bytes** (`BitmapFactory.decodeByteArray`); Flutter encodes each `CameraImage` to JPEG using the **`image`** package before `invokeMethod` on Android.
- Flutter maps raw `gazeX` with `normalizeGazeX` in `lib/gaze_normalize.dart` as `(gazeX - gazeXNormMin) / (gazeXNormMax - gazeXNormMin)` using fixed bounds `gazeXNormMin` / `gazeXNormMax` (0.076 / 0.132); `getGazeZone` in `lib/gaze_zone.dart` uses that normalized value: **LEFT** if `< 0.33`, **RIGHT** if `> 0.66`, else **CENTER**.
- Flutter `BlinkDetector` (`lib/blink_detector.dart`) counts a blink on an EAR **down-cross**: previous frame `> 0.12` and current `< 0.08`, with **250 ms** debounce between increments; `isBlinking` is true while `ear < 0.08` (native `VisionProcessor.kt` may use different blink framing). `lib/head_pitch_zone.dart` maps native `headPitch` to **DOWN** if `pitch > 0.2`, **UP** if `pitch < -0.2`, else `null` (mid band).
- In `VisionProcessor.kt`, iris rings use indices **474–477** (left) and **469–472** (right); gaze uses per-eye **(iris centroid − eye contour centroid) / `distance(eyeContour[0], eyeContour[8])`**, then **average of left and right** when both valid, **× 8** on X and **× 4** on Y after averaging (`8.0f` / `4.0f`); one eye uses the same factors on that eye’s norm. Small combined gaze components are zeroed by a symmetric dead zone (`GAZE_DEAD_ZONE`) before EMA; channel values use EMA (`GAZE_XY_SMOOTH`).
- `GazePipeline` (`lib/engine/gaze_pipeline.dart`) returns only `x`, `y`, `quality`, `varX`, and `varY` when input is valid; invalid or non-finite gaze yields `{ valid: false }` only (no fixation state in the map). `lib/main.dart` centralizes fixation via `GazeFixation.update` on `GazeTraceBuffer` with `varX` / `varY` from the pipeline result.
- Intent/action API: `IntentAction` carries `UIActionType`, `targetZone` (String), `confidence`, and `sourceTimestamp`; use `FixationState` (not `EyeMotionState`) for gaze-motion naming. `ActionPipelineKernel.evaluateSafety` + `KernelEvaluationInput` are the real entry points (not `evaluate`/`ActionRequest`), with additional governance and safety layers: `GovernanceKernel.approve` and `SafetyKernel.finalGate`/`AutonomousExecutionKernel.tryExecute` gate autonomous actions using confidence (>0.85), risk caps (<0.25 / <0.2 for some heuristics), fixation + dwell (`FixationState.fixation` with `dwellProgress > 0.8`), rate limiting (`timeSinceLastActionMs > 600`, `recentActionsLast1s < 3`), reversibility flags, and an `AutonomousExecutionKernel.emergencyKillSwitch` before invoking UI actions.

## Intent OS — `lib/core/intent_os/learning/` (live vs scaffold, 2026-04-23)

Repo-wide trace for **call sites outside the folder** starts at **`lib/main.dart`** (the only file that imports `learning/*.dart` directly). `IntentEngine` is constructed with a **`LearningStore`** instance and exposes **`learningStore`** for dwell timing, collective zone stats, profile drift, and autonomy inputs.

| Module | Role | Status | Wired from |
|--------|------|--------|------------|
| `learning_store.dart` | `LearningStore` — behavior (e.g. avg dwell, trust), collective zone stats, user profile / calibration drift | **Live** | `IntentEngine(LearningStore(), …)`; `_zoneDwellMs`, `_autonomyLevel`, `_updateFrame` (drift, `predictLikelyZone`, influence `zoneBias`), `_selectZone` → `recordSelection` |
| `learning_engine.dart` | `LearningEngine` — ingests `ActionMemory` after autonomous runs | **Live** | `_FullScreenPreviewState._learningEngine`: `_processIntentAction` → `reset` + `_actionHistory.forEach(_updateLearning)` → `ingest` |
| `evolution_intent_bridge.dart` | `EvolutionSignalBuffer`, `recordEvolutionSignal` — influence signals for UI evolution | **Live** | `_selectZone`: `recordEvolutionSignal` when `_influenceNotifier` has a value |
| `ui_evolution_engine.dart` | `UIEvolutionEngine` — updates per-zone evolution from buffered signals | **Live** | `_selectZone`: `update(zone, _evolutionSignalBuffer.signalsFor(zone))` |

**Scaffold / design-only in vault text:** The Obsidian note `docs/obsidian-vault/Projects/eye-tracking-app/intent-os-overview.md` still names `IntentOS.process`, `IntentLearner`, and `FeedbackCollector` as parallel symbolic-path pieces. Those are **not** directly imported from `learning/` in `main.dart`; treat them as **documentation / future surface** until a matching public API exists under `lib/` (or wire them explicitly and update this table).

**Trim pass:** All four `learning/` imports in `main.dart` are referenced; no dead import removal in this audit.

## Decision log (MOC Q1–Q6)

Product and platform choices for autonomy UX, confidence UI, iOS scope, accessibility, camera/battery defaults, and telemetry are **resolved in writing** with implementation backlog in **`docs/DECISIONS.md`**. Update that file when decisions change; keep this appendix for numeric and wiring facts.
