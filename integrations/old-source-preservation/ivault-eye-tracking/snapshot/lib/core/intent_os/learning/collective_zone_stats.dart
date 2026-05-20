/// Aggregated zone selection frequencies (Laplace-smoothed) for **zone intelligence**:
/// biasing intent, shortening dwell on popular targets, preloading UI, and soft selection assist.
class CollectiveZoneStats {
  CollectiveZoneStats();

  static const List<String> kZones = <String>['LEFT', 'CENTER', 'RIGHT'];

  /// Laplace prior counts per zone (updated on each committed selection).
  final Map<String, double> _counts = <String, double>{
    for (final z in kZones) z: 1.0,
  };

  /// Hit-rate style map (sums to 1); useful for debugging / telemetry.
  Map<String, double> get zoneHitRates {
    final s = _sumCounts;
    return {for (final z in kZones) z: _counts[z]! / s};
  }

  double get _sumCounts =>
      kZones.map((z) => _counts[z]!).fold(0.0, (a, b) => a + b);

  void recordSelection(String zone) {
    if (!kZones.contains(zone)) return;
    _counts[zone] = _counts[zone]! + 1.0;
  }

  Map<String, double> _probs() {
    final s = _sumCounts;
    return {for (final z in kZones) z: _counts[z]! / s};
  }

  /// Slightly shortens dwell for zones that users select often (collective prior).
  double dwellMultiplierFor(String zone) {
    if (!kZones.contains(zone)) return 1.0;
    final p = _probs()[zone]!;
    const uniform = 1.0 / 3.0;
    final excess = ((p - uniform) / (1.0 - uniform)).clamp(0.0, 1.0);
    return 1.0 - 0.12 * excess;
  }

  /// 0–1 boost for [IntentEngine] `select` channel when gaze band aligns with a popular zone.
  double intentSelectBoost(String? gazeBand) {
    if (gazeBand == null || !kZones.contains(gazeBand)) return 0.0;
    final p = _probs()[gazeBand]!;
    const uniform = 1.0 / 3.0;
    return ((p - uniform) / (2.0 / 3.0)).clamp(0.0, 1.0);
  }

  /// Blends live gaze band with collective popularity (higher [collectiveWeight] → more prior).
  ///
  /// Example: if everyone hits `CENTER`, this drifts toward `CENTER` unless gaze strongly disagrees.
  String predictLikelyZone(
    String gazeBand, {
    double collectiveWeight = 0.22,
  }) {
    if (!kZones.contains(gazeBand)) return gazeBand;
    final rates = _probs();
    final w = collectiveWeight.clamp(0.0, 1.0);
    String best = gazeBand;
    var bestScore = -1.0;
    for (final z in kZones) {
      final gazePart = z == gazeBand ? 1.0 : 0.0;
      final score = (1.0 - w) * gazePart + w * (rates[z] ?? 1.0 / 3.0);
      if (score > bestScore) {
        bestScore = score;
        best = z;
      }
    }
    return best;
  }
}
