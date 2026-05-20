/// Aggregated gaze metrics across many sessions or users (e.g. analytics / twin).
///
/// Contrasts with [BehaviorProfile], which holds EMA-updated single-user behavior.
///
/// Default prior for [LearningEngine.applyCollective] until a server-backed cohort
/// feed exists.
const CollectiveStats kCollectivePriorHints = CollectiveStats(
  avgDwell: 720,
  avgStability: 0.26,
  avgConfidence: 0.74,
  blinkSuccessRate: 0.55,
);

class CollectiveStats {
  final double avgDwell;
  final double avgStability;
  final double avgConfidence;

  /// Per [GazeZone]-style key: fraction of time or selections in that zone (0–1).
  final Map<String, double> zoneHitRate;

  /// Per-zone accumulated or mean dwell (project-defined units, often ms).
  final Map<String, double> zoneDwellTime;

  /// Successful blink-triggered actions / eligible blink intents (0–1).
  final double blinkSuccessRate;

  const CollectiveStats({
    this.avgDwell = 0,
    this.avgStability = 0,
    this.avgConfidence = 0,
    Map<String, double>? zoneHitRate,
    Map<String, double>? zoneDwellTime,
    this.blinkSuccessRate = 0,
  })  : zoneHitRate = zoneHitRate ?? const {},
        zoneDwellTime = zoneDwellTime ?? const {};
}
