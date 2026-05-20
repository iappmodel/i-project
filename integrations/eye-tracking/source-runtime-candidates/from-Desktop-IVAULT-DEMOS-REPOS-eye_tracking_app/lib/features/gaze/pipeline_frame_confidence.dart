import '../../head_confidence.dart';

/// Head pose + EAR confidence chain for one frame, matching [main.dart]
/// `_updateFrame` before [runPipelineAndTrackingTick].
///
/// Delegates math to [head_confidence.dart] only.
final class PipelineFrameConfidence {
  const PipelineFrameConfidence({
    required this.headConfidence,
    required this.confidence,
    required this.filterAlpha,
  });

  /// 1.0 when [headYaw] or [headPitch] is null; else [headConfidence] from lib.
  final double headConfidence;

  /// EAR × head branch; used only to derive [filterAlpha] in current pipeline.
  final double confidence;

  /// Passed to gaze pipeline smoothing ([smoothingAlphaFromConfidence]).
  final double filterAlpha;
}

PipelineFrameConfidence resolvePipelineFrameConfidence({
  required double? headYaw,
  required double? headPitch,
  required bool hasLandmarks,
  required double leftEar,
  required double rightEar,
}) {
  final headConf = (headYaw != null && headPitch != null)
      ? headConfidence(headYaw, headPitch)
      : 1.0;
  final confidence = computeConfidence(
    hasLandmarks: hasLandmarks,
    leftEar: leftEar,
    rightEar: rightEar,
    headConf: headConf,
  );
  final filterAlpha = smoothingAlphaFromConfidence(confidence);
  return PipelineFrameConfidence(
    headConfidence: headConf,
    confidence: confidence,
    filterAlpha: filterAlpha,
  );
}
