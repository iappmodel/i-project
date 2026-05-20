/// Tunable weights for adaptive UI evolution (layout, scale, ordering, dwell).
class UIEvolutionState {
  /// Influence of layout shifts on evolution decisions.
  double positionWeight;

  /// Influence of element scaling on evolution decisions.
  double sizeWeight;

  /// Influence of ordering / priority changes on evolution decisions.
  double priorityWeight;

  /// How strongly dwell timing affects interaction thresholds and promotions.
  double dwellSensitivity;

  UIEvolutionState({
    this.positionWeight = 1.0,
    this.sizeWeight = 1.0,
    this.priorityWeight = 1.0,
    this.dwellSensitivity = 1.0,
  });
}

/// Keeps evolved layout/size/priority weights in a narrow band so the UI stays recognizable.
double clampEvolutionWeight(double weight) =>
    weight.clamp(0.8, 1.2); // keep UI recognizable

void decay(UIEvolutionState s) {
  s.positionWeight *= 0.999;
  s.sizeWeight *= 0.999;
  s.priorityWeight *= 0.999;
  s.positionWeight = clampEvolutionWeight(s.positionWeight);
  s.sizeWeight = clampEvolutionWeight(s.sizeWeight);
  s.priorityWeight = clampEvolutionWeight(s.priorityWeight);
}
