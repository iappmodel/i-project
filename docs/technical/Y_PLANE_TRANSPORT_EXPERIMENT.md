# Y-plane / grayscale transport experiment

**Date:** 2026-05-20  
**Runtime:** [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/)  
**Flag:** [`lib/features/vision/runtime_transport_config.dart`](../../integrations/eye-tracking/flutter-runtime/lib/features/vision/runtime_transport_config.dart)

---

## 1. Why this exists

Physical Android runs on Samsung SM-S928U proved the promoted runtime is **functionally correct** (camera, overlay, dwell, verification). Throughput is limited by **Dart-side encode and MethodChannel transfer**, not native MediaPipe alone.

Representative SM-S928U logs:

| Stage | Typical range |
|-------|----------------|
| **encode** (full-res JPEG) | **50–75 ms** |
| **channel** (payload + JNI round-trip) | **50–120 ms** |
| **processed fps** | **0–8** |
| **native process** | Often **lower** than encode + channel combined |
| **buffer pressure** | `ImageStreamReader` drops, GC spikes |

This experiment sends **only the Y/luminance plane** (optionally downscaled) to Android native code, skipping JPEG encode/decode on the dominant YUV420 camera path.

---

## 2. Current bottleneck evidence

See [`PIPELINE_PERFORMANCE_INSTRUMENTATION_V1.md`](PIPELINE_PERFORMANCE_INSTRUMENTATION_V1.md) §2 and [`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md).

**Working hypothesis:** Smaller raw payload + no JPEG on YUV420 should reduce `encode` and `channel` averages and raise `processed` fps without changing gaze math or verification scoring.

---

## 3. Existing path (baseline, default)

| Step | Location | Behavior |
|------|----------|----------|
| Camera | `CameraSessionController` | `ImageFormatGroup.yuv420`, `ResolutionPreset.medium` |
| Encode | `frame_codec.dart` → `cameraImageToJpegBytes` | Full-res Y-plane → `img.Image` → JPEG @ quality **75** |
| Channel | `vision_channel_bridge.dart` → `processFrame(Uint8List)` | Raw JPEG bytes |
| Native | `MainActivity.kt` | `BitmapFactory.decodeByteArray` → `VisionProcessor.process` |

Controlled by:

```dart
const bool useExperimentalYPlaneTransport = false; // default
```

When `false`, behavior is **identical** to the pre-experiment promoted runtime.

---

## 4. Experimental path

| Step | Location | Behavior |
|------|----------|----------|
| Pack | `y_plane_frame_codec.dart` | YUV420 → map `{ format: y8, width, height, rowStride, pixelStride, bytes, rotationDegrees? }` |
| Downscale | `kExperimentalYPlaneMaxEdge = 512` | Nearest-neighbor on Y only when either dimension exceeds 512 |
| Channel | `processFramePayload(Map)` | Map over `vision_channel` |
| Native | `MainActivity.kt` | `y8` → `y8ToArgbBitmap` (no JPEG) → MediaPipe |
| BGRA fallback | Same module | `format: jpeg` + `cameraImageToJpegBytes` if format is not YUV420 |

**Rotation:** `rotationDegrees` is set from `CameraDescription.sensorOrientation` for future native use; MediaPipe path is unchanged today.

Preserved reference implementation: [`integrations/old-source-preservation/itrack-dirty-worktree/`](../../integrations/old-source-preservation/itrack-dirty-worktree/) and [`ITRACK_DIRTY_RUNTIME_REVIEW.md`](ITRACK_DIRTY_RUNTIME_REVIEW.md).

---

## 5. Feature flag behavior

| `useExperimentalYPlaneTransport` | Platform | Path |
|------------------------------------|----------|------|
| `false` (default) | any | JPEG `Uint8List` — unchanged |
| `true` | Android | Y8 map (YUV420) or JPEG map (BGRA) |
| `true` | iOS / desktop | Guard in `shouldUseExperimentalYPlaneTransport()` — still JPEG |

Toggle in:

[`lib/features/vision/runtime_transport_config.dart`](../../integrations/eye-tracking/flutter-runtime/lib/features/vision/runtime_transport_config.dart)

---

## 6. Android-only constraints

- Experimental **packing** is only selected on Android when the flag is `true`.
- Native `y8` handler exists in `MainActivity.kt` but is inactive until the flag is enabled.
- Camera session remains **YUV420** on Android; experiment targets that format.
- Do not change `kFrameJpegQuality` (75) on the baseline path.

---

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Landmark drift vs full-res JPEG | Compare EAR variance, zone dwell, verification layer on device |
| Downscale at 512px max edge | Tunable via `kExperimentalYPlaneMaxEdge`; document before changing |
| MethodChannel map + large `Uint8List` still copies | May help encode but not all JNI copy cost |
| `rotationDegrees` ignored by native today | Metadata only; no behavior change until wired |
| Accidental flag on in release | Default `false`; code review gate |

---

## 8. How to test

From repository root:

```bash
cd integrations/eye-tracking/flutter-runtime
flutter pub get
flutter analyze
flutter test test/y_plane_frame_codec_test.dart test/vision_channel_bridge_test.dart
flutter test test/verification_stability_layer_test.dart test/pipeline_performance_monitor_test.dart
```

**Baseline (flag off):**

1. Confirm `useExperimentalYPlaneTransport = false` in `runtime_transport_config.dart`.
2. `flutter run -d <device-id>` (e.g. Samsung SM-S928U).
3. Hold face ~60 s; capture `[frame_perf]` and **Pipeline perf** HUD.

**Experiment (flag on):**

1. Set `useExperimentalYPlaneTransport = true`.
2. Rebuild APK (`flutter run` or `flutter build apk`).
3. Same session; compare `enc`, `ch`, `fps proc`, `bn`, drops.

Optional logcat:

```bash
adb logcat -s VisionProcessor flutter | grep -E 'frame_perf|ImageStream|GetEnv'
```

---

## 9. Pass / fail criteria

| Check | Pass |
|-------|------|
| Flag `false` | Same functional behavior as pre-experiment (dwell, blink, verification) |
| Flag `true` | App runs; camera stream; native returns landmarks (no channel crash) |
| `enc` avg | Meaningfully lower than baseline on SM-S928U (target: well below ~50 ms) |
| `ch` avg | Lower or comparable; total encode+channel below baseline |
| `fps proc` | Higher than baseline 0–8 band (target: sustained improvement, not single spikes) |
| Verification stability layer | No regression in scoring/gating vs baseline session |
| `flutter analyze` | Clean |
| Unit tests | Listed suites green |

**Fail:** crashes on `processFrame` map, empty landmarks only, verification regression, or no measurable encode/channel improvement.

---

## 10. Compare against baseline logs

Record both sessions with the same device, lighting, and ~60 s hold:

| Metric | Baseline log / HUD | Experiment log / HUD |
|--------|-------------------|----------------------|
| `ms(avg encode=…)` | `[frame_perf]` | same |
| `ms(avg channel=…)` | `[frame_perf]` | same |
| `fps(processed=…)` | `[frame_perf]` | same |
| `bn:` line | Pipeline perf HUD | same |
| `drop T/B/I/buf` | HUD | same |
| `native(last decode=…)` | Y8 should show lower decode than JPEG |

Archive snippets under `docs/technical/smoke-runs/` with filenames like `y8-transport-YYYYMMDD.txt` vs `jpeg-baseline-YYYYMMDD.txt`.

---

## Files touched (experiment)

| File | Role |
|------|------|
| `runtime_transport_config.dart` | Feature flag + max edge |
| `y_plane_frame_codec.dart` | Y8 map packing |
| `vision_channel_bridge.dart` | `processFramePayload` |
| `main.dart` | Branch in `_processFace` |
| `MainActivity.kt` | `y8` / `jpeg` map + legacy `ByteArray` |

**Explicitly unchanged:** verification scoring, rewards, gaze math, dwell, `VisionProcessor.kt`, JPEG quality contract on baseline path.
