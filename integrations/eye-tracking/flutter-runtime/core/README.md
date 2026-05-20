# Legacy `core/` pipeline (non-runtime)

This directory is **not** used by the Flutter app entrypoint (`lib/main.dart`). Live tracking uses:

- `lib/engine/gaze_pipeline.dart` + `lib/gaze_fixation.dart`
- Native `MethodChannel('vision_channel')` for face / gaze features

The classes here (`Pipeline`, top-level `PointerController`, `Smoothing`, etc.) are an alternate integration sketch. Prefer extending `lib/` paths unless you explicitly wire this tree into the app and remove duplication with `lib/core/pointer_controller.dart`.
