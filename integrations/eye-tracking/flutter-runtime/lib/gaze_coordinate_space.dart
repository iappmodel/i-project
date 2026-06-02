/// Typed gaze coordinate helpers — single path for zone selection (Stage 4).
library;

import 'gaze_normalize.dart';
import 'gaze_zone.dart';

/// Which space [GazeSample.x] / [GazeSample.y] live in.
enum GazeCoordinateSpace {
  /// VisionProcessor `gazeX` / `gazeY` before Dart [GazePipeline].
  nativeRaw,

  /// After [GazePipeline.update] (native-scale horizontal gaze, not \([0,1]\)).
  pipelineSmoothed,

  /// After [normalizeGazeX] with calibration bounds (roughly \([0,1]\)).
  normalized01,
}

/// One gaze reading tagged by coordinate space (eliminates implicit mixing).
final class GazeSample {
  const GazeSample({
    required this.x,
    required this.y,
    required this.space,
    this.confidence = 1.0,
  });

  final double x;
  final double y;
  final GazeCoordinateSpace space;
  final double confidence;
}

bool hasUserGazeCalibration(double? measuredLeft, double? measuredRight) {
  return measuredLeft != null &&
      measuredRight != null &&
      measuredRight > measuredLeft &&
      measuredLeft.isFinite &&
      measuredRight.isFinite;
}

/// Maps pipeline-smoothed gaze to \([0,1]\).
///
/// HUD path ([usePopulationFallback] true): blends user L/R with population via
/// [effectiveGazeCalibrationBounds]. Zone path uses population only after user L/R capture.
double? normalizedGazeFromPipeline({
  required double pipelineSmoothedX,
  double? measuredLeft,
  double? measuredRight,
  int sessionSamples = 0,
  bool usePopulationFallback = true,
}) {
  if (!pipelineSmoothedX.isFinite) return null;

  final ({double left, double right}) bounds;
  if (hasUserGazeCalibration(measuredLeft, measuredRight)) {
    bounds = usePopulationFallback
        ? effectiveGazeCalibrationBounds(
            measuredLeft: measuredLeft,
            measuredRight: measuredRight,
            sessionSamples: sessionSamples,
          )
        : (left: measuredLeft!, right: measuredRight!);
  } else if (usePopulationFallback) {
    bounds = effectiveGazeCalibrationBounds(
      measuredLeft: measuredLeft,
      measuredRight: measuredRight,
      sessionSamples: sessionSamples,
    );
  } else {
    return null;
  }

  return normalizeGazeX(
    pipelineSmoothedX - gazeXCalibrationOffset,
    bounds.left,
    bounds.right,
  );
}

/// Resolves UI zone from [GazeSample] in [GazeCoordinateSpace.pipelineSmoothed] or [nativeRaw].
///
/// Uses [normalizeGazeX] + [getGazeZone] when calibration bounds exist; otherwise [getZone]
/// on offset-adjusted gaze (matches legacy deadband before L/R capture).
String resolveZoneFromGazeSample(
  GazeSample sample, {
  double? measuredLeft,
  double? measuredRight,
  int sessionSamples = 0,
}) {
  assert(
    sample.space == GazeCoordinateSpace.pipelineSmoothed ||
        sample.space == GazeCoordinateSpace.nativeRaw,
    'zone resolution expects pipeline or native horizontal gaze',
  );
  return resolveZoneFromGaze(
    pipelineSmoothedX: sample.x,
    measuredLeft: measuredLeft,
    measuredRight: measuredRight,
    sessionSamples: sessionSamples,
  );
}

/// Resolves UI zone label from pipeline-smoothed gaze and optional L/R calibration.
String resolveZoneFromGaze({
  required double pipelineSmoothedX,
  double? measuredLeft,
  double? measuredRight,
  int sessionSamples = 0,
}) {
  if (!pipelineSmoothedX.isFinite) return 'CENTER';

  if (hasUserGazeCalibration(measuredLeft, measuredRight)) {
    final normalized = normalizedGazeFromPipeline(
      pipelineSmoothedX: pipelineSmoothedX,
      measuredLeft: measuredLeft,
      measuredRight: measuredRight,
      sessionSamples: sessionSamples,
      usePopulationFallback: true,
    );
    if (normalized != null) {
      return getGazeZone(normalized.clamp(0.0, 1.0));
    }
  }

  final offset = pipelineSmoothedX - gazeXCalibrationOffset;
  return getZone(offset);
}

/// Normalized screen pointer X in \([0,1]\) from pipeline-smoothed gaze (HUD pointer baseline).
double gazePointerNormalizedX({
  required double pipelineSmoothedX,
  double? measuredLeft,
  double? measuredRight,
  int sessionSamples = 0,
}) {
  final normalized = normalizedGazeFromPipeline(
    pipelineSmoothedX: pipelineSmoothedX,
    measuredLeft: measuredLeft,
    measuredRight: measuredRight,
    sessionSamples: sessionSamples,
    usePopulationFallback: hasUserGazeCalibration(measuredLeft, measuredRight),
  );
  if (normalized != null) return normalized.clamp(0.0, 1.0);
  if (!pipelineSmoothedX.isFinite) return 0.5;
  return ((pipelineSmoothedX - gazeXCalibrationOffset - 0.09) * 10 + 0.5)
      .clamp(0.0, 1.0);
}

/// @deprecated Use [gazePointerNormalizedX].
double gazeRawToPointerNormalizedX(double rawGazeX) =>
    gazePointerNormalizedX(pipelineSmoothedX: rawGazeX);
