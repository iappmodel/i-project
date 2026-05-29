# POP Finish Plan — Deletion Manifest (Stage 0 sign-off)

**Branch:** `pop/finish-plan-implementation`  
**Date:** 2026-05-29  
**Status:** Approved for Stage 1 execution

## Frozen (do NOT delete)

- `integrations/eye-tracking/flutter-runtime/` — canonical runtime
- `integrations/eye-tracking/source-runtime-candidates/from-Desktop-IVAULT-DEMOS-REPOS-eye-earn-sparkle-demo-attention_mediapipe/` — iOS/alt vision backend
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/` — economy/verification reference
- `integrations/pop-core/` — evidence spine

## Stage 1 deletion list

### Empty stubs (0-byte)
- `lib/engine/gaze_buffer.dart`, `gaze_fixation.dart`, `gaze_velocity.dart`, `gaze_filter_stack.dart`, `gaze_quality.dart`
- `lib/vision/calibration_store.dart`, `gaze_models.dart`, `gaze_filter.dart`, `gaze_state_machine.dart`, `debug_painter.dart`, `screen_grid_painter.dart`
- `lib/core/stability/confidence_model.dart`, `frame_quality.dart`, `feature_stability.dart`
- `lib/core/perception/face_input.dart`, `eye_features.dart`, `head_pose.dart`, `landmark_processor.dart`

### Dead / deprecated
- `core/control/pointer_controller.dart`
- `core/pipeline.dart`
- `lib/gaze_processing_pipeline.dart`
- `lib/main.dart.bak_step_fixation`
- `android/.../MainActivity.kt.bak_step_fixation` (if present)

### Archival duplicate trees (post-promotion)
- `integrations/eye-tracking/source-runtime-candidates/from-Desktop-IVAULT-DEMOS-REPOS-eye_tracking_app/`
- `integrations/eye-tracking/source-runtime-candidates/from-home-eye_tracking_app/`
- `integrations/eye-tracking/source-runtime-candidates/from-Desktop-iTrack/` (after diff-mined)

### Backend duplicates
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/services/api/src/pops/services/pops-scoring.service.ts`

### App duplicates
- `app/src/vision-unified/constants/attention.ts` (keep `app/src/constants/attention.ts`)
