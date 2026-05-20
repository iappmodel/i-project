# iTrack dirty runtime review vs promoted `flutter-runtime`

**Review date:** 2026-05-20  
**Reviewer:** Archive documentation pass (read-only; no merges, no builds)  
**Preserved source:** `integrations/old-source-preservation/itrack-dirty-worktree/`  
**Promoted runtime:** `integrations/eye-tracking/flutter-runtime/`  
**Capture context:** Uncommitted working tree from `~/Desktop/iTrack` at `main` / `d0bc0c6` ([`SNAPSHOT_NOTES.md`](../../integrations/old-source-preservation/itrack-dirty-worktree/SNAPSHOT_NOTES.md))

---

## 1. Summary verdict

**Do not promote now.** Nothing in the dirty worktree is proven to improve gaze-zone accuracy, blink/EAR detection, or calibration correctness on device. The meaningful deltas are **Android vision throughput optimizations** (Y8 fast path + 512px downscale) and **UI/layout stability** fixes that help run verification sessions but do not change perception math.

| Disposition | Scope |
|-------------|--------|
| **Preserve only** | Entire dirty snapshot (already archived) |
| **Needs manual test** | Y8 + downscale vision pipeline (Dart + Kotlin), if pursued later |
| **Cherry-pick candidate (after device proof)** | `gaze_zone_buttons.dart` `LayoutBuilder` layout fix only |
| **Ignore** | `android/build/reports/problems/problems-report.html` (build artifact) |

**Confidence:** **Medium-high** for structural diff accuracy (patch + file parity checked); **low** for whether Y8/512 improves real verification until an Android smoke test compares landmark stability, EAR variance, and zone dwell/blink success rate against the promoted JPEG full-frame path.

---

## 2. Files compared

| Preserved (dirty) | Promoted (`flutter-runtime`) | Relationship |
|-----------------|--------------------------------|--------------|
| `files/lib/main.dart` (2745 lines, monolithic) | `lib/main.dart` (2266 lines, modular `features/`) | Same app role; **different architecture** — not a line-for-line counterpart |
| `files/lib/gaze_zone_buttons.dart` | `lib/gaze_zone_buttons.dart` | Same widget; **64-line layout diff** |
| `files/android/.../MainActivity.kt` | `android/.../MainActivity.kt` | Same channel; **+165 lines** in dirty (Y8 map handling) |
| `diffs/working-tree.patch` | N/A (authoritative delta vs iTrack `main` commit) | +456 / −104 across 4 paths (3 source + 1 build report) |
| `diffs/working-tree-stat.txt` | — | Stat summary |

**Modular counterparts in promoted runtime (not separate files in dirty tree):**

| Dirty logic location | Promoted module |
|----------------------|-----------------|
| `cameraImageToJpegBytes` / resize | `lib/features/vision/frame_codec.dart` |
| `_processFace` → channel | `lib/main.dart` + `lib/features/vision/vision_channel_bridge.dart` |
| `_FramePerfMetrics` | `lib/features/vision/frame_perf_metrics.dart` |
| Camera open / stream | `lib/features/camera/camera_session_controller.dart` |

**Explicitly not in dirty worktree patch:** `blink_detector.dart`, `VisionProcessor.kt`, `face_landmarker.task`, calibration phase logic, zone-dwell thresholds, EAR close thresholds.

---

## 3. Meaningful changes found

### 3.1 Android native bridge (`MainActivity.kt`)

Dirty tree extends `processFrame` to accept:

1. **Legacy** `ByteArray` → JPEG decode → `VisionProcessor.process(bitmap)` (unchanged behavior).
2. **Map** with `format: "y8"` → `y8ToArgbBitmap()` (luma → ARGB, no `BitmapFactory` JPEG decode) → MediaPipe.
3. **Map** with `format: "jpeg"` → same as legacy byte path.

Promoted runtime accepts **only** `ByteArray` JPEG and still documents `processFrame expects Uint8List`.

`calibrateHeadPose` is present in both; dirty patch does not remove it.

### 3.2 Vision frame path (`main.dart` dirty / `frame_codec.dart` promoted)

Dirty additions (inlined in monolithic `main.dart`):

| Symbol / constant | Behavior |
|-----------------|----------|
| `_kVisionPipelineMaxEdge = 512` | Downscale before vision when either dimension exceeds 512 (nearest-neighbor) |
| `_yuv420Y8PlaneForVision` | Extract/downscale Y-plane only |
| `cameraImageToVisionChannelPayload` | YUV420 → `{format: y8, width, height, rowStride, bytes}`; BGRA → `{format: jpeg, bytes}` |
| `_processFace` | Invokes `processFrame` with **map payload**, not raw JPEG bytes |

