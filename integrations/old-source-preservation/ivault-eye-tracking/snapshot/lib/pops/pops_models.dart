import 'package:eye_tracking_app/core/events/presence_event.dart';

/// Session-level state of the current P.O.P.S moment.
enum PopsSessionState {
  initializing,
  tracking,
  paused,
  reverificationRequired,
  completed,
  denied,
}

/// Normalized signal snapshot (0..1 for rhythm/continuity signals where possible).
final class PopsSignalSnapshot {
  const PopsSignalSnapshot({
    required this.screenActive,
    required this.inForeground,
    required this.contentProgressRatio,
    required this.touchRhythmScore,
    required this.scrollRhythmScore,
    required this.pauseResumeScore,
    required this.deviceMotionScore,
    required this.orientationStable,
    this.visualPresenceScore,
    this.ambienceScore,
    required this.deviceIntegrityScore,
    required this.accountContinuityScore,
    required this.campaignRequirementScore,
    required this.trustTierScore,
    required this.eligibilityScore,
  });

  final bool screenActive;
  final bool inForeground;
  final double contentProgressRatio;
  final double touchRhythmScore;
  final double scrollRhythmScore;
  final double pauseResumeScore;
  final double deviceMotionScore;
  final bool orientationStable;
  final double? visualPresenceScore;
  final double? ambienceScore;
  final double deviceIntegrityScore;
  final double accountContinuityScore;
  final double campaignRequirementScore;
  final double trustTierScore;
  final double eligibilityScore;
}

/// Request context for one "moment" verification pass.
final class PopsVerificationRequest {
  const PopsVerificationRequest({
    required this.verificationId,
    required this.userId,
    required this.sessionId,
    required this.momentType,
    required this.proofLevel,
    required this.signals,
    required this.createdAt,
  });

  final String verificationId;
  final String userId;
  final String sessionId;
  final String momentType;
  final PresenceProofLevel proofLevel;
  final PopsSignalSnapshot signals;
  final DateTime createdAt;
}

/// Structured confidence output from the scoring service.
final class PopsVerificationScore {
  const PopsVerificationScore({
    required this.presenceConfidence,
    required this.attentionConfidence,
    required this.intentConfidence,
    required this.continuityConfidence,
    required this.fraudRisk,
  });

  final double presenceConfidence;
  final double attentionConfidence;
  final double intentConfidence;
  final double continuityConfidence;
  final double fraudRisk;
}

/// Canonical stage-1 P.O.P.S decision output.
final class PopsDecisionResult {
  const PopsDecisionResult({
    required this.decisionType,
    required this.sessionState,
    required this.rewardEligibility,
    required this.trustImpact,
    required this.recommendedAction,
  });

  final PresenceDecisionType decisionType;
  final PopsSessionState sessionState;
  final bool rewardEligibility;
  final double trustImpact;
  final String recommendedAction;
}

/// User-visible privacy receipt for money/trust/eligibility impacting moments.
final class PopsPrivacyReceipt {
  const PopsPrivacyReceipt({
    required this.receiptId,
    required this.verificationId,
    required this.userId,
    required this.sessionId,
    required this.createdAtIso,
    required this.usedSignalKinds,
    required this.storedFields,
    required this.discardedRawSignals,
  });

  final String receiptId;
  final String verificationId;
  final String userId;
  final String sessionId;
  final String createdAtIso;
  final List<String> usedSignalKinds;
  final List<String> storedFields;
  final bool discardedRawSignals;
}
