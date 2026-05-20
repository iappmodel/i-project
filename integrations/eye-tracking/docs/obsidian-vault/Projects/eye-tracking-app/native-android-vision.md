---
title: Native Android vision
tags: [eye-tracking, android, mediapipe, native]
created: 2026-04-17
code: VisionProcessor.kt, vision_channel
---

# Native Android vision

> [!tip] Ground truth
> Exact indices, scaling factors, NDK, assets, and channel contract: repo **`AGENTS.md`**.

## Role

Turn **camera frames** (JPEG bytes from Flutter) into **structured vision signals** returned over **`MethodChannel('vision_channel')`** (`processFrame`).

## Components

- **Kotlin `VisionProcessor`** — orchestrates MediaPipe Tasks Vision.
- **Face landmarker** — bundled asset `face_landmarker.task`.
- **Selfie segmenter** — `selfie_segmenter.tflite`; Tasks API via `ImageSegmenter.createFromOptions` + `ImageSegmenterOptions` (see `AGENTS.md` for mask / category handling).
- **Gaze geometry** — iris vs eye contour; per-eye normalization; average L/R when both valid; scaling and EMA per `AGENTS.md`.

## Outputs (conceptual)

- Gaze **x / y** (and validity).
- **Quality**: e.g. `selfieQuality` from segmenter quality scores; `faceConfidence` from category mask fraction for person.
- **Attention** and related values consumed in Dart (`attention_kernel`, fatigue / EAR paths).

## Flutter bridge

- Flutter encodes `CameraImage` → **JPEG** (`image` package, quality ~75 in `main.dart`).
- Android decodes with `BitmapFactory.decodeByteArray`.

## Platform notes

- `CameraController.startImageStream` — treat as **Android/iOS** in app code; other platforms differ.
- Desktop: `AGENTS.md` mentions `flutter run -d macos` when no device.

## Related

- Downstream: [[gaze-dart-pipeline]]
- Dashboard: [[00-MOC-eye-tracking-app]]

## Brainstorm

- [[iOS vision parity]]
- [[channel versioning for breaking native changes]]
- [[model size vs cold start]]