Promoted path: `cameraImageToJpegBytes` in `frame_codec.dart` → full-resolution YUV luma → JPEG @ quality 75 → `VisionChannelBridge.processFrame(Uint8List)`.

**Net effect:** Dirty tree skips JPEG encode/decode on Android YUV420 (dominant `CameraSessionController.sessionImageFormatGroup`). Still runs MediaPipe on a grayscale bitmap; resolution capped at 512px max edge.

### 3.3 Frame loop observability (`main.dart` dirty / `frame_perf_metrics.dart` promoted)

- Splits `droppedInvalid` into `droppedInvalidNoFace` vs `droppedInvalidGaze`.
- Adds throttled `debugPrint` for invalid face frames (`kDebugMode`, 1 Hz).
- Perf log line reports `invalid(sum=…, noFace=…, gaze=…)`.

Promoted: single `droppedInvalid` counter; no invalid-face debug line.

### 3.4 UI thread safety (`main.dart` dirty only)

- `_safeUiUpdate` / `_safeDebugUiUpdate` / `_safeInfluenceUiUpdate` / `_safePointerUiUpdate` / `_safeBlinkCountUiUpdate`: defer `setState` and `ValueNotifier` writes when `SchedulerBinding` is mid-frame.
- `_latestInfluence`: frame logic reads shadow field; notifiers updated via safe path (avoids reading notifier during camera callback).
- `_updateViewportSnapshot`: defers `_viewSize` / `_overlaySafeTop` updates out of `build`.
- `late final` `AttentionKernel` / `UIPreloader` constructed in `initState` (dirty); promoted constructs at field declaration.
- Overlay `Positioned` for zone UI: adds `bottom: 0` (dirty).

**No change** to dwell timers, blink thresholds, `getGazeZone`, EAR baselines, or `BlinkDetector` parameters in the patch.

### 3.5 Gaze zone UI (`gaze_zone_buttons.dart`)

Dirty replaces `Stack` + `Positioned` (top row + bottom banner) with `LayoutBuilder`:

- **Bounded height:** `Column` + `Spacer` + bottom banner padding.
- **Unbounded height:** compact `Column` (row + fixed gap + banner).

Comment in dirty file: avoids layout exceptions when ancestors pass unbounded max height.

Promoted still uses `Stack(fit: StackFit.expand)` and places `GazeZoneButtons` inside `Positioned(top: 0, left: 0, right: 0)` **without** `bottom` in `lib/main.dart` — a known unbounded-height constraint scenario.

### 3.6 Excluded noise

`android/build/reports/problems/problems-report.html`: Gradle problems report JSON (`requestedTasks` differs). Not source; no promotion value.

---

## 4. Impact by subsystem

| Subsystem | Affected by dirty changes? | Notes |
|-----------|----------------------------|--------|
| **Camera startup** | No | Permission, front camera, `ResolutionPreset.medium`, `ImageFormatGroup.yuv420`, torch/always flash unchanged in promoted `CameraSessionController`. Dirty does not touch camera session code. |
| **MediaPipe / FaceMesh** | **Indirectly** | Same `VisionProcessor.process(bitmap)` entry; dirty may feed **smaller** and **grayscale-only** bitmaps faster. Landmark count/quality at 512px not validated here. |
| **Gaze zones** | **UI only** | Zone **detection** logic untouched. `GazeZoneButtons` layout fix affects calibration **demo UI** rendering, not `getGazeZone` math. |
| **Blink / EAR** | **No algorithm change** | EAR values still come from native `VisionFrame`; dirty does not edit `blink_detector.dart` or EAR thresholds. Possible **secondary** effect if lower-res frames alter native EAR stability (untested). |
| **Calibration** | **UI timing only** | `_setCalibrationPhase` uses `_safeUiUpdate` instead of immediate `setState`; FSM logic unchanged. |
| **Flutter UI** | **Yes** | Layout fix, deferred notifier updates, viewport snapshot, overlay `bottom: 0`. Reduces layout/assert risk and frame-callback UI hazards during verification HUD sessions. |
| **Android native bridge** | **Yes** | New map contract for `processFrame`; backward-compatible JPEG `ByteArray` preserved in dirty Kotlin. Promoted Dart bridge does not send maps yet. |

---

## 5. Risks

