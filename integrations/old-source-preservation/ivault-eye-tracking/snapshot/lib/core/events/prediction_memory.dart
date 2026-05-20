import 'predicted_intent.dart';

/// Stores whether a predicted intent later matched observed behavior.
final class PredictionMemory {
  const PredictionMemory({
    required this.predicted,
    required this.matched,
  });

  final PredictedIntent predicted;
  final bool matched;
}
