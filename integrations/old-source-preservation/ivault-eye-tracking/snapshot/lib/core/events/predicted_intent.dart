/// Predicted user action inferred from recent gaze interaction patterns.
final class PredictedIntent {
  const PredictedIntent({
    required this.actionType,
    required this.targetZone,
    required this.probability,
    required this.horizonMs,
  });

  /// Action label such as "tap", "scroll", or "open".
  final String actionType;

  final String targetZone;

  /// Confidence in [0..1] for this predicted intent.
  final double probability;

  /// Prediction horizon in milliseconds.
  final int horizonMs;
}
