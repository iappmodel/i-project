import 'dart:math';
import 'dart:ui';

class GazeFilter {
  double _smoothX = 0;
  double _smoothY = 0;
  bool _initialized = false;

  final List<double> _historyX = <double>[];
  final List<double> _historyY = <double>[];

  final int windowSize;
  final double alpha;

  GazeFilter({
    this.windowSize = 8,
    this.alpha = 0.22,
  });

  double computeAlpha(double stability) {
    return (0.1 + stability * 0.3).clamp(0.1, 0.4);
  }

  Offset update(
    double rawX,
    double rawY, {
    double? stabilityScore,
  }) {
    if (!_initialized) {
      _smoothX = rawX;
      _smoothY = rawY;
      _initialized = true;
    } else {
      final dynamicAlpha = stabilityScore != null
          ? computeAlpha(stabilityScore)
          : alpha;
      _smoothX = (_smoothX * (1 - dynamicAlpha)) + (rawX * dynamicAlpha);
      _smoothY = (_smoothY * (1 - dynamicAlpha)) + (rawY * dynamicAlpha);
    }

    _historyX.add(_smoothX);
    _historyY.add(_smoothY);

    if (_historyX.length > windowSize) _historyX.removeAt(0);
    if (_historyY.length > windowSize) _historyY.removeAt(0);

    return Offset(_smoothX, _smoothY);
  }

  double varianceX() => _variance(_historyX);
  double varianceY() => _variance(_historyY);

  bool get hasEnoughSamples =>
      _historyX.length >= 4 && _historyY.length >= 4;

  void reset() {
    _historyX.clear();
    _historyY.clear();
    _initialized = false;
  }

  double _variance(List<double> values) {
    if (values.isEmpty) return double.infinity;

    final mean = values.reduce((a, b) => a + b) / values.length;

    double sum = 0;
    for (final v in values) {
      sum += pow(v - mean, 2);
    }

    return sum / values.length;
  }
}

/// EMA window used by [GazePipeline] (`alpha` maps to stability-driven smoothing in [GazeFilter]).
final class GazeFilterStack {
  final GazeFilter _filter = GazeFilter();

  (double, double) update(double x, double y, {double? alpha}) {
    final o = _filter.update(x, y, stabilityScore: alpha);
    return (o.dx, o.dy);
  }

  double varianceX() => _filter.varianceX();

  double varianceY() => _filter.varianceY();

  void reset() => _filter.reset();
}
