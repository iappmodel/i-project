import 'dart:math' as math;

/// Weight on the new sample in the open-eye baseline EMA
/// `baseline ← (1 - α)·baseline + α·current` ([advanceOpenEarBaselineChannel]).
const double openEarBaselineEmaAlpha = 0.01;

/// One channel: [baseline] and [sample] must be finite; [baseline] is assumed > 0 from calibration.
double advanceOpenEarBaselineChannel(double baseline, double sample) {
  final a = openEarBaselineEmaAlpha;
  return (1 - a) * baseline + a * sample;
}

/// Mean-EAR residual vs slow baseline: [baselineEarMean] − [currentEarMean].
/// Positive when current EAR is **below** baseline (e.g. squint, partial closure, blink).
double earFatigueLevel(double baselineEarMean, double currentEarMean) =>
    baselineEarMean - currentEarMean;

/// First “closing” threshold on raw **mean** EAR: [dynamicEarCloseThreshold] = `baseline × 0.7`.
const double rawDynamicCloseFraction = 0.7;

/// Reopen hysteresis band (must stay **above** [rawDynamicCloseFraction] on the same scale).
const double rawDynamicOpenFraction = 0.9;

/// Floor for fully [closed] vs [BlinkDetector.rawMinThreshold] (0.05), also scaled by baseline.
const double rawDynamicMinFraction = 0.35;

/// `baselineEAR × 0.7` — raw mean EAR below this starts a closing phase ([BlinkDetector]).
double dynamicEarCloseThreshold(double baselineEarMean) =>
    baselineEarMean * rawDynamicCloseFraction;

/// Raw mean EAR hysteresis from mean open baseline [baselineMean] (per-eye calibration → mean).
/// Returns `closeTh` / `minTh` / `openTh` with `minTh < closeTh < openTh` when [baselineMean] is positive.
({double closeTh, double minTh, double openTh}) rawMeanEarDynamicThresholds(
  double baselineMean,
) {
  const floor = 0.05;
  var closeTh = dynamicEarCloseThreshold(baselineMean);
  var minTh = math.min(floor, baselineMean * rawDynamicMinFraction);
  var openTh = baselineMean * rawDynamicOpenFraction;
  if (openTh <= closeTh) {
    openTh = closeTh + 1e-3;
  }
  if (minTh >= closeTh) {
    minTh = closeTh * 0.4;
  }
  return (closeTh: closeTh, minTh: minTh, openTh: openTh);
}

/// Running average of left / right EAR while the user holds eyes **open** (fixed frame count).
final class OpenEarCalibrator {
  OpenEarCalibrator({this.sampleCount = 30});

  final int sampleCount;

  int _frames = 0;
  double _sumL = 0;
  double _sumR = 0;

  void start() {
    _frames = 0;
    _sumL = 0;
    _sumR = 0;
  }

  /// One frame with both EARs valid. Returns `(leftOpenEAR, rightOpenEAR)` when [sampleCount] reached.
  (double, double)? addFrame(double? leftEar, double? rightEar) {
    if (leftEar == null || rightEar == null) return null;
    _sumL += leftEar;
    _sumR += rightEar;
    _frames++;
    if (_frames >= sampleCount) {
      return (_sumL / _frames, _sumR / _frames);
    }
    return null;
  }

  int get framesCollected => _frames;
}
