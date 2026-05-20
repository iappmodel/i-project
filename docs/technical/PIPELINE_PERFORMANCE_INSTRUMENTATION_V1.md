# Pipeline Performance Instrumentation v1

**Date:** 2026-05-20  
**Runtime:** [`integrations/eye-tracking/flutter-runtime/`](../../integrations/eye-tracking/flutter-runtime/)  
**Code:** [`lib/performance/pipeline_performance_monitor.dart`](../../integrations/eye-tracking/flutter-runtime/lib/performance/pipeline_performance_monitor.dart)

---

## 1. Why this exists

Physical Android runs on Samsung SM-S928U proved the promoted runtime is **functionally correct** (camera, native vision, overlay, dwell, verification stability layer). Processed FPS is only **~4–12** while the camera delivers **~28–33 fps**, so the next work is **targeted optimization** — not more feature wiring.

`[frame_perf]` logs already summarize encode, channel, and native timings once per second, but they reset the window each log line and do not label **which stage dominates** or surface drop mix in the lab HUD. Pipeline Performance Instrumentation v1 adds a **rolling-window, observe-only** monitor and a compact **Pipeline perf** panel so operators can see bottleneck stage + reason without changing processing behavior.

---

## 2. Current observed bottleneck (Android SM-S928U)

From 2026-05-20 device session logs (representative):

| Stage | Typical range | Notes |
|-------|----------------|-------|
| **encode** (JPEG) | **55–65 ms** | Often largest single Dart-side cost |
| **channel** (MethodChannel + native round-trip) | **25–75 ms** | High variance; includes JNI transfer |
| **native process** | **5–30 ms** (sometimes spikes 70–80 ms) | Face Landmarker; usually smaller than encode+channel |
| **native decode** | ~4 ms | Stable in `native(last decode=…)` |
| **dart post** | ~5 ms | Gaze pipeline, zones, blink, HUD feeds |
| **invalid frames** | Spikes (5–11 per perf window) | Face/gaze loss, non-finite raw gaze |
| **drops** | throttle >> busy | ~12 fps target spacing; busy = backpressure proxy |
| **buffer pressure** | logcat `ImageStreamReader` drops, JNI `GetEnv` warnings | Not directly readable in Dart; **busy** drops counted as `buf` proxy |

**Working hypothesis:** Optimize **encode format/size** and **channel payload** before tuning native MediaPipe or Dart gaze math.

---

## 3. Metrics captured

### Per-frame stage samples (processed paths only)

| Stage | Source |
|-------|--------|
| `capture` | ms from frame arrival (`_frameArrivalMs`) to JPEG encode start |
| `encode` | `cameraImageToJpegBytes` stopwatch (same as `FramePerfMetrics`) |
| `channel` | `_bridge.processFrame` stopwatch (same as `FramePerfMetrics`) |
| `nativeDecode` | `VisionFrame.nativeDecodeMs` |
| `nativeProcess` | `VisionFrame.nativeProcessMs` |
| `nativeTotal` | `VisionFrame.nativeTotalMs` |
| `dartPost` | Dart path after native return until frame handler completes |
| `total` | Full `_updateFrame` handler wall time |

### Rolling window counters (~2 s)

| Counter | Meaning |
|---------|---------|
| `valid` | Processed samples with pipeline `validFrame == true` |
| `invalid` | `PipelineDropKind.invalid` + invalid processed samples |
| `throttled` | Frame spacing skip (`_kFrameSpacingMs`) |
| `busy` | Skipped while `_processingFrame` |
| `buf` | **Proxy** — incremented with each busy drop (buffer/GC pressure marker) |

### Computed outputs

| Output | Description |
|--------|-------------|
| `avgEncodeMs` / `avgChannelMs` / `avgNativeProcessMs` / `avgTotalMs` | Window averages |
| `processedFps` / `cameraFps` | From sample count and camera input timestamps |
| `invalidRatio` | Invalid events ÷ (processed + invalid) |
| `bottleneckStage` | Stage with highest average ms among samples |
| `bottleneckReason` | Short operator string (e.g. JPEG encode dominant) |

Existing **`[frame_perf]`** `debugPrint` summaries are **unchanged** and still emitted ~1 Hz in debug builds.

---

## 4. How to read the HUD

