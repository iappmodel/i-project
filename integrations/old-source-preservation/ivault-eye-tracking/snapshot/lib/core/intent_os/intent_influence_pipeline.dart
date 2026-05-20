import 'learning/collective_zone_stats.dart';

/// Classifier / prior output: predicted zone and confidence in \[0, 1\].
class IntentPrediction {
  const IntentPrediction({
    required this.zone,
    required this.probability,
  });

  final String zone;
  final double probability;
}

/// Whether intent is strong enough to treat as an implicit confirm / commit signal.
bool shouldConfirm(IntentPrediction p) => p.probability > 0.9;

/// Per-zone bias: predicted zone gets [weight]; others use [CollectiveZoneStats.zoneHitRates].
Map<String, double> zoneBiasForPredictedZone({
  required String predictedZone,
  required double weight,
  required CollectiveZoneStats stats,
}) {
  final rates = stats.zoneHitRates;
  return <String, double>{
    for (final z in CollectiveZoneStats.kZones)
      z: z == predictedZone ? weight : (rates[z] ?? 1.0 / 3.0),
  };
}

/// UI influence derived from [IntentInfluenceEngine] — presentation only.
class IntentInfluence {
  IntentInfluence({
    required this.zone,
    required this.weight,
    Map<String, double>? zoneBias,
  }) : zoneBias = zoneBias ?? const <String, double>{};

  final String zone;

  /// 0 → no influence, 1 → max (maps from prediction confidence above gate).
  final double weight;

  /// Per-element (e.g. zone id) bias in \[0, 1\] for evolution / prioritization hooks.
  final Map<String, double> zoneBias;
}

/// Maps [IntentPrediction] to a bounded influence signal (threshold + linear ramp).
class IntentInfluenceEngine {
  IntentInfluence? compute(
    IntentPrediction? prediction, {
    CollectiveZoneStats? collective,
  }) {
    if (prediction == null) return null;

    if (prediction.probability < 0.6) return null;

    final weight = ((prediction.probability - 0.6) / 0.4).clamp(0.0, 1.0);

    final Map<String, double> bias = collective == null
        ? const <String, double>{}
        : zoneBiasForPredictedZone(
            predictedZone: prediction.zone,
            weight: weight,
            stats: collective,
          );

    return IntentInfluence(
      zone: prediction.zone,
      weight: weight,
      zoneBias: bias,
    );
  }
}

/// Builds a prediction from live gaze band + collective zone prior (no ML).
///
/// [probability] rises with [CollectiveZoneStats.intentSelectBoost] so popular aligned
/// zones yield stronger influence after [IntentInfluenceEngine.compute].
IntentPrediction? intentPredictionFromGazeBand(
  CollectiveZoneStats stats,
  String gazeBand,
) {
  if (!CollectiveZoneStats.kZones.contains(gazeBand)) return null;
  final likely = stats.predictLikelyZone(gazeBand);
  final boost = stats.intentSelectBoost(gazeBand);
  final probability = (0.6 + 0.4 * boost).clamp(0.0, 1.0);
  return IntentPrediction(zone: likely, probability: probability);
}
