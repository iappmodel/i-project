/// One observation used to evolve UI (which element, outcome, timing).
final class EvolutionSignal {
  const EvolutionSignal({
    required this.elementId,
    required this.influenceStrength,
    required this.success,
    required this.dwellTime,
    required this.timestamp,
  });

  final String elementId;

  /// How strongly this signal should affect evolution [0..1] or unbounded per product rules.
  final double influenceStrength;

  final bool success;

  /// Dwell duration in milliseconds (or seconds if callers agree on a convention).
  final double dwellTime;

  /// Event time, typically epoch milliseconds.
  final int timestamp;
}

/// True when [signals] has at least 20 entries and success rate exceeds 70%.
bool isStableSignal(List<EvolutionSignal> signals) {
  if (signals.length < 20) return false;

  final successRate =
      signals.where((s) => s.success).length / signals.length;

  return successRate > 0.7;
}
