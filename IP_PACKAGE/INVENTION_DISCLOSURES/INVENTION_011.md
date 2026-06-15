# INVENTION_011 — Y-Plane Luminance Transport Optimization

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Attention Verification
**Date:** 2026-06-15

## Problem Solved

Mobile eye-tracking and face-analysis systems must transfer camera frames from native platform code (iOS/Android camera APIs) to application-level processing (Flutter/Dart). The standard approach of JPEG-encoding each frame introduces a 5-15ms latency bottleneck per frame, consumes significant CPU/battery, and is entirely unnecessary when the ML model only requires grayscale luminance data. This encoding overhead limits achievable frame rates and degrades real-time responsiveness for gaze tracking.

## Current Industry Approach

Most cross-platform mobile frameworks (Flutter, React Native, Xamarin) that need camera access for ML processing encode frames as JPEG or PNG before passing them across the native-to-framework bridge. Some systems use platform channels with raw byte arrays but still transmit full RGB/YUV data. Google's MLKit and Apple's Vision framework operate natively but cannot easily share results with cross-platform UI layers without serialization overhead. No existing consumer eye-tracking system optimizes transport by extracting and transmitting only the Y (luminance) plane with buffer pooling.

## How [ i ] Solves It

The [ i ] system bypasses the JPEG encoding bottleneck entirely by extracting only the Y (luminance) plane from YUV420 camera frames and transmitting it as raw bytes across the platform channel. Since face detection, eye tracking, and gaze estimation models primarily operate on grayscale intensity data, the chrominance planes (U, V) are discarded at the source. A `YPlaneBufferPool` provides zero-allocation buffer reuse, and an optional nearest-neighbor downscale reduces resolution to a configurable maximum edge size. The system falls back to JPEG encoding only for non-YUV formats (BGRA) where Y-plane extraction is not possible. This reduces per-frame transport payload by ~67% (Y only vs. full YUV) and eliminates encode/decode CPU cost entirely for the common YUV420 path.

## System Description

The `y_plane_frame_codec.dart` module intercepts `CameraImage` objects from the Flutter camera plugin. It inspects the image format group: for YUV420 (the dominant format on Android), it calls `yuv420Y8PlaneForVision()` which extracts plane[0] (Y/luminance) from the camera image's plane array. If the frame exceeds the configured `maxEdge` dimension, the function performs a nearest-neighbor downscale by sampling source pixels at computed stride intervals. The output is a dense packed buffer (rowStride == width, pixelStride == 1) acquired from the `YPlaneBufferPool` singleton. The pool maintains a single reusable `Uint8List` that grows as needed but never shrinks during a session, eliminating GC pressure from per-frame allocation. The packed Y8 bytes are transmitted over the vision platform channel with metadata (format='y8', width, height, rowStride, pixelStride, optional rotationDegrees). For BGRA or unknown formats, the system falls back to baseline JPEG encoding. A runtime flag `shouldUseExperimentalYPlaneTransport()` gates the optimization to Android-only (where YUV420 is native) while iOS falls back to its optimized path.

## Technical Components

- `integrations/eye-tracking/flutter-runtime/lib/features/vision/y_plane_frame_codec.dart` — frame codec with Y-plane extraction
- `integrations/eye-tracking/flutter-runtime/lib/features/vision/y_plane_buffer_pool.dart` — zero-allocation buffer pool
- `integrations/eye-tracking/flutter-runtime/lib/features/vision/runtime_transport_config.dart` — transport configuration flags
- `integrations/eye-tracking/flutter-runtime/lib/features/vision/frame_codec.dart` — base frame codec interface
- `yuv420Y8PlaneForVision()` — Y-plane extraction with optional nearest-neighbor downscale
- `YPlaneBufferPool` — singleton pooled buffer with grow-only semantics
- `cameraImageToVisionChannelPayload()` — format-dispatching codec entry point
- `shouldUseExperimentalYPlaneTransport()` — platform-aware feature gate
- `kExperimentalYPlaneMaxEdge` — configurable maximum resolution edge
- Vision channel protocol (y8 format metadata + raw bytes)

## Data Flow

1. Flutter camera plugin delivers `CameraImage` with YUV420 planes
2. `cameraImageToVisionChannelPayload()` checks `image.format.group`
3. For YUV420: `yuv420Y8PlaneForVision()` extracts plane[0] bytes
4. If resolution exceeds `maxEdge`, nearest-neighbor downscale is applied
5. `YPlaneBufferPool.acquire()` provides a reusable output buffer (no allocation)
6. Dense Y8 bytes are packed into the buffer (rowStride == width)
7. Payload map constructed: {format: 'y8', width, height, rowStride, pixelStride, bytes, rotationDegrees}
8. Payload transmitted over Flutter platform channel to native ML processing
9. Native side receives raw Y8 and feeds directly to face/gaze model (no decode needed)
10. For non-YUV formats: fallback to JPEG encode path

