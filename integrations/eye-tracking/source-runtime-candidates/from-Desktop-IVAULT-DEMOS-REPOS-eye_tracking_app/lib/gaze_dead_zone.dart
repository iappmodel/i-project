/// Smooth dead zone for gaze components: zero inside `threshold`, linear remap outside.
///
/// Assumes inputs are roughly on a \([-1, 1]\)-style scale when using the outer rescale
/// \((|v| - threshold) / (1 - threshold)\).
double applyDeadZone(double v, double threshold) {
  if (threshold <= 0) return v;
  if (v.abs() < threshold) return 0.0;
  if (threshold >= 1) {
    final sign = v.sign;
    return sign * (v.abs() - threshold);
  }
  final sign = v.sign;
  return sign * ((v.abs() - threshold) / (1 - threshold));
}

/// Default threshold for post-EMA gaze (matches common “small noise near center” tuning).
const double kGazeDeadZoneThreshold = 0.05;
