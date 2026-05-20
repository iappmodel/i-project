# Delta notes — candidates not merged into `flutter-runtime/`

**Base promoted:** `from-Desktop-IVAULT-DEMOS-REPOS-eye_tracking_app/` (199 files)  
**Review date:** 2026-05-20

This folder is a **clean copy of the IVAULT archive only**. The files below were compared but **not** merged blindly.

---

## `from-Desktop-iTrack/` (5 files)

Sibling copy of the same Flutter app on Desktop. Recovery kept only deltas + duplicate ML assets.

| Path | vs IVAULT base | Notes |
|------|----------------|-------|
| `lib/main.dart` | **Differs** (2266 vs 2745 lines) | iTrack version dated **2026-05-20**; inlines `cameraImageToJpegBytes`, YUV/BGRA resize, and drops modular imports under `lib/features/` (camera, vision, gaze coordinators). Reads as a **monolithic refactor fork**, not a drop-in patch. |
| `lib/blink_detector.dart` | **Differs** | iTrack copy is larger (~302 lines vs base). May include alternate EAR/blink thresholds — needs side-by-side review before merge. |
| `lib/gaze_zone_buttons.dart` | Present in both | Compare before merge; iTrack may have UI zone wiring tweaks. |
| `android/app/src/main/assets/face_landmarker.task` | Duplicate | Same asset class as promoted runtime; no merge needed unless checksum differs. |
| `android/app/src/main/assets/selfie_segmenter.tflite` | Duplicate | Same as above. |

**Recommendation:** Diff `main.dart` and `blink_detector.dart` in a dedicated PR. Do **not** replace promoted `main.dart` wholesale — IVAULT base retains the modular `features/` pipeline (`camera_session_controller`, `vision_channel_bridge`, `pipeline_tracking_coordinator`) that matches existing unit tests under `test/`.

**Compare commands:**

```bash
diff -u integrations/eye-tracking/source-runtime-candidates/from-Desktop-IVAULT-DEMOS-REPOS-eye_tracking_app/lib/main.dart \
        integrations/eye-tracking/source-runtime-candidates/from-Desktop-iTrack/lib/main.dart

diff -u integrations/eye-tracking/source-runtime-candidates/from-Desktop-IVAULT-DEMOS-REPOS-eye_tracking_app/lib/blink_detector.dart \
        integrations/eye-tracking/source-runtime-candidates/from-Desktop-iTrack/lib/blink_detector.dart
```

---

## `from-Desktop-IVAULT-DEMOS-REPOS-eye-earn-sparkle-demo-attention_mediapipe/` (93 files)

Standalone **Flutter plugin** (`attention_mediapipe`) — not the same layout as the full app.

| Asset / file | Why it may matter later |
|--------------|-------------------------|
| `android/.../AttentionMediapipePlugin.kt` | Encapsulated CameraX + MediaPipe + OpenCV solvePnP head pose behind a plugin API |
| `lib/attention_mediapipe.dart`, `attention_mediapipe_method_channel.dart` | `start(fps:)`, stream-style attention API for reuse in other apps |
| `example/lib/main.dart` | Minimal plugin demo (`flutter run` from `example/`) |
| `android/src/main/assets/face_landmarker.task` | Same model family as inlined `VisionProcessor.kt` |

**Not merged because:** Promoted runtime already embeds vision in `android/.../VisionProcessor.kt` + `vision_channel` MethodChannel (`lib/features/vision/vision_channel_bridge.dart`). Adopting the plugin would be an **architecture swap**, not a promotion copy.

**Later decision:** Plugin vs inlined processor — see recovery report §10 and `EYE_TRACKING_INTEGRATION_MAP.md`.

---

## `from-home-eye_tracking_app/` (8 files)

Partial Dart from current `~/eye_tracking_app` (Next.js home repo) — **intent OS only**, no camera runtime.

| Files | Status |
|-------|--------|
| `lib/core/intent_os/governance_kernel.dart`, `action_decision.dart`, etc. | Largely duplicated or superseded by files already in IVAULT `lib/core/intent_os/` |

**Not merged:** No `main.dart`, no Android vision stack; does not add camera verification capability.

---

## Other items present in promoted tree but not “merged from elsewhere”

| Item | Note |
|------|------|
| `android/app/src/main/kotlin/.../MainActivity.kt.bak_step_fixation` | Backup from source archive; kept for provenance; safe to ignore for builds until reviewed. |
| `android/local.properties` | Machine-specific SDK path from recovery host; regenerate on your machine (`flutter pub get` / Android Studio). |

---

## Summary — what was not merged

1. **iTrack** `main.dart` monolith and alternate `blink_detector.dart` / `gaze_zone_buttons.dart`
2. **attention_mediapipe** entire plugin + example app
3. **from-home** partial intent OS (redundant with IVAULT `lib/core/intent_os/`)
4. **Next.js / React demos** under `integrations/eye-tracking/source/` and `demos/` (separate integration layer)
