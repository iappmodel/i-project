/// Drift-adjusted raw gaze from native face output + profile drift.
///
/// Matches [main.dart] `_updateFrame` gaze prep prior to null/finite early
/// returns: each non-null raw axis gets [calibrationDrift] added (same as
/// `adjustedX` / `adjustedY` there).
final class DriftAdjustedGaze {
  const DriftAdjustedGaze({
    required this.rawX,
    required this.rawY,
    required this.hasFiniteRawGaze,
  });

  final double? rawX;
  final double? rawY;
  final bool hasFiniteRawGaze;
}

DriftAdjustedGaze resolveDriftAdjustedGaze({
  required double? gazeXRaw,
  required double? gazeYRaw,
  required double calibrationDrift,
}) {
  final adjustedX = (gazeXRaw ?? 0.0) + calibrationDrift;
  final adjustedY = (gazeYRaw ?? 0.0) + calibrationDrift;
  final effectiveGazeX = gazeXRaw != null ? adjustedX : null;
  final effectiveGazeY = gazeYRaw != null ? adjustedY : null;
  final rawX = effectiveGazeX;
  final rawY = effectiveGazeY;
  final hasFiniteRawGaze =
      rawX != null && rawY != null && rawX.isFinite && rawY.isFinite;
  return DriftAdjustedGaze(
    rawX: rawX,
    rawY: rawY,
    hasFiniteRawGaze: hasFiniteRawGaze,
  );
}
