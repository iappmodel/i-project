import 'evolution_signal.dart';
import 'ui_evolution_state.dart';

class UIEvolutionEngine {
  final Map<String, UIEvolutionState> state = <String, UIEvolutionState>{};

  void update(String elementId, List<EvolutionSignal> signals) {
    if (!isStableSignal(signals)) return;

    final UIEvolutionState current = state[elementId] ?? UIEvolutionState();

    final double avgInfluence = _avg(signals.map((s) => s.influenceStrength));
    final double avgDwell = _avg(signals.map((s) => s.dwellTime));

    state[elementId] = UIEvolutionState()
      ..positionWeight = _adjust(current.positionWeight, avgInfluence)
      ..sizeWeight = _adjust(current.sizeWeight, avgInfluence)
      ..priorityWeight = _adjust(current.priorityWeight, avgInfluence)
      ..dwellSensitivity = _adjust(current.dwellSensitivity, avgDwell);
  }

  /// Sorts [elements] in place: higher [UIEvolutionState.priorityWeight] first
  /// (missing ids default to `1.0`).
  void sortElementsByPriority<T>(List<T> elements, String Function(T element) idOf) {
    elements.sort((T a, T b) {
      final double wa = state[idOf(a)]?.priorityWeight ?? 1.0;
      final double wb = state[idOf(b)]?.priorityWeight ?? 1.0;
      return wb.compareTo(wa);
    });
  }

  double _adjust(double current, double signal) {
    final double next = current + 0.05 * (signal - current);
    return clampEvolutionWeight(next);
  }

  double _avg(Iterable<double> values) =>
      values.reduce((a, b) => a + b) / values.length;
}
