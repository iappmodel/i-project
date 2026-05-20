// Product telemetry catalog — P.O.P.S (Proof Of Presence System) stage 1.
// Local event types + EventBus transport only.

/// Stable wire names for presence-domain events.
abstract final class PresenceEventWire {
  static const verificationScored = 'presence.verification.scored';
  static const decisionProduced = 'presence.decision.produced';
  static const privacyReceiptCreated = 'presence.privacy_receipt.created';
}

/// Proof levels define the verification strictness for a specific "moment".
enum PresenceProofLevel {
  level0('level_0'),
  level1('level_1'),
  level2('level_2'),
  level3('level_3'),
  level4('level_4'),
  level5('level_5');

  const PresenceProofLevel(this.wireValue);
  final String wireValue;
}

/// Decision output kinds produced by the P.O.P.S decision engine.
enum PresenceDecisionType {
  continueTracking('continue_tracking'),
  rewardProgress('reward_progress'),
  pauseVerification('pause_verification'),
  degradeConfidence('degrade_confidence'),
  requireInteraction('require_interaction'),
  requireReverification('require_reverification'),
  holdReward('hold_reward'),
  approveReward('approve_reward'),
  partiallyApproveReward('partially_approve_reward'),
  denyReward('deny_reward'),
  flagFraud('flag_fraud'),
  updateTrustPositive('update_trust_positive'),
  updateTrustNegative('update_trust_negative'),
  createPrivacyReceipt('create_privacy_receipt');

  const PresenceDecisionType(this.wireValue);
  final String wireValue;
}

/// Base type for P.O.P.S events emitted on EventBus.
sealed class PresenceEvent {
  const PresenceEvent();
}

/// Wire: `presence.verification.scored`
final class PresenceVerificationScoredEvent extends PresenceEvent {
  const PresenceVerificationScoredEvent({
    required this.verificationId,
    required this.userId,
    required this.sessionId,
    required this.proofLevel,
    required this.momentType,
    required this.presenceConfidence,
    required this.attentionConfidence,
    required this.intentConfidence,
    required this.continuityConfidence,
    required this.fraudRisk,
    required this.createdAt,
  });

  final String verificationId;
  final String userId;
  final String sessionId;
  final PresenceProofLevel proofLevel;
  final String momentType;
  final double presenceConfidence;
  final double attentionConfidence;
  final double intentConfidence;
  final double continuityConfidence;
  final double fraudRisk;
  final String createdAt;
}

/// Wire: `presence.decision.produced`
final class PresenceDecisionProducedEvent extends PresenceEvent {
  const PresenceDecisionProducedEvent({
    required this.verificationId,
    required this.userId,
    required this.sessionId,
    required this.decisionType,
    required this.rewardEligible,
    required this.trustImpactDelta,
    required this.createdAt,
  });

  final String verificationId;
  final String userId;
  final String sessionId;
  final PresenceDecisionType decisionType;
  final bool rewardEligible;
  final double trustImpactDelta;
  final String createdAt;
}

/// Wire: `presence.privacy_receipt.created`
final class PresencePrivacyReceiptCreatedEvent extends PresenceEvent {
  const PresencePrivacyReceiptCreatedEvent({
    required this.receiptId,
    required this.verificationId,
    required this.userId,
    required this.sessionId,
    required this.createdAt,
  });

  final String receiptId;
  final String verificationId;
  final String userId;
  final String sessionId;
  final String createdAt;
}
