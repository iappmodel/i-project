import 'trust_merge.dart';

/// Subtracted from live native [gazeX] before [normalizeGazeX]. Left/right calibration
/// samples are still stored in **raw** native units.
///
/// **Calibration tuning:** re-evaluate offset vs neutral capture on target hardware.
const double gazeXCalibrationOffset = 0.09;

/// Population raw gazeX extremes (native units) when local calibration is missing or
/// down-weighted. Matches historical fixed bounds used in tests.
const double populationGazeXLeft = 0.076;
const double populationGazeXRight = 0.132;

/// Effective left/right raw bounds for [normalizeGazeX]: blends user measurements with
/// [populationGazeXLeft] / [populationGazeXRight] using [sessionSamples] (see [computeLocalWeight]).
({double left, double right}) effectiveGazeCalibrationBounds({
  required double? measuredLeft,
  required double? measuredRight,
  required int sessionSamples,
}) {
  final w = computeLocalWeight(sessionSamples);
  if (measuredLeft == null || measuredRight == null) {
    return (left: populationGazeXLeft, right: populationGazeXRight);
  }
  return (
    left: merge(measuredLeft, populationGazeXLeft, w),
    right: merge(measuredRight, populationGazeXRight, w),
  );
}

/// Maps raw [gazeX] to roughly \([0,1]\) using **measured** left and right extremes.
///
/// `normalized = (gazeX - minX) / (maxX - minX)` with `minX`/`maxX` the smaller and larger of
/// [measuredLeft] and [measuredRight] so calibration still works if the user records bounds
/// out of numerical order.
double? normalizeGazeX(
  double gazeX,
  double? measuredLeft,
  double? measuredRight,
) {
  if (measuredLeft == null || measuredRight == null) return null;
  final minX = measuredLeft <= measuredRight ? measuredLeft : measuredRight;
  final maxX = measuredLeft <= measuredRight ? measuredRight : measuredLeft;
  final denom = maxX - minX;
  if (denom.abs() < 1e-9) return null;
  return (gazeX - minX) / denom;
}