In the bottom-left lab panel (Android), below **Verification stability**:

```
--- Pipeline perf (observe) ---
enc=58ms ch=40ms nat=12ms tot=95ms
fps proc=7.2 cam=29.0 inv=12%
bn: encode — JPEG encode avg 58.0ms (next channel 40.0ms)
drop T/B/I/buf=48/2/5/2
```

| Line | Read as |
|------|---------|
| `enc` / `ch` / `nat` / `tot` | Rolling average ms for encode, channel, native process, end-to-end handler |
| `fps proc` / `cam` | Processed vs camera input rate in the window |
| `inv` | Share of invalid + drop-invalid vs throughput |
| `bn` | Dominant stage + reason (optimization hint) |
| `drop T/B/I/buf` | Throttle / busy / invalid / buffer-pressure proxy counts in window |

---

## 5. Pass / fail (instrumentation session)

| Check | Pass |
|-------|------|
| App builds and runs on device | APK install, camera ACTIVE |
| `[frame_perf]` still prints ~1 Hz | Unchanged log format |
| HUD shows **Pipeline perf** block | Non-empty after ~2 s of stream |
| `bn` label matches log intuition | e.g. encode or channel when encode+channel dominate |
| `flutter analyze` clean | No new errors |
| Unit tests | `pipeline_performance_monitor_test.dart` + existing suite |

**Fail** if: HUD missing, analyze errors, frame processing behavior changes (dwell/gaze/verification), or native/Kotlin edits in this pass.

---

## 6. What optimizations this will inform

| If bottleneck is… | Likely next experiment (not in v1) |
|-------------------|-------------------------------------|
| **encode** | Lower JPEG quality, smaller ROI, YUV→RGB path, skip re-encode |
| **channel** | Smaller payload, binary buffer, shared memory / texture handoff |
| **nativeProcess** | Model resolution, frame skip on native side, GPU delegate tuning |
| **dartPost** | Reduce per-frame setState, defer non-critical HUD work |
| High **T** (throttle) | Spacing vs target processed FPS tradeoff |
| High **B** / **buf** | Concurrency, drop policy, buffer pool (with logcat correlation) |
| High **inv** | Lighting, face hold, landmark thresholds (calibration track) |

---

## 7. What is explicitly not changed

- Native MediaPipe / Kotlin `VisionProcessor` behavior
- `vision_channel` payload schema or method contracts
- Gaze math, dwell, blink-to-select, zone logic
- Verification stability layer scoring or gating
- Backend / MVP Step 4 integration
- `[frame_perf]` log format or window reset behavior
- JPEG encode implementation (`frame_codec.dart`)

---

## 8. Next Android run checklist

From repository root:

```bash
cd integrations/eye-tracking/flutter-runtime
flutter pub get
flutter analyze
flutter test test/pipeline_performance_monitor_test.dart
flutter test test/verification_stability_layer_test.dart
flutter run -d R5CX2137BEB
```

**On device (~2 min):**

1. Grant camera; confirm front camera ACTIVE.
2. Hold face in frame; confirm **Pipeline perf** HUD updates (`enc`/`ch`/`bn`).
3. Tail terminal: `[frame_perf]` still present; compare `bn` to `ms(avg encode=…, channel=…)`.
4. Optional logcat: `adb logcat -s VisionProcessor flutter IRIS | grep -E 'frame_perf|ImageStream|GetEnv'`
5. Note `bn` stage + `drop T/B/I/buf` while moving head (invalid spikes) and holding still.
6. Record screenshot + 60 s log snippet under `docs/technical/smoke-runs/` if archiving.

**Success signal for instrumentation v1:** HUD bottleneck aligns with log averages (encode or channel dominant on SM-S928U class hardware).

---

## References

| Doc | Path |
|-----|------|
| Smoke test result | [`ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md`](ANDROID_EYE_TRACKING_SMOKE_TEST_RESULT.md) |
| Verification stability v1 | [`VERIFICATION_STABILITY_LAYER_V1.md`](VERIFICATION_STABILITY_LAYER_V1.md) |
| Frame perf metrics | [`frame_perf_metrics.dart`](../../integrations/eye-tracking/flutter-runtime/lib/features/vision/frame_perf_metrics.dart) |
