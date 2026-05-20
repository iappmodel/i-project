import 'behavior_profile.dart';
import 'collective_stats.dart';

/// Behavioral cohort for tailored priors (not one-size-fits-all norms).
enum UserType {
  /// High gaze stability; prefer smoother blending.
  stable,

  /// Noisy or hesitant gaze; dwell/smoothing priors reflect more tolerance.
  shaky,

  /// Short typical dwell; faster commit priors.
  fast,

  /// Long typical dwell; slower, deliberate priors.
  slow,
}

/// Observable aggregates used for [classify] (mirrors [BehaviorProfile] rolling means).
class UserModel {
  final double avgStability;
  final double avgDwell;

  const UserModel({
    required this.avgStability,
    required this.avgDwell,
  });

  factory UserModel.fromBehavior(BehaviorProfile b) {
    return UserModel(
      avgStability: b.gazeStabilityIndex,
      avgDwell: b.avgDwellMs,
    );
  }
}

/// Decision order: stable → fast → slow → shaky (mutually exclusive).
UserType classify(UserModel u) {
  if (u.avgStability > 0.7) return UserType.stable;
  if (u.avgDwell < 400) return UserType.fast;
  if (u.avgDwell > 900) return UserType.slow;
  return UserType.shaky;
}

/// Cohort priors for [LearningEngine.applyCollective] instead of a single global prior.
///
/// Values sit in the same units as [CollectiveStats] / [LearningEngine] clamps
/// (dwell ms ~300–1200, stability-scale inputs for smoothing α ~0.05–0.4).
class ClusterPriors {
  ClusterPriors._();

  static CollectiveStats clusterStats(UserType type) {
    switch (type) {
      case UserType.stable:
        return const CollectiveStats(
          avgDwell: 650,
          avgStability: 0.28,
          avgConfidence: 0.75,
          blinkSuccessRate: 0.82,
        );
      case UserType.fast:
        return const CollectiveStats(
          avgDwell: 420,
          avgStability: 0.22,
          avgConfidence: 0.68,
          blinkSuccessRate: 0.74,
        );
      case UserType.slow:
        return const CollectiveStats(
          avgDwell: 980,
          avgStability: 0.2,
          avgConfidence: 0.72,
          blinkSuccessRate: 0.78,
        );
      case UserType.shaky:
        return const CollectiveStats(
          avgDwell: 720,
          avgStability: 0.14,
          avgConfidence: 0.55,
          blinkSuccessRate: 0.65,
        );
    }
  }

  /// Convenience: classify from live [BehaviorProfile] then return that cohort’s priors.
  static CollectiveStats priorsForBehavior(BehaviorProfile b) {
    return clusterStats(classify(UserModel.fromBehavior(b)));
  }
}
