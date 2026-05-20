import '../intent_influence_pipeline.dart';
import 'evolution_signal.dart';

/// Per-[EvolutionSignal.elementId] history, trimmed oldest when over capacity.
class EvolutionSignalBuffer {
  final Map<String, List<EvolutionSignal>> _byElement =
      <String, List<EvolutionSignal>>{};

  static const int maxPerElement = 512;

  List<EvolutionSignal> signalsFor(String elementId) =>
      List<EvolutionSignal>.unmodifiable(
        _byElement[elementId] ?? const <EvolutionSignal>[],
      );

  void _add(EvolutionSignal signal) {
    final list =
        _byElement.putIfAbsent(signal.elementId, () => <EvolutionSignal>[]);
    list.add(signal);
    while (list.length > maxPerElement) {
      list.removeAt(0);
    }
  }
}

/// Appends a signal only when [influence.zoneBias]\[[elementId]\] exists and exceeds [biasThreshold].
void recordEvolutionSignal(
  IntentInfluence influence,
  EvolutionSignalBuffer buffer, {
  required String elementId,
  required double influenceStrength,
  required bool success,
  required double dwellTime,
  required int timestamp,
  double biasThreshold = 0.6,
}) {
  final double? bias = influence.zoneBias[elementId];
  if (bias == null || bias <= biasThreshold) return;
  buffer._add(
    EvolutionSignal(
      elementId: elementId,
      influenceStrength: influenceStrength,
      success: success,
      dwellTime: dwellTime,
      timestamp: timestamp,
    ),
  );
}