| Risk | Severity | Detail |
|------|----------|--------|
| **Architecture mismatch** | High | Dirty `main.dart` is monolithic (~2745 lines, no `features/` imports). Promoted runtime is modular with 185+ unit tests on extracted modules. Wholesale file swap would regress structure and tests. |
| **512px downscale** | Medium | May reduce iris/landmark precision → gaze band noise or EAR jitter. Could help FPS (more frames/sec) or hurt accuracy; needs A/B on device. |
| **Y8 grayscale → ARGB** | Low–medium | Discards chroma; usually acceptable for face mesh, but untested vs JPEG path on target phones. |
| **Channel contract drift** | Medium | Promoting Kotlin without Dart bridge + tests breaks `VisionChannelBridge.processFrame(Uint8List)` and `vision_channel_bridge_test.dart`. |
| **False confidence from perf metrics** | Low | Split `droppedInvalid*` aids debugging but does not prove better blink/gaze outcomes. |
| **`_safeUiUpdate` masking bugs** | Low | Could hide synchronous UI assumptions; unlikely to fix wrong gaze, might fix crashes during demo. |
| **governance / JPEG quality** | Low | Promoted `frame_codec.dart` documents `kFrameJpegQuality = 75` as governed; dirty uses inline `75` and alternate transport — any promotion needs explicit governance note. |

---

## 6. Recommendation

| Option | Applies to |
|--------|------------|
| **Promote now** | **None** |
| **Preserve only** | Full `itrack-dirty-worktree/` archive (default) |
| **Needs manual test** | Y8 map payload + `_kVisionPipelineMaxEdge` downscale (port into `frame_codec.dart`, `vision_channel_bridge.dart`, `MainActivity.kt` + tests) |
| **Ignore** | Gradle `problems-report.html` |

### Cherry-pick tier (only after optional device proof)

1. **`gaze_zone_buttons.dart` `LayoutBuilder` change** — Low risk, aligns with promoted overlay layout (`Positioned` without `bottom`). Improves calibration UI reliability; does not change gaze math. Could land without Y8 if layout bugs are observed on device.
2. **Y8 + downscale pipeline** — Only if smoke test shows ≥ stable face detection and **equal or better** dwell/blink calibration success vs JPEG baseline ([`ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md)).
3. **`_safeUiUpdate` / `_latestInfluence`** — Port only if promoted runtime shows frame-callback `setState`/notifier assertions or stale influence during zone select tests.

---

## 7. Exact proposed next action

1. **Leave `flutter-runtime/` unchanged** (per review rules).
2. **Run the existing Android smoke test plan** on promoted runtime first to establish a JPEG baseline (face detection, EAR logs, zone dwell + blink select).
3. **If baseline passes and FPS/latency is a bottleneck**, open a **scoped follow-up** (not this archive merge):
   - Port Y8 payload encoding to `lib/features/vision/frame_codec.dart` (new `cameraImageToVisionChannelPayload` + tests in `test/frame_codec_test.dart`).
   - Extend `VisionChannelBridge.processFrame` to accept `Map<String, Object>` or a typed payload class; update `test/vision_channel_bridge_test.dart`.
   - Port Kotlin `processFrameFromMap` / `y8ToArgbBitmap` into promoted `MainActivity.kt`.
   - Re-run smoke test + compare `invalid(noFace|gaze)` rates and manual calibration success.
4. **If smoke test hits `RenderFlex` / unbounded height around zone buttons**, cherry-pick **only** the dirty `gaze_zone_buttons.dart` `LayoutBuilder` block into promoted `lib/gaze_zone_buttons.dart` (single-file PR).
5. **Do not** replace promoted `lib/main.dart` with dirty `files/lib/main.dart`.

---

## Appendix: patch statistics

From `itrack-dirty-worktree/diffs/working-tree-stat.txt`:

```
MainActivity.kt     | 165 +++++++++--
problems-report.html |   2 +-
gaze_zone_buttons.dart | 64 ++--
main.dart           | 329 +++++++++++++++++----
4 files changed, 456 insertions(+), 104 deletions(-)
```

**Related docs:** [`DELTA_NOTES.md`](../../integrations/eye-tracking/flutter-runtime/DELTA_NOTES.md), [`PROMOTION_MANIFEST.md`](../../integrations/eye-tracking/flutter-runtime/PROMOTION_MANIFEST.md), [`FLUTTER_RUNTIME_PROMOTION_REPORT.md`](FLUTTER_RUNTIME_PROMOTION_REPORT.md)
