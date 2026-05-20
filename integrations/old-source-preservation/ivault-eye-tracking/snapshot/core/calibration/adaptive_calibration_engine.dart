import 'dart:ui';

class AdaptiveCalibrationEngine {
  final List<MapEntry<List<double>, Offset>> samples = [];

  void addSample(List<double> features, Offset position) {
    samples.add(MapEntry(features, position));
  }

  Offset predict(List<double> features) {
    if (samples.isEmpty) return const Offset(0.5, 0.5);

    // Simple nearest-neighbor baseline (upgrade later).
    MapEntry<List<double>, Offset>? best;
    double bestDist = double.infinity;

    for (final s in samples) {
      final d = _distance(features, s.key);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }

    return best?.value ?? const Offset(0.5, 0.5);
  }

  double _distance(List<double> a, List<double> b) {
    double sum = 0;
    for (int i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) * (a[i] - b[i]);
    }
    return sum;
  }
}