## User Flow

The user experiences faster, more responsive eye tracking with no visible calibration or setup difference. Frame processing latency is reduced by 5-15ms per frame, enabling higher effective frame rates (30fps+ on mid-range devices). Battery consumption is noticeably lower during extended attention-verification sessions. The optimization is transparent—users simply perceive smoother gaze cursor movement and more accurate attention scoring.

## Economic Flow

1. Lower battery/CPU consumption extends user session length, increasing total earnable attention time
2. Higher frame rates improve attention scoring accuracy, reducing false negatives that would deny legitimate rewards
3. Reduced compute requirements enable attention verification on lower-end devices, expanding addressable market
4. Platform efficiency reduces infrastructure cost for edge processing
5. Faster frame processing enables real-time fraud detection at higher confidence

## Fraud Prevention

- Raw Y-plane transport preserves original pixel data without encode/decode artifacts that could mask manipulation
- Platform-channel metadata (width, height, stride) enables server-side validation of frame dimensions
- Buffer pool's grow-only semantics prevent memory-pressure attacks from destabilizing the pipeline
- Rotation metadata enables orientation-aware liveness checks
- Format-based dispatching ensures consistent behavior regardless of attempted format spoofing
- Frame rate monitoring can detect synthetic frame injection attempts

## Unique Elements

1. Selective Y-plane-only extraction from YUV420 camera frames, discarding chrominance channels before cross-platform transport
2. Zero-allocation buffer pooling with grow-only semantics for per-frame gaze processing in a garbage-collected runtime (Dart)
3. Nearest-neighbor downscale at extraction time (before transport) rather than after decode, reducing both transport payload and processing cost
4. Format-group-aware codec dispatching that uses the optimal path per image format while maintaining a unified API
5. Platform-gated optimization (Android YUV420 native path vs. iOS fallback) based on runtime target platform detection
6. Dense packing convention (rowStride == width, pixelStride == 1) that eliminates padding bytes from transport payload

## Potential Patent Claims

1. A method for optimizing camera frame transport in a cross-platform mobile application comprising: receiving a YUV420 camera image from a native camera API; extracting only the Y (luminance) plane bytes; optionally downscaling via nearest-neighbor sampling to a maximum resolution; packing the Y-plane data into a reusable pooled buffer; and transmitting the packed luminance data over a platform channel without JPEG or PNG encoding.

2. A system for real-time eye-tracking frame transport comprising: a buffer pool that maintains a single grow-only byte array reused across frames; a format-dispatching codec that selects Y-plane extraction for YUV420 inputs and JPEG encoding only for non-YUV formats; and a platform channel protocol carrying format metadata alongside raw luminance bytes.

3. A computer-implemented method for reducing latency in mobile gaze tracking comprising: intercepting camera frames at the cross-platform boundary; determining the frame's color format group; for YUV420 frames, extracting the first plane (luminance) while discarding chrominance planes; applying resolution capping via nearest-neighbor downscale; acquiring a pre-allocated output buffer from a singleton pool; and transmitting the dense luminance payload to a machine learning inference engine without intermediate image encoding.

4. A mobile device system for attention verification comprising: a camera producing YUV420 frames; a luminance extraction module that produces dense Y8 buffers without encode/decode overhead; a platform-aware feature gate enabling the optimization on platforms where YUV420 is the native camera format; and an attention scoring engine that processes the luminance data for gaze and face detection.

## Potential Competitors

- Google MLKit — native processing but no cross-platform transport optimization
- Apple Vision Framework — operates in native layer only
- Flutter camera plugin (vanilla) — transmits full encoded frames
- React Native Camera — JPEG encoding across bridge
- MediaPipe — native graph processing, no Flutter channel optimization
- Banuba — face tracking SDK with proprietary encoding
- TensorFlow Lite Flutter — delegates to native but uses standard frame passing

## Related Files

- `integrations/eye-tracking/flutter-runtime/lib/features/vision/y_plane_frame_codec.dart`
- `integrations/eye-tracking/flutter-runtime/lib/features/vision/y_plane_buffer_pool.dart`
- `integrations/eye-tracking/flutter-runtime/lib/features/vision/runtime_transport_config.dart`
- `integrations/eye-tracking/flutter-runtime/lib/features/vision/frame_codec.dart`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 7 |
| Patentability | 7 |
| Business Value | 7 |
