import '../../core/stability/tracking_engine.dart';
import '../../engine/gaze_pipeline.dart';

/// Outcome of [runPipelineAndTrackingTick]: pipeline output, validity for downstream
/// gaze UX, and clamped quality fed to [TrackingEngine] when valid.
final class PipelineTrackingTickResult {
  const PipelineTrackingTickResult({
    required this.result,
    required this.isValid,
    required this.qualityClamped,
  });

  final GazePipelineOutput result;
  final bool isValid;
  final double qualityClamped;
}

/// Runs [GazePipeline.update] then [TrackingEngine.update] in that order on the
/// **injected** instances (no new engines).
///
/// Mirrors the former `_updateFrame` block in `main.dart`: `valid` to the pipeline
/// is always `true` at this site.
PipelineTrackingTickResult runPipelineAndTrackingTick({
  required GazePipeline pipeline,
  required TrackingEngine tracking,
  required double x,
  required double y,
  required int now,
  required bool blink,
  required double? headYaw,
  required double? headPitch,
  required double? filterAlpha,
  required bool faceDetected,
}) {
  final result = pipeline.update(
    x: x,
    y: y,
    valid: true,
    now: now,
    blink: blink,
    headYaw: headYaw,
    headPitch: headPitch,
    filterAlpha: filterAlpha,
  );

  final isValid = result.valid && result.x != null && result.y != null;
  final qualityClamped = (result.quality ?? 0.0).clamp(0.0, 1.0).toDouble();

  tracking.update(
    faceDetected: faceDetected,
    quality: isValid ? qualityClamped : 0.0,
  );

  return PipelineTrackingTickResult(
    result: result,
    isValid: isValid,
    qualityClamped: qualityClamped,
  );
}
