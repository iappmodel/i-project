/// High-level engagement inferred from EAR fatigue and gaze stability.
enum UserEngagementState {
  attentive,
  zoningOut,
}

/// Mean-EAR fatigue above this with [gazeStable] ⇒ [UserEngagementState.zoningOut].
const double zoningOutFatigueThreshold = 0.06;

/// If [fatigueLevel] is null, returns [UserEngagementState.attentive].
UserEngagementState deriveUserEngagementState({
  required double? fatigueLevel,
  required bool gazeStable,
}) {
  if (fatigueLevel != null &&
      fatigueLevel > zoningOutFatigueThreshold &&
      gazeStable) {
    return UserEngagementState.zoningOut;
  }
  return UserEngagementState.attentive;
}

/// Stable wire string for logs / analytics (`zoning_out`, `attentive`).
String userEngagementStateWire(UserEngagementState s) => switch (s) {
      UserEngagementState.attentive => 'attentive',
      UserEngagementState.zoningOut => 'zoning_out',
    };
