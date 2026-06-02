# POP iOS vision parity (v2)

Production sensing uses the same Flutter `vision_channel` bridge on **Android and iOS**.

## Native stack

| Platform | Implementation | Model |
|----------|----------------|-------|
| Android | `android/.../VisionProcessor.kt` | `face_landmarker.task` |
| iOS | `ios/Runner/VisionProcessor.swift` | `ios/Runner/face_landmarker.task` |

Both expose:

- `processFrame` — JPEG `ByteArray` / `FlutterStandardTypedData`, or map `{ format: jpeg|y8, ... }`
- `calibrateHeadPose` — neutral head-yaw baseline

## Channel map (Dart `VisionFrame.fromMap`)

Required keys: `gazeX`, `gazeY`, `leftEAR`, `rightEAR`, `headYaw`, `headPitch`, `headStable`, `attentionScore`, `isBlinking`, `blinkCount`, anti-spoof flags, `faceConfidence`, timing fields.

Contract test: `integrations/eye-tracking/flutter-runtime/test/pop_ios_vision_contract_test.dart`.

## Build

```bash
cd integrations/eye-tracking/flutter-runtime
flutter pub get
cd ios && pod install   # MediaPipeTasksVision ~> 0.10.14
flutter build ios --no-codesign
```

Device smoke: front camera → `vision_channel` returns gaze/EAR maps (same checklist as `docs/technical/ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md`).

## Deliberate v2 gaps

- Selfie segmenter **off** on both platforms (Stage 7 perf); `faceConfidence` / `selfieQuality` return `-1` until re-enabled.
- iOS does not use the legacy `attention_mediapipe` event-stream plugin API.
