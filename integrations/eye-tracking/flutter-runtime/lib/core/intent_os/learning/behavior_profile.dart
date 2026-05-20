/// Rolling or session-level observed gaze and interaction metrics.
///
/// Complements [UserProfile], which stores tunable thresholds and policy
/// parameters rather than descriptive statistics.
class BehaviorProfile {
  double avgFixationMs;
  double avgDwellMs;
  double blinkRatePerMin;

  /// How stable the user is over time (0–1 or project-specific scale).
  double gazeStabilityIndex;

  /// How quickly they act after focus (0–1 or project-specific scale).
  double interactionSpeed;

  /// Trust in local policy for autonomy / safety blending, \([0,1]\).
  /// Feeds [KernelEvaluationInput.autonomyLevel] (currently tracks [interactionSpeed]).
  double get userTrustScore => interactionSpeed.clamp(0.0, 1.0);

  int totalSessions;
  int totalSelections;

  BehaviorProfile({
    this.avgFixationMs = 250,
    this.avgDwellMs = 800,
    this.blinkRatePerMin = 15,
    this.gazeStabilityIndex = 0.5,
    this.interactionSpeed = 0.5,
    this.totalSessions = 0,
    this.totalSelections = 0,
  });
}

/// EMA toward new samples (α = 0.05) for fixation, dwell, and stability.
void updateBehavior(
  BehaviorProfile profile, {
  required double fixation,
  required double dwell,
  required double stability,
}) {
  profile.avgFixationMs =
      profile.avgFixationMs * 0.95 + fixation * 0.05;

  profile.avgDwellMs =
      profile.avgDwellMs * 0.95 + dwell * 0.05;

  profile.gazeStabilityIndex =
      profile.gazeStabilityIndex * 0.95 + stability * 0.05;
}
