# Legacy `core/` pipeline (non-runtime)

This directory is **not** used by the Flutter app entrypoint (`lib/main.dart`). Live tracking uses:

- `lib/engine/gaze_pipeline.dart` + `lib/gaze_fixation.dart`
- Native `MethodChannel('vision_channel')` for face / gaze features

**Stage 2 (2026-06-02):** Dart stubs under this tree were removed. Canonical runtime lives only under `lib/`. Do not reintroduce duplicate `core/` paths outside `lib/`.
