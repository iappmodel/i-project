/// Typed gaze coordinate helpers — single path for zone selection (Stage 4).
library;

import 'gaze_zone.dart';

/// Resolves UI zone label from raw native gaze and optional L/R calibration samples.
///
/// When both [measuredLeft] and [measuredRight] are valid, uses [getGazeZone] on
/// normalized \([0,1]\) gaze. Otherwise falls back to raw [getZone] deadband.
String resolveZoneFromGaze({
  required double rawGazeX,
  double? measuredLeft,
  double? measuredRight,
}) {
  if (!rawGazeX.isFinite) return 'CENTER';
  if (measuredLeft != null &&
      measuredRight != null &&
      measuredRight > measuredLeft &&
      measuredLeft.isFinite &&
      measuredRight.isFinite) {
    final span = measuredRight - measuredLeft;
    final normalized = ((rawGazeX - measuredLeft) / span).clamp(0.0, 1.0);
    return getGazeZone(normalized);
  }
  return getZone(rawGazeX);
}

/// Normalized screen pointer X in \([0,1]\) from raw gaze (matches pointer controller baseline).
double gazeRawToPointerNormalizedX(double rawGazeX) {
  if (!rawGazeX.isFinite) return 0.5;
  return ((rawGazeX - 0.09) * 10 + 0.5).clamp(0.0, 1.0);
}
