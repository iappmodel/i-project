// [ i ] Canonical Build Spec v0.1 — wire/DTO definitions.
// Source of truth for product semantics: docs/architecture/CANONICAL_BUILD_SPEC_v0.1.md
//
// These types are intentionally separate from heuristic engines in
// `reward_engine.dart`, `trust_engine.dart`, etc. Map at integration boundaries.

/// ISO-8601 instant string (spec: `createdAt: string`).
typedef IsoInstantString = String;

// --- 2.1 Runtime signals ---

final class RuntimeSignalsV01 {
  const RuntimeSignalsV01({
    required this.gazeX,
    required this.gazeY,
    required this.confidence,
    required this.blink,
    required this.timestamp,
    required this.sessionId,
  });

  final double gazeX;
  final double gazeY;
  final double confidence;
  final bool blink;
  final IsoInstantString timestamp;
  final String sessionId;
}

final class ExtendedRuntimeSignalsV01 extends RuntimeSignalsV01 {
  const ExtendedRuntimeSignalsV01({
    required super.gazeX,
    required super.gazeY,
    required super.confidence,
    required super.blink,
    required super.timestamp,
    required super.sessionId,
    required this.facePresent,
    this.headYaw,
    this.headPitch,
    this.headRoll,
    this.eyeAspectRatioLeft,
    this.eyeAspectRatioRight,
    this.frameQuality,
    this.deviceMotionScore,
  });

  final bool facePresent;
  final double? headYaw;
  final double? headPitch;
  final double? headRoll;
  final double? eyeAspectRatioLeft;
  final double? eyeAspectRatioRight;
  final double? frameQuality;
  final double? deviceMotionScore;
}

// --- 2.2 Attention verification ---

final class AttentionVerificationResultV01 {
  const AttentionVerificationResultV01({
    required this.sessionId,
    required this.userId,
    this.campaignId,
    this.contentId,
    required this.passed,
    required this.attentionScore,
    required this.qualityScore,
    required this.fraudSignalScore,
    required this.watchedMs,
    required this.verifiedMs,
    required this.reasonCodes,
    required this.policyVersion,
    required this.modelVersion,
    required this.createdAt,
  });

  final String sessionId;
  final String userId;
  final String? campaignId;
  final String? contentId;
  final bool passed;
  final double attentionScore;
  final double qualityScore;
  final double fraudSignalScore;
  final int watchedMs;
  final int verifiedMs;
  final List<String> reasonCodes;
  final String policyVersion;
  final String modelVersion;
  final IsoInstantString createdAt;
}

// --- 2.2b Attention pipeline events (verified attention; not money events) ---

/// Where the attention session was started (wire: snake_case values).
enum AttentionPlacementV01 { feed, earn, igo, creatorPage, campaignDetail }

extension AttentionPlacementV01Wire on AttentionPlacementV01 {
  String get wireName => switch (this) {
        AttentionPlacementV01.creatorPage => 'creator_page',
        AttentionPlacementV01.campaignDetail => 'campaign_detail',
        _ => name,
      };
}

AttentionPlacementV01? attentionPlacementV01FromWire(String wire) {
  for (final v in AttentionPlacementV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

/// Gaze pipeline health for sampled runtime signals.
enum AttentionTrackingStateV01 { valid, weak, lost }

extension AttentionTrackingStateV01Wire on AttentionTrackingStateV01 {
  String get wireName => name;
}

AttentionTrackingStateV01? attentionTrackingStateV01FromWire(String wire) {
  for (final v in AttentionTrackingStateV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

/// Why an attention session ended without completion.
enum AttentionSessionAbandonReasonV01 {
  userLeft,
  appBackgrounded,
  contentSkipped,
  trackingLost,
  networkFailure,
  unknown,
}

extension AttentionSessionAbandonReasonV01Wire on AttentionSessionAbandonReasonV01 {
  String get wireName => switch (this) {
        AttentionSessionAbandonReasonV01.userLeft => 'user_left',
        AttentionSessionAbandonReasonV01.appBackgrounded => 'app_backgrounded',
        AttentionSessionAbandonReasonV01.contentSkipped => 'content_skipped',
        AttentionSessionAbandonReasonV01.trackingLost => 'tracking_lost',
        AttentionSessionAbandonReasonV01.networkFailure => 'network_failure',
        AttentionSessionAbandonReasonV01.unknown => 'unknown',
      };
}

AttentionSessionAbandonReasonV01? attentionSessionAbandonReasonV01FromWire(String wire) {
  for (final v in AttentionSessionAbandonReasonV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

/// Machine reason when a verification record is rejected.
enum AttentionVerificationRejectedReasonV01 {
  insufficientDuration,
  lowGazeValidity,
  faceNotPresent,
  trackingQualityLow,
  fraudRiskHigh,
  duplicateSession,
  policyFailed,
}

extension AttentionVerificationRejectedReasonV01Wire on AttentionVerificationRejectedReasonV01 {
  String get wireName => switch (this) {
        AttentionVerificationRejectedReasonV01.insufficientDuration =>
          'insufficient_duration',
        AttentionVerificationRejectedReasonV01.lowGazeValidity => 'low_gaze_validity',
        AttentionVerificationRejectedReasonV01.faceNotPresent => 'face_not_present',
        AttentionVerificationRejectedReasonV01.trackingQualityLow =>
          'tracking_quality_low',
        AttentionVerificationRejectedReasonV01.fraudRiskHigh => 'fraud_risk_high',
        AttentionVerificationRejectedReasonV01.duplicateSession => 'duplicate_session',
        AttentionVerificationRejectedReasonV01.policyFailed => 'policy_failed',
      };
}

AttentionVerificationRejectedReasonV01? attentionVerificationRejectedReasonV01FromWire(
  String wire,
) {
  for (final v in AttentionVerificationRejectedReasonV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

/// `attention.session.started` — session opened; not a reward by itself.
final class AttentionSessionStartedPayloadV01 {
  const AttentionSessionStartedPayloadV01({
    required this.sessionId,
    required this.userId,
    required this.contentId,
    this.campaignId,
    required this.placement,
    this.requiredMs,
  });

  final String sessionId;
  final String userId;
  final String contentId;
  final String? campaignId;
  final AttentionPlacementV01 placement;
  final int? requiredMs;

  Map<String, Object?> toPayloadMap() => {
        'sessionId': sessionId,
        'userId': userId,
        'contentId': contentId,
        if (campaignId != null) 'campaignId': campaignId,
        'placement': placement.wireName,
        if (requiredMs != null) 'requiredMs': requiredMs,
      };
}

/// `attention.runtime_signal.sampled` — throttled gaze/face sample (not full-frame history).
final class AttentionRuntimeSignalSampledPayloadV01 {
  const AttentionRuntimeSignalSampledPayloadV01({
    required this.sessionId,
    required this.userId,
    required this.gazeX,
    required this.gazeY,
    required this.confidence,
    required this.blink,
    required this.facePresent,
    required this.trackingState,
    required this.timestampMs,
  });

  final String sessionId;
  final String userId;
  final double gazeX;
  final double gazeY;
  final double confidence;
  final bool blink;
  final bool facePresent;
  final AttentionTrackingStateV01 trackingState;
  final int timestampMs;

  Map<String, Object?> toPayloadMap() => {
        'sessionId': sessionId,
        'userId': userId,
        'gazeX': gazeX,
        'gazeY': gazeY,
        'confidence': confidence,
        'blink': blink,
        'facePresent': facePresent,
        'trackingState': trackingState.wireName,
        'timestampMs': timestampMs,
      };
}

/// `attention.session.completed` — session finished with timing aggregates.
final class AttentionSessionCompletedPayloadV01 {
  const AttentionSessionCompletedPayloadV01({
    required this.sessionId,
    required this.userId,
    required this.contentId,
    this.campaignId,
    required this.startedAt,
    required this.completedAt,
    required this.watchedMs,
    required this.foregroundMs,
    required this.visibleMs,
  });

  final String sessionId;
  final String userId;
  final String contentId;
  final String? campaignId;
  final IsoInstantString startedAt;
  final IsoInstantString completedAt;
  final int watchedMs;
  final int foregroundMs;
  final int visibleMs;

  Map<String, Object?> toPayloadMap() => {
        'sessionId': sessionId,
        'userId': userId,
        'contentId': contentId,
        if (campaignId != null) 'campaignId': campaignId,
        'startedAt': startedAt,
        'completedAt': completedAt,
        'watchedMs': watchedMs,
        'foregroundMs': foregroundMs,
        'visibleMs': visibleMs,
      };
}

/// `attention.session.abandoned` — session ended early with a reason code.
final class AttentionSessionAbandonedPayloadV01 {
  const AttentionSessionAbandonedPayloadV01({
    required this.sessionId,
    required this.userId,
    required this.contentId,
    this.campaignId,
    required this.watchedMs,
    required this.reason,
  });

  final String sessionId;
  final String userId;
  final String contentId;
  final String? campaignId;
  final int watchedMs;
  final AttentionSessionAbandonReasonV01 reason;

  Map<String, Object?> toPayloadMap() => {
        'sessionId': sessionId,
        'userId': userId,
        'contentId': contentId,
        if (campaignId != null) 'campaignId': campaignId,
        'watchedMs': watchedMs,
        'reason': reason.wireName,
      };
}

/// `attention.verification.created` — sealed verification; primary input for reward issuance.
///
/// Scores are 0.0–1.0 on the wire (same convention as [AttentionVerificationResult]).
final class AttentionVerificationCreatedPayloadV01 {
  const AttentionVerificationCreatedPayloadV01({
    required this.verificationId,
    required this.sessionId,
    required this.userId,
    required this.contentId,
    this.campaignId,
    required this.verified,
    required this.attentionScore,
    required this.qualityScore,
    required this.fraudRisk,
    required this.watchedMs,
    required this.verifiedMs,
    required this.requiredMs,
    required this.gazeValidRatio,
    required this.facePresentRatio,
    required this.blinkNaturalnessScore,
    required this.interactionScore,
    required this.policyVersion,
    this.failureReason,
  });

  final String verificationId;
  final String sessionId;
  final String userId;
  final String contentId;
  final String? campaignId;
  final bool verified;
  final double attentionScore;
  final double qualityScore;
  final double fraudRisk;
  final int watchedMs;
  final int verifiedMs;
  final int requiredMs;
  final double gazeValidRatio;
  final double facePresentRatio;
  final double blinkNaturalnessScore;
  final double interactionScore;
  final String policyVersion;
  final String? failureReason;

  Map<String, Object?> toPayloadMap() => {
        'verificationId': verificationId,
        'sessionId': sessionId,
        'userId': userId,
        'contentId': contentId,
        if (campaignId != null) 'campaignId': campaignId,
        'policyVersion': policyVersion,
        'verified': verified,
        'attentionScore': attentionScore,
        'qualityScore': qualityScore,
        'fraudRisk': fraudRisk,
        'watchedMs': watchedMs,
        'verifiedMs': verifiedMs,
        'requiredMs': requiredMs,
        'gazeValidRatio': gazeValidRatio,
        'facePresentRatio': facePresentRatio,
        'blinkNaturalnessScore': blinkNaturalnessScore,
        'interactionScore': interactionScore,
        if (failureReason != null) 'failureReason': failureReason,
      };
}

/// `attention.verification.rejected` — verification failed policy / quality gates.
final class AttentionVerificationRejectedPayloadV01 {
  const AttentionVerificationRejectedPayloadV01({
    required this.verificationId,
    required this.sessionId,
    required this.userId,
    this.campaignId,
    required this.reason,
    required this.policyVersion,
  });

  final String verificationId;
  final String sessionId;
  final String userId;
  final String? campaignId;
  final AttentionVerificationRejectedReasonV01 reason;
  final String policyVersion;

  Map<String, Object?> toPayloadMap() => {
        'verificationId': verificationId,
        'sessionId': sessionId,
        'userId': userId,
        if (campaignId != null) 'campaignId': campaignId,
        'policyVersion': policyVersion,
        'reason': reason.wireName,
      };
}

// --- 2.3 Attention score ---

final class AttentionScoreComponentsV01 {
  const AttentionScoreComponentsV01({
    required this.gazeOnTarget,
    required this.gazeStability,
    required this.faceContinuity,
    required this.blinkNaturalness,
    required this.headPoseValidity,
    required this.durationCompletion,
    required this.frameQuality,
  });

  final double gazeOnTarget;
  final double gazeStability;
  final double faceContinuity;
  final double blinkNaturalness;
  final double headPoseValidity;
  final double durationCompletion;
  final double frameQuality;
}

final class AttentionScoreV01 {
  const AttentionScoreV01({
    required this.value,
    required this.confidence,
    required this.components,
    required this.reasonCodes,
    required this.modelVersion,
  });

  final double value;
  final double confidence;
  final AttentionScoreComponentsV01 components;
  final List<String> reasonCodes;
  final String modelVersion;
}

// --- 2.4 Reward issuance ---

enum RewardIssuanceDecisionKindV01 { issued, held, rejected }

enum SpecCoinTypeV01 { iCoin, vCoin, rCoin, xCoin }

extension SpecCoinTypeV01Wire on SpecCoinTypeV01 {
  String get wireName => switch (this) {
        SpecCoinTypeV01.iCoin => 'iCoin',
        SpecCoinTypeV01.vCoin => 'vCoin',
        SpecCoinTypeV01.rCoin => 'rCoin',
        SpecCoinTypeV01.xCoin => 'xCoin',
      };
}

final class RewardIssuanceDecisionV01 {
  const RewardIssuanceDecisionV01({
    required this.rewardEventId,
    required this.userId,
    required this.campaignId,
    required this.decision,
    required this.amount,
    required this.coinType,
    required this.pendingDurationSeconds,
    required this.reasonCodes,
    required this.policyVersion,
    required this.createdAt,
  });

  final String rewardEventId;
  final String userId;
  final String campaignId;
  final RewardIssuanceDecisionKindV01 decision;
  final double amount;
  final SpecCoinTypeV01 coinType;
  final int pendingDurationSeconds;
  final List<String> reasonCodes;
  final String policyVersion;
  final IsoInstantString createdAt;
}

// --- 2.5 Ledger ---

enum LedgerEntryTypeV01 {
  rewardPendingCredit,
  rewardAvailableCredit,
  conversionDebit,
  conversionCredit,
  payoutDebit,
  paymentDebit,
  tipDebit,
  tipCredit,
  reversalDebit,
  freeze,
  unfreeze,
}

extension LedgerEntryTypeV01Wire on LedgerEntryTypeV01 {
  String get wireName => switch (this) {
        LedgerEntryTypeV01.rewardPendingCredit => 'reward_pending_credit',
        LedgerEntryTypeV01.rewardAvailableCredit => 'reward_available_credit',
        LedgerEntryTypeV01.conversionDebit => 'conversion_debit',
        LedgerEntryTypeV01.conversionCredit => 'conversion_credit',
        LedgerEntryTypeV01.payoutDebit => 'payout_debit',
        LedgerEntryTypeV01.paymentDebit => 'payment_debit',
        LedgerEntryTypeV01.tipDebit => 'tip_debit',
        LedgerEntryTypeV01.tipCredit => 'tip_credit',
        LedgerEntryTypeV01.reversalDebit => 'reversal_debit',
        LedgerEntryTypeV01.freeze => 'freeze',
        LedgerEntryTypeV01.unfreeze => 'unfreeze',
      };
}

enum LedgerEntryStatusV01 { pending, posted, reversed, frozen }

extension LedgerEntryStatusV01Wire on LedgerEntryStatusV01 {
  String get wireName => name;
}

final class LedgerEntryV01 {
  const LedgerEntryV01({
    required this.id,
    required this.walletId,
    required this.userId,
    required this.type,
    required this.coinType,
    required this.amount,
    this.valueLotId,
    required this.referenceType,
    required this.referenceId,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String walletId;
  final String userId;
  final LedgerEntryTypeV01 type;
  final String coinType;
  final double amount;
  final String? valueLotId;
  final String referenceType;
  final String referenceId;
  final LedgerEntryStatusV01 status;
  final IsoInstantString createdAt;
}

// --- 2.6 Value lot ---

enum ValueLotOriginTypeV01 {
  campaignReward,
  creatorRevenue,
  tip,
  conversion,
  adjustment,
}

extension ValueLotOriginTypeV01Wire on ValueLotOriginTypeV01 {
  String get wireName => switch (this) {
        ValueLotOriginTypeV01.campaignReward => 'campaign_reward',
        ValueLotOriginTypeV01.creatorRevenue => 'creator_revenue',
        ValueLotOriginTypeV01.tip => 'tip',
        ValueLotOriginTypeV01.conversion => 'conversion',
        ValueLotOriginTypeV01.adjustment => 'adjustment',
      };
}

enum ValueLotStatusV01 {
  pending,
  available,
  partiallySpent,
  spent,
  withdrawn,
  frozen,
  reversed,
}

extension ValueLotStatusV01Wire on ValueLotStatusV01 {
  String get wireName => switch (this) {
        ValueLotStatusV01.pending => 'pending',
        ValueLotStatusV01.available => 'available',
        ValueLotStatusV01.partiallySpent => 'partially_spent',
        ValueLotStatusV01.spent => 'spent',
        ValueLotStatusV01.withdrawn => 'withdrawn',
        ValueLotStatusV01.frozen => 'frozen',
        ValueLotStatusV01.reversed => 'reversed',
      };
}

final class ValueLotV01 {
  const ValueLotV01({
    required this.id,
    required this.userId,
    required this.walletId,
    required this.originEventId,
    required this.originType,
    this.campaignId,
    required this.coinType,
    required this.originalAmount,
    required this.pendingAmount,
    required this.availableAmount,
    required this.spentAmount,
    required this.withdrawnAmount,
    required this.reversedAmount,
    required this.riskScoreAtIssuance,
    required this.trustScoreAtIssuance,
    required this.unlockTime,
    required this.status,
    required this.policyVersion,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final String walletId;
  final String originEventId;
  final ValueLotOriginTypeV01 originType;
  final String? campaignId;
  final String coinType;
  final double originalAmount;
  final double pendingAmount;
  final double availableAmount;
  final double spentAmount;
  final double withdrawnAmount;
  final double reversedAmount;
  final double riskScoreAtIssuance;
  final double trustScoreAtIssuance;
  final IsoInstantString unlockTime;
  final ValueLotStatusV01 status;
  final String policyVersion;
  final IsoInstantString createdAt;
}

// --- 2.7 Trust ---

enum TrustTierNameV01 { newUser, basic, trusted, verified, elite }

extension TrustTierNameV01Wire on TrustTierNameV01 {
  String get wireName => switch (this) {
        TrustTierNameV01.newUser => 'new',
        TrustTierNameV01.basic => 'basic',
        TrustTierNameV01.trusted => 'trusted',
        TrustTierNameV01.verified => 'verified',
        TrustTierNameV01.elite => 'elite',
      };
}

final class TrustLimitsV01 {
  const TrustLimitsV01({
    required this.dailyEarnLimit,
    required this.dailyWithdrawLimit,
    required this.maxPendingBalance,
    required this.pendingDurationSeconds,
  });

  final double dailyEarnLimit;
  final double dailyWithdrawLimit;
  final double maxPendingBalance;
  final int pendingDurationSeconds;
}

final class TrustStateV01 {
  const TrustStateV01({
    required this.userId,
    required this.score,
    required this.tier,
    required this.limits,
    required this.conversionMultiplier,
    required this.payoutSpeedMultiplier,
    required this.campaignAccessLevel,
    required this.reasonCodes,
    required this.policyVersion,
    required this.updatedAt,
  });

  final String userId;
  final double score;
  final TrustTierNameV01 tier;
  final TrustLimitsV01 limits;
  final double conversionMultiplier;
  final double payoutSpeedMultiplier;
  final int campaignAccessLevel;
  final List<String> reasonCodes;
  final String policyVersion;
  final IsoInstantString updatedAt;
}

final class TrustEventV01 {
  const TrustEventV01({
    required this.id,
    required this.userId,
    required this.delta,
    required this.reasonCode,
    required this.sourceType,
    required this.sourceId,
    required this.policyVersion,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final double delta;
  final String reasonCode;
  final String sourceType;
  final String sourceId;
  final String policyVersion;
  final IsoInstantString createdAt;
}

// --- 2.8 Risk ---

enum RiskActionV01 { allow, hold, limit, freeze, manualReview }

extension RiskActionV01Wire on RiskActionV01 {
  String get wireName => switch (this) {
        RiskActionV01.allow => 'allow',
        RiskActionV01.hold => 'hold',
        RiskActionV01.limit => 'limit',
        RiskActionV01.freeze => 'freeze',
        RiskActionV01.manualReview => 'manual_review',
      };
}

final class RiskDecisionV01 {
  const RiskDecisionV01({
    required this.userId,
    required this.riskScore,
    required this.action,
    required this.reasonCodes,
    required this.policyVersion,
    required this.createdAt,
  });

  final String userId;
  final double riskScore;
  final RiskActionV01 action;
  final List<String> reasonCodes;
  final String policyVersion;
  final IsoInstantString createdAt;
}

// --- 2.9 Campaign ---

enum CampaignStatusV01 {
  draft,
  scheduled,
  active,
  paused,
  budgetExhausted,
  completed,
  underReview,
  archived,
}

extension CampaignStatusV01Wire on CampaignStatusV01 {
  String get wireName => switch (this) {
        CampaignStatusV01.draft => 'draft',
        CampaignStatusV01.scheduled => 'scheduled',
        CampaignStatusV01.active => 'active',
        CampaignStatusV01.paused => 'paused',
        CampaignStatusV01.budgetExhausted => 'budget_exhausted',
        CampaignStatusV01.completed => 'completed',
        CampaignStatusV01.underReview => 'under_review',
        CampaignStatusV01.archived => 'archived',
      };
}

enum CampaignActionTypeV01 {
  watch,
  survey,
  checkIn,
  challenge,
  purchase,
  creatorBoost,
}

extension CampaignActionTypeV01Wire on CampaignActionTypeV01 {
  String get wireName => switch (this) {
        CampaignActionTypeV01.watch => 'watch',
        CampaignActionTypeV01.survey => 'survey',
        CampaignActionTypeV01.checkIn => 'check_in',
        CampaignActionTypeV01.challenge => 'challenge',
        CampaignActionTypeV01.purchase => 'purchase',
        CampaignActionTypeV01.creatorBoost => 'creator_boost',
      };
}

final class CampaignV01 {
  const CampaignV01({
    required this.id,
    required this.brandId,
    required this.status,
    required this.title,
    required this.actionType,
    required this.rewardAmount,
    required this.rewardCoinType,
    required this.minAttentionScore,
    required this.minQualityScore,
    required this.maxFraudSignalScore,
    required this.minVerifiedMs,
    required this.targetingRules,
    required this.budgetId,
    required this.startsAt,
    required this.endsAt,
    required this.policyVersion,
    required this.createdAt,
  });

  final String id;
  final String brandId;
  final CampaignStatusV01 status;
  final String title;
  final CampaignActionTypeV01 actionType;
  final double rewardAmount;
  final String rewardCoinType;
  final double minAttentionScore;
  final double minQualityScore;
  final double maxFraudSignalScore;
  final int minVerifiedMs;
  final Map<String, Object?> targetingRules;
  final String budgetId;
  final IsoInstantString startsAt;
  final IsoInstantString endsAt;
  final String policyVersion;
  final IsoInstantString createdAt;
}

enum CampaignBudgetStatusV01 { active, paused, exhausted, closed }

extension CampaignBudgetStatusV01Wire on CampaignBudgetStatusV01 {
  String get wireName => name;
}

final class CampaignBudgetV01 {
  const CampaignBudgetV01({
    required this.id,
    required this.campaignId,
    required this.allocatedAmount,
    required this.reservedAmount,
    required this.settledAmount,
    required this.releasedAmount,
    required this.fraudHeldAmount,
    required this.refundedAmount,
    required this.dailyCap,
    required this.userCap,
    required this.status,
  });

  final String id;
  final String campaignId;
  final double allocatedAmount;
  final double reservedAmount;
  final double settledAmount;
  final double releasedAmount;
  final double fraudHeldAmount;
  final double refundedAmount;
  final double dailyCap;
  final double userCap;
  final CampaignBudgetStatusV01 status;
}

// --- 2.10 Matching ---

enum MatchEligibilityV01 { eligible, ineligible, limited }

extension MatchEligibilityV01Wire on MatchEligibilityV01 {
  String get wireName => name;
}

final class MatchResultV01 {
  const MatchResultV01({
    required this.userId,
    required this.campaignId,
    required this.score,
    required this.eligibility,
    required this.reasonCodes,
    required this.createdAt,
  });

  final String userId;
  final String campaignId;
  final double score;
  final MatchEligibilityV01 eligibility;
  final List<String> reasonCodes;
  final IsoInstantString createdAt;
}

// --- 2.11 Conversion ---

enum ConversionEventStatusV01 { completed, held, rejected }

extension ConversionEventStatusV01Wire on ConversionEventStatusV01 {
  String get wireName => name;
}

final class ConversionEventV01 {
  const ConversionEventV01({
    required this.id,
    required this.userId,
    required this.fromCoinType,
    required this.toCoinType,
    required this.fromAmount,
    required this.toAmount,
    required this.rate,
    required this.valueLotIds,
    required this.newValueLotId,
    required this.status,
    required this.reasonCodes,
    required this.policyVersion,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final String fromCoinType;
  final String toCoinType;
  final double fromAmount;
  final double toAmount;
  final double rate;
  final List<String> valueLotIds;
  final String newValueLotId;
  final ConversionEventStatusV01 status;
  final List<String> reasonCodes;
  final String policyVersion;
  final IsoInstantString createdAt;
}

// --- 2.12 Payout ---

enum PayoutMethodV01 { bank, card, paypal, crypto, giftCard }

extension PayoutMethodV01Wire on PayoutMethodV01 {
  String get wireName => switch (this) {
        PayoutMethodV01.bank => 'bank',
        PayoutMethodV01.card => 'card',
        PayoutMethodV01.paypal => 'paypal',
        PayoutMethodV01.crypto => 'crypto',
        PayoutMethodV01.giftCard => 'gift_card',
      };
}

enum PayoutRequestStatusV01 {
  requested,
  approved,
  processing,
  paid,
  rejected,
  held,
}

extension PayoutRequestStatusV01Wire on PayoutRequestStatusV01 {
  String get wireName => name;
}

final class PayoutRequestV01 {
  const PayoutRequestV01({
    required this.id,
    required this.userId,
    required this.amount,
    required this.currency,
    required this.valueLotIds,
    required this.method,
    required this.status,
    required this.reasonCodes,
    required this.policyVersion,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final double amount;
  final String currency;
  final List<String> valueLotIds;
  final PayoutMethodV01 method;
  final PayoutRequestStatusV01 status;
  final List<String> reasonCodes;
  final String policyVersion;
  final IsoInstantString createdAt;
}

// --- §4 System events (envelope) + catalog ---

/// Canonical `eventType` wire string (catalog: [CanonicalEventTypesV01] or namespaced `${prefix}*`).
typedef EventTypeV01 = String;

/// Wire values for [SystemEventV01.actorType].
enum CanonicalActorTypeV01 {
  user,
  system,
  admin,
  campaignAgent,
  riskEngine,
}

extension CanonicalActorTypeV01Wire on CanonicalActorTypeV01 {
  String get wireName => switch (this) {
        CanonicalActorTypeV01.campaignAgent => 'campaign_agent',
        CanonicalActorTypeV01.riskEngine => 'risk_engine',
        _ => name,
      };
}

/// Wire values for [SystemEventV01.subjectType] (snake_case on the wire where listed).
enum CanonicalSubjectTypeV01 {
  user,
  device,
  attentionSession,
  attentionResult,
  campaign,
  budgetReservation,
  rewardDecision,
  valueLot,
  ledgerEntry,
  wallet,
  withdrawal,
  conversion,
  trustScore,
  fraudCase,
  adminAction,
  policy,
}

extension CanonicalSubjectTypeV01Wire on CanonicalSubjectTypeV01 {
  String get wireName => switch (this) {
        CanonicalSubjectTypeV01.attentionSession => 'attention_session',
        CanonicalSubjectTypeV01.attentionResult => 'attention_result',
        CanonicalSubjectTypeV01.budgetReservation => 'budget_reservation',
        CanonicalSubjectTypeV01.rewardDecision => 'reward_decision',
        CanonicalSubjectTypeV01.valueLot => 'value_lot',
        CanonicalSubjectTypeV01.ledgerEntry => 'ledger_entry',
        CanonicalSubjectTypeV01.trustScore => 'trust_score',
        CanonicalSubjectTypeV01.fraudCase => 'fraud_case',
        CanonicalSubjectTypeV01.adminAction => 'admin_action',
        _ => name,
      };
}

/// Parses [CanonicalSubjectTypeV01] from canonical wire strings.
CanonicalSubjectTypeV01? canonicalSubjectTypeV01FromWire(String wire) {
  for (final v in CanonicalSubjectTypeV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

/// Every important action emits one envelope-shaped event (canonical `SystemEvent`).
///
/// If it affects money, trust, attention, campaign state, or admin decisions, emit an event.
///
/// **§19 — Idempotency:** for [eventType] values in
/// [CanonicalEventTypesRequiringIdempotencyKeyV01.all], [idempotencyKey] must be
/// set to a stable dedupe key so retried backend jobs do not duplicate reservations,
/// value lots, ledger lines, withdrawals, conversions, or admin adjustments.
/// Optional [modelVersion] is a v0.1 extension for ML/verification lineage; omit on the wire if unused.
final class SystemEventV01 {
  const SystemEventV01({
    required this.eventId,
    required this.eventType,
    this.eventVersion = 1,
    required this.actorType,
    required this.actorId,
    required this.subjectType,
    required this.subjectId,
    this.userId,
    this.campaignId,
    this.sessionId,
    required this.payload,
    this.policyVersion,
    this.idempotencyKey,
    this.correlationId,
    this.causationId,
    this.modelVersion,
    required this.createdAt,
  });

  final String eventId;
  final EventTypeV01 eventType;
  final int eventVersion;
  final CanonicalActorTypeV01 actorType;
  final String actorId;
  final CanonicalSubjectTypeV01 subjectType;
  final String subjectId;
  final String? userId;
  final String? campaignId;
  final String? sessionId;
  final Map<String, Object?> payload;
  final String? policyVersion;
  final String? idempotencyKey;
  final String? correlationId;
  final String? causationId;
  final String? modelVersion;
  final IsoInstantString createdAt;
}

/// Major event groups (`eventType` namespaces). Concrete `eventType` strings are defined in step 2.
abstract final class CanonicalEventGroupPrefixesV01 {
  static const attention = 'attention.';
  static const reward = 'reward.';
  static const wallet = 'wallet.';
  static const trust = 'trust.';
  static const campaign = 'campaign.';
  static const budget = 'budget.';
  static const admin = 'admin.';
  static const fraud = 'fraud.';
  static const withdrawal = 'withdrawal.';
  static const conversion = 'conversion.';
  /// Namespace for identity lifecycle events; full types use `identity.user.*`.
  static const identity = 'identity.';
  /// Device binding / fingerprinting surface (`device.*`).
  static const device = 'device.';
  /// Published governance bundles (`policy.*`).
  static const policy = 'policy.';
}

/// `device.*` wire strings (backend v1 MVP).
abstract final class CanonicalDeviceEventTypesV01 {
  static const registered = '${CanonicalEventGroupPrefixesV01.device}registered';
}

/// Dotted `campaign.*` wire strings (distinct from PascalCase [CanonicalEventTypesV01] catalog).
abstract final class CanonicalCampaignEventTypesV01 {
  static const created = '${CanonicalEventGroupPrefixesV01.campaign}created';
  static const submittedForReview =
      '${CanonicalEventGroupPrefixesV01.campaign}submitted_for_review';
  static const approved = '${CanonicalEventGroupPrefixesV01.campaign}approved';
  static const rejected = '${CanonicalEventGroupPrefixesV01.campaign}rejected';
  static const activated = '${CanonicalEventGroupPrefixesV01.campaign}activated';
  static const paused = '${CanonicalEventGroupPrefixesV01.campaign}paused';
  static const completed = '${CanonicalEventGroupPrefixesV01.campaign}completed';
}

/// `wallet.*` wire strings for value lots, ledger lines, and derived balance snapshots.
abstract final class CanonicalWalletEventTypesV01 {
  static const valueLotCreated = '${CanonicalEventGroupPrefixesV01.wallet}value_lot.created';
  static const valueLotAvailable = '${CanonicalEventGroupPrefixesV01.wallet}value_lot.available';
  static const valueLotLocked = '${CanonicalEventGroupPrefixesV01.wallet}value_lot.locked';
  static const valueLotSpent = '${CanonicalEventGroupPrefixesV01.wallet}value_lot.spent';
  static const ledgerEntryCreated = '${CanonicalEventGroupPrefixesV01.wallet}ledger_entry.created';
  static const balanceProjected = '${CanonicalEventGroupPrefixesV01.wallet}balance.projected';
}

/// `fraud.*` wire strings (aligned with [FraudEventWire] in `lib/core/events/fraud_event.dart`).
abstract final class CanonicalFraudEventTypesV01 {
  static const flagCreated = '${CanonicalEventGroupPrefixesV01.fraud}flag.created';
  static const caseOpened = '${CanonicalEventGroupPrefixesV01.fraud}case.opened';
  static const caseResolved = '${CanonicalEventGroupPrefixesV01.fraud}case.resolved';
}

/// `withdrawal.*` wire strings (aligned with [WithdrawalEventWire]).
abstract final class CanonicalWithdrawalEventTypesV01 {
  static const requested = '${CanonicalEventGroupPrefixesV01.withdrawal}requested';
  static const approved = '${CanonicalEventGroupPrefixesV01.withdrawal}approved';
  static const rejected = '${CanonicalEventGroupPrefixesV01.withdrawal}rejected';
  static const completed = '${CanonicalEventGroupPrefixesV01.withdrawal}completed';
  static const failed = '${CanonicalEventGroupPrefixesV01.withdrawal}failed';
}

/// MVP `admin.*` subset for backend v1 (other admin.* events remain out of scope for first ingest).
abstract final class CanonicalAdminEventTypesV01 {
  static const walletAdjustmentCreated =
      '${CanonicalEventGroupPrefixesV01.admin}wallet.adjustment.created';
  static const rewardReversed = '${CanonicalEventGroupPrefixesV01.admin}reward.reversed';
}

/// `policy.*` wire strings for published bundle lifecycle.
abstract final class CanonicalPolicyEventTypesV01 {
  static const versionCreated = '${CanonicalEventGroupPrefixesV01.policy}version.created';
  static const versionActivated = '${CanonicalEventGroupPrefixesV01.policy}version.activated';
}

/// First real backend / outbox **eventType** allow-list (39 types). Everything else waits.
abstract final class MvpBackendEventSetV01 {
  static const Set<String> eventTypes = {
    CanonicalIdentityEventTypesV01.userCreated,
    CanonicalDeviceEventTypesV01.registered,
    CanonicalAttentionEventTypesV01.sessionStarted,
    CanonicalAttentionEventTypesV01.sessionCompleted,
    CanonicalAttentionEventTypesV01.verificationCreated,
    CanonicalAttentionEventTypesV01.verificationRejected,
    CanonicalRewardEventTypesV01.candidateCreated,
    CanonicalRewardEventTypesV01.decisionApproved,
    CanonicalRewardEventTypesV01.decisionRejected,
    CanonicalRewardEventTypesV01.released,
    CanonicalRewardEventTypesV01.clawedBack,
    CanonicalCampaignEventTypesV01.created,
    CanonicalCampaignEventTypesV01.activated,
    CanonicalCampaignEventTypesV01.paused,
    CanonicalCampaignEventTypesV01.completed,
    CanonicalBudgetEventTypesV01.funded,
    CanonicalBudgetEventTypesV01.reservationCreated,
    CanonicalBudgetEventTypesV01.reservationReleased,
    CanonicalBudgetEventTypesV01.reservationCaptured,
    CanonicalWalletEventTypesV01.valueLotCreated,
    CanonicalWalletEventTypesV01.valueLotAvailable,
    CanonicalWalletEventTypesV01.valueLotLocked,
    CanonicalWalletEventTypesV01.valueLotSpent,
    CanonicalWalletEventTypesV01.ledgerEntryCreated,
    CanonicalWalletEventTypesV01.balanceProjected,
    CanonicalTrustEventTypesV01.scoreCreated,
    CanonicalTrustEventTypesV01.scoreUpdated,
    CanonicalFraudEventTypesV01.flagCreated,
    CanonicalFraudEventTypesV01.caseOpened,
    CanonicalFraudEventTypesV01.caseResolved,
    CanonicalWithdrawalEventTypesV01.requested,
    CanonicalWithdrawalEventTypesV01.approved,
    CanonicalWithdrawalEventTypesV01.rejected,
    CanonicalWithdrawalEventTypesV01.completed,
    CanonicalWithdrawalEventTypesV01.failed,
    CanonicalAdminEventTypesV01.walletAdjustmentCreated,
    CanonicalAdminEventTypesV01.rewardReversed,
    CanonicalPolicyEventTypesV01.versionCreated,
    CanonicalPolicyEventTypesV01.versionActivated,
  };

  static bool contains(String eventType) => eventTypes.contains(eventType);
}

/// Wire `eventType` strings for the minimum event catalog (§4).
///
/// Prefer stable PascalCase names here; namespaced forms may use
/// [CanonicalEventGroupPrefixesV01] + suffix at integration boundaries.
abstract final class CanonicalEventTypesV01 {
  static const userCreated = 'UserCreated';
  static const runtimeSignalCaptured = 'RuntimeSignalCaptured';
  static const attentionSessionStarted = 'AttentionSessionStarted';
  static const attentionFrameProcessed = 'AttentionFrameProcessed';
  static const attentionVerificationPassed = 'AttentionVerificationPassed';
  static const attentionVerificationFailed = 'AttentionVerificationFailed';
  static const rewardReserved = 'RewardReserved';
  static const rewardIssued = 'RewardIssued';
  static const rewardHeld = 'RewardHeld';
  static const rewardReleased = 'RewardReleased';
  static const rewardFrozen = 'RewardFrozen';
  static const rewardReversed = 'RewardReversed';
  static const balancePendingCredited = 'BalancePendingCredited';
  static const balanceAvailableCredited = 'BalanceAvailableCredited';
  static const valueLotCreated = 'ValueLotCreated';
  static const valueLotUnlocked = 'ValueLotUnlocked';
  static const coinConverted = 'CoinConverted';
  static const payoutRequested = 'PayoutRequested';
  static const payoutApproved = 'PayoutApproved';
  static const payoutRejected = 'PayoutRejected';
  static const payoutPaid = 'PayoutPaid';
  static const campaignCreated = 'CampaignCreated';
  static const campaignActivated = 'CampaignActivated';
  static const campaignPaused = 'CampaignPaused';
  static const campaignBudgetReserved = 'CampaignBudgetReserved';
  static const campaignBudgetSettled = 'CampaignBudgetSettled';
  static const campaignBudgetReleased = 'CampaignBudgetReleased';
  static const trustScoreChanged = 'TrustScoreChanged';
  static const riskScoreChanged = 'RiskScoreChanged';
  static const policyDecisionMade = 'PolicyDecisionMade';
  static const appealOpened = 'AppealOpened';
  static const appealResolved = 'AppealResolved';
  static const adminActionTaken = 'AdminActionTaken';
}

/// Wire `eventType` strings for the attention pipeline (`attention.*`).
///
/// These are namespaced dot events (distinct from PascalCase [CanonicalEventTypesV01] catalog).
abstract final class CanonicalAttentionEventTypesV01 {
  static const sessionStarted =
      '${CanonicalEventGroupPrefixesV01.attention}session.started';
  static const runtimeSignalSampled =
      '${CanonicalEventGroupPrefixesV01.attention}runtime_signal.sampled';
  static const sessionCompleted =
      '${CanonicalEventGroupPrefixesV01.attention}session.completed';
  static const sessionAbandoned =
      '${CanonicalEventGroupPrefixesV01.attention}session.abandoned';
  static const verificationCreated =
      '${CanonicalEventGroupPrefixesV01.attention}verification.created';
  static const verificationRejected =
      '${CanonicalEventGroupPrefixesV01.attention}verification.rejected';
}

/// Wire `eventType` strings for identity lifecycle (§4.1).
///
/// These match the contract `identity.user.*` (distinct from PascalCase catalog above).
abstract final class CanonicalIdentityEventTypesV01 {
  static const userCreated = '${CanonicalEventGroupPrefixesV01.identity}user.created';
  static const userVerified = '${CanonicalEventGroupPrefixesV01.identity}user.verified';
  static const userRestricted = '${CanonicalEventGroupPrefixesV01.identity}user.restricted';
  static const userUnrestricted = '${CanonicalEventGroupPrefixesV01.identity}user.unrestricted';
}

/// Wire `eventType` strings for trust lifecycle (§13).
///
/// These match the contract `trust.score.*` / `trust.limit.*` (distinct from
/// PascalCase [CanonicalEventTypesV01.trustScoreChanged] catalog entry).
abstract final class CanonicalTrustEventTypesV01 {
  static const scoreCreated =
      '${CanonicalEventGroupPrefixesV01.trust}score.created';
  static const scoreUpdated =
      '${CanonicalEventGroupPrefixesV01.trust}score.updated';
  static const limitChanged =
      '${CanonicalEventGroupPrefixesV01.trust}limit.changed';
}

// --- §4 Identity events (payload shapes for `identity.user.*`) ---

/// Signup channel for [IdentityUserCreatedPayloadV01].
enum IdentitySignupMethodV01 { email, phone, apple, google, anonymous }

extension IdentitySignupMethodV01Wire on IdentitySignupMethodV01 {
  String get wireName => switch (this) {
        IdentitySignupMethodV01.apple => 'apple',
        IdentitySignupMethodV01.google => 'google',
        _ => name,
      };
}

IdentitySignupMethodV01? identitySignupMethodV01FromWire(String wire) {
  for (final v in IdentitySignupMethodV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

/// Verification tier for [IdentityUserVerifiedPayloadV01].
enum IdentityVerificationLevelV01 { none, email, phone, kycBasic, kycFull }

extension IdentityVerificationLevelV01Wire on IdentityVerificationLevelV01 {
  String get wireName => switch (this) {
        IdentityVerificationLevelV01.kycBasic => 'kyc_basic',
        IdentityVerificationLevelV01.kycFull => 'kyc_full',
        _ => name,
      };
}

IdentityVerificationLevelV01? identityVerificationLevelV01FromWire(String wire) {
  for (final v in IdentityVerificationLevelV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

/// Restriction surface for [IdentityUserRestrictedPayloadV01] / [IdentityUserUnrestrictedPayloadV01].
enum IdentityRestrictionTypeV01 { earning, withdrawal, campaignAccess, fullAccount }

extension IdentityRestrictionTypeV01Wire on IdentityRestrictionTypeV01 {
  String get wireName => switch (this) {
        IdentityRestrictionTypeV01.campaignAccess => 'campaign_access',
        IdentityRestrictionTypeV01.fullAccount => 'full_account',
        _ => name,
      };
}

IdentityRestrictionTypeV01? identityRestrictionTypeV01FromWire(String wire) {
  for (final v in IdentityRestrictionTypeV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

/// Emitted when a user account is created (`identity.user.created`).
final class IdentityUserCreatedPayloadV01 {
  const IdentityUserCreatedPayloadV01({
    required this.userId,
    required this.signupMethod,
    this.country,
    this.referralCode,
  });

  final String userId;
  final IdentitySignupMethodV01 signupMethod;
  final String? country;
  final String? referralCode;

  Map<String, Object?> toPayloadMap() => {
        'userId': userId,
        'signupMethod': signupMethod.wireName,
        if (country != null) 'country': country,
        if (referralCode != null) 'referralCode': referralCode,
      };
}

/// Emitted when user identity reaches a verification level (`identity.user.verified`).
final class IdentityUserVerifiedPayloadV01 {
  const IdentityUserVerifiedPayloadV01({
    required this.userId,
    required this.verificationLevel,
    this.provider,
  });

  final String userId;
  final IdentityVerificationLevelV01 verificationLevel;
  final String? provider;

  Map<String, Object?> toPayloadMap() => {
        'userId': userId,
        'verificationLevel': verificationLevel.wireName,
        if (provider != null) 'provider': provider,
      };
}

/// Emitted when account access is restricted (`identity.user.restricted`).
final class IdentityUserRestrictedPayloadV01 {
  const IdentityUserRestrictedPayloadV01({
    required this.userId,
    required this.restrictionType,
    required this.reason,
    this.expiresAt,
  });

  final String userId;
  final IdentityRestrictionTypeV01 restrictionType;
  final String reason;
  final IsoInstantString? expiresAt;

  Map<String, Object?> toPayloadMap() => {
        'userId': userId,
        'restrictionType': restrictionType.wireName,
        'reason': reason,
        if (expiresAt != null) 'expiresAt': expiresAt,
      };
}

/// Emitted when a restriction is removed (`identity.user.unrestricted`).
final class IdentityUserUnrestrictedPayloadV01 {
  const IdentityUserUnrestrictedPayloadV01({
    required this.userId,
    required this.restrictionType,
    required this.reason,
  });

  final String userId;
  final IdentityRestrictionTypeV01 restrictionType;
  final String reason;

  Map<String, Object?> toPayloadMap() => {
        'userId': userId,
        'restrictionType': restrictionType.wireName,
        'reason': reason,
      };
}

// --- §7 Reward events (`reward.*`) — eligibility & issuance decisions ---
//
// These describe eligibility and issuance; they do not directly mutate balances
// unless the wallet engine consumes them.

/// Wire `eventType` strings for reward domain events (dotted namespace).
abstract final class CanonicalRewardEventTypesV01 {
  static const candidateCreated = '${CanonicalEventGroupPrefixesV01.reward}candidate.created';
  static const decisionApproved = '${CanonicalEventGroupPrefixesV01.reward}decision.approved';
  static const decisionRejected = '${CanonicalEventGroupPrefixesV01.reward}decision.rejected';
  static const decisionHeld = '${CanonicalEventGroupPrefixesV01.reward}decision.held';
  static const released = '${CanonicalEventGroupPrefixesV01.reward}released';
  static const clawedBack = '${CanonicalEventGroupPrefixesV01.reward}clawed_back';
}

/// Reward line currency on the wire (`USD` | `ICOIN` | `VCOIN` | `RCOIN`).
enum RewardEventCurrencyV01 { usd, iCoin, vCoin, rCoin }

extension RewardEventCurrencyV01Wire on RewardEventCurrencyV01 {
  String get wireName => switch (this) {
        RewardEventCurrencyV01.usd => 'USD',
        RewardEventCurrencyV01.iCoin => 'ICOIN',
        RewardEventCurrencyV01.vCoin => 'VCOIN',
        RewardEventCurrencyV01.rCoin => 'RCOIN',
      };
}

RewardEventCurrencyV01? rewardEventCurrencyV01FromWire(String wire) {
  for (final v in RewardEventCurrencyV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

/// After verified attention qualifies for reward evaluation (`reward.candidate.created`).
enum RewardCandidateEligibilityV01 { eligible, needsReview, ineligible }

extension RewardCandidateEligibilityV01Wire on RewardCandidateEligibilityV01 {
  String get wireName => switch (this) {
        RewardCandidateEligibilityV01.needsReview => 'needs_review',
        _ => name,
      };
}

RewardCandidateEligibilityV01? rewardCandidateEligibilityV01FromWire(String wire) {
  for (final v in RewardCandidateEligibilityV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

/// Initial lot / issuance disposition on approval (`reward.decision.approved`).
enum RewardDecisionInitialStatusV01 { pending, available, held }

extension RewardDecisionInitialStatusV01Wire on RewardDecisionInitialStatusV01 {
  String get wireName => name;
}

RewardDecisionInitialStatusV01? rewardDecisionInitialStatusV01FromWire(String wire) {
  for (final v in RewardDecisionInitialStatusV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

/// Rejection reason (`reward.decision.rejected`).
enum RewardDecisionRejectedReasonV01 {
  budgetUnavailable,
  duplicateReward,
  trustTooLow,
  fraudRiskHigh,
  campaignInactive,
  userIneligible,
  dailyLimitExceeded,
  policyFailed,
}

extension RewardDecisionRejectedReasonV01Wire on RewardDecisionRejectedReasonV01 {
  String get wireName => switch (this) {
        RewardDecisionRejectedReasonV01.budgetUnavailable => 'budget_unavailable',
        RewardDecisionRejectedReasonV01.duplicateReward => 'duplicate_reward',
        RewardDecisionRejectedReasonV01.trustTooLow => 'trust_too_low',
        RewardDecisionRejectedReasonV01.fraudRiskHigh => 'fraud_risk_high',
        RewardDecisionRejectedReasonV01.campaignInactive => 'campaign_inactive',
        RewardDecisionRejectedReasonV01.userIneligible => 'user_ineligible',
        RewardDecisionRejectedReasonV01.dailyLimitExceeded => 'daily_limit_exceeded',
        RewardDecisionRejectedReasonV01.policyFailed => 'policy_failed',
      };
}

RewardDecisionRejectedReasonV01? rewardDecisionRejectedReasonV01FromWire(String wire) {
  for (final v in RewardDecisionRejectedReasonV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

/// Hold reason (`reward.decision.held`).
enum RewardDecisionHoldReasonV01 {
  newAccount,
  lowTrust,
  fraudReview,
  campaignReview,
  velocityLimit,
  deviceRisk,
}

extension RewardDecisionHoldReasonV01Wire on RewardDecisionHoldReasonV01 {
  String get wireName => switch (this) {
        RewardDecisionHoldReasonV01.newAccount => 'new_account',
        RewardDecisionHoldReasonV01.lowTrust => 'low_trust',
        RewardDecisionHoldReasonV01.fraudReview => 'fraud_review',
        RewardDecisionHoldReasonV01.campaignReview => 'campaign_review',
        RewardDecisionHoldReasonV01.velocityLimit => 'velocity_limit',
        RewardDecisionHoldReasonV01.deviceRisk => 'device_risk',
      };
}

RewardDecisionHoldReasonV01? rewardDecisionHoldReasonV01FromWire(String wire) {
  for (final v in RewardDecisionHoldReasonV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

/// Clawback reason (`reward.clawed_back`).
enum RewardClawedBackReasonV01 {
  fraudConfirmed,
  campaignDispute,
  duplicateReward,
  policyViolation,
  manualAdminReview,
}

extension RewardClawedBackReasonV01Wire on RewardClawedBackReasonV01 {
  String get wireName => switch (this) {
        RewardClawedBackReasonV01.fraudConfirmed => 'fraud_confirmed',
        RewardClawedBackReasonV01.campaignDispute => 'campaign_dispute',
        RewardClawedBackReasonV01.duplicateReward => 'duplicate_reward',
        RewardClawedBackReasonV01.policyViolation => 'policy_violation',
        RewardClawedBackReasonV01.manualAdminReview => 'manual_admin_review',
      };
}

RewardClawedBackReasonV01? rewardClawedBackReasonV01FromWire(String wire) {
  for (final v in RewardClawedBackReasonV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

/// `RewardCandidateCreatedPayload`
final class RewardCandidateCreatedPayloadV01 {
  const RewardCandidateCreatedPayloadV01({
    required this.rewardCandidateId,
    required this.userId,
    required this.campaignId,
    required this.verificationId,
    required this.expectedAmount,
    required this.currency,
    required this.eligibilityStatus,
    this.reason,
  });

  final String rewardCandidateId;
  final String userId;
  final String campaignId;
  final String verificationId;
  final double expectedAmount;
  final RewardEventCurrencyV01 currency;
  final RewardCandidateEligibilityV01 eligibilityStatus;
  final String? reason;

  Map<String, Object?> toPayloadMap() => {
        'rewardCandidateId': rewardCandidateId,
        'userId': userId,
        'campaignId': campaignId,
        'verificationId': verificationId,
        'expectedAmount': expectedAmount,
        'currency': currency.wireName,
        'eligibilityStatus': eligibilityStatus.wireName,
        if (reason != null) 'reason': reason,
      };
}

/// `RewardDecisionApprovedPayload`
final class RewardDecisionApprovedPayloadV01 {
  const RewardDecisionApprovedPayloadV01({
    required this.decisionId,
    required this.rewardCandidateId,
    required this.userId,
    required this.campaignId,
    required this.verificationId,
    required this.amount,
    required this.currency,
    required this.budgetReservationId,
    required this.trustScoreAtIssuance,
    required this.fraudRiskAtIssuance,
    required this.initialStatus,
    required this.policyVersion,
  });

  final String decisionId;
  final String rewardCandidateId;
  final String userId;
  final String campaignId;
  final String verificationId;
  final double amount;
  final RewardEventCurrencyV01 currency;
  final String budgetReservationId;
  final double trustScoreAtIssuance;
  final double fraudRiskAtIssuance;
  final RewardDecisionInitialStatusV01 initialStatus;
  final String policyVersion;

  Map<String, Object?> toPayloadMap() => {
        'decisionId': decisionId,
        'rewardCandidateId': rewardCandidateId,
        'userId': userId,
        'campaignId': campaignId,
        'verificationId': verificationId,
        'amount': amount,
        'currency': currency.wireName,
        'budgetReservationId': budgetReservationId,
        'trustScoreAtIssuance': trustScoreAtIssuance,
        'fraudRiskAtIssuance': fraudRiskAtIssuance,
        'initialStatus': initialStatus.wireName,
        'policyVersion': policyVersion,
      };
}

/// `RewardDecisionRejectedPayload`
final class RewardDecisionRejectedPayloadV01 {
  const RewardDecisionRejectedPayloadV01({
    required this.decisionId,
    required this.rewardCandidateId,
    required this.userId,
    required this.campaignId,
    required this.verificationId,
    required this.reason,
    required this.policyVersion,
  });

  final String decisionId;
  final String rewardCandidateId;
  final String userId;
  final String campaignId;
  final String verificationId;
  final RewardDecisionRejectedReasonV01 reason;
  final String policyVersion;

  Map<String, Object?> toPayloadMap() => {
        'decisionId': decisionId,
        'rewardCandidateId': rewardCandidateId,
        'userId': userId,
        'campaignId': campaignId,
        'verificationId': verificationId,
        'reason': reason.wireName,
        'policyVersion': policyVersion,
      };
}

/// `RewardDecisionHeldPayload`
final class RewardDecisionHeldPayloadV01 {
  const RewardDecisionHeldPayloadV01({
    required this.decisionId,
    required this.userId,
    required this.campaignId,
    required this.amount,
    required this.currency,
    required this.holdReason,
    this.releaseEligibleAt,
  });

  final String decisionId;
  final String userId;
  final String campaignId;
  final double amount;
  final RewardEventCurrencyV01 currency;
  final RewardDecisionHoldReasonV01 holdReason;
  final IsoInstantString? releaseEligibleAt;

  Map<String, Object?> toPayloadMap() => {
        'decisionId': decisionId,
        'userId': userId,
        'campaignId': campaignId,
        'amount': amount,
        'currency': currency.wireName,
        'holdReason': holdReason.wireName,
        if (releaseEligibleAt != null) 'releaseEligibleAt': releaseEligibleAt,
      };
}

/// `RewardReleasedPayload` — held/pending reward becomes available (`reward.released`).
final class RewardReleasedPayloadV01 {
  const RewardReleasedPayloadV01({
    required this.decisionId,
    required this.userId,
    required this.valueLotId,
    required this.amount,
    required this.currency,
    required this.releasedAt,
  });

  final String decisionId;
  final String userId;
  final String valueLotId;
  final double amount;
  final RewardEventCurrencyV01 currency;
  final IsoInstantString releasedAt;

  Map<String, Object?> toPayloadMap() => {
        'decisionId': decisionId,
        'userId': userId,
        'valueLotId': valueLotId,
        'amount': amount,
        'currency': currency.wireName,
        'releasedAt': releasedAt,
      };
}

/// `RewardClawedBackPayload`
final class RewardClawedBackPayloadV01 {
  const RewardClawedBackPayloadV01({
    required this.decisionId,
    required this.userId,
    required this.valueLotId,
    required this.amount,
    required this.currency,
    required this.reason,
  });

  final String decisionId;
  final String userId;
  final String valueLotId;
  final double amount;
  final RewardEventCurrencyV01 currency;
  final RewardClawedBackReasonV01 reason;

  Map<String, Object?> toPayloadMap() => {
        'decisionId': decisionId,
        'userId': userId,
        'valueLotId': valueLotId,
        'amount': amount,
        'currency': currency.wireName,
        'reason': reason.wireName,
      };
}

// --- §9 Budget events (`budget.*`) — strict reservation / spend lifecycle ---
//
// Payloads are money-adjacent: emitters must use [toPayloadMap]; consumers that
// rehydrate from JSON should use [fromStrictMap] factories (throw on mismatch).

/// Same wire enum as reward line currency (`USD` | `ICOIN` | `VCOIN` | `RCOIN`).
typedef BudgetEventCurrencyV01 = RewardEventCurrencyV01;

/// Wire `eventType` strings for budget domain events (dotted namespace).
abstract final class CanonicalBudgetEventTypesV01 {
  static const funded = '${CanonicalEventGroupPrefixesV01.budget}funded';
  static const reservationCreated =
      '${CanonicalEventGroupPrefixesV01.budget}reservation.created';
  static const reservationReleased =
      '${CanonicalEventGroupPrefixesV01.budget}reservation.released';
  static const reservationCaptured =
      '${CanonicalEventGroupPrefixesV01.budget}reservation.captured';
  static const depleted = '${CanonicalEventGroupPrefixesV01.budget}depleted';
}

// --- §19 Events that must be idempotent (`SystemEventV01.idempotencyKey` mandatory) ---
//
// Retrying backend jobs must not duplicate money. Consumers should dedupe on
// (eventType, idempotencyKey) before applying economic effects.

/// Wire [eventType] strings for which [SystemEventV01.idempotencyKey] is **required** (§19).
///
/// Matches product contract:
/// `attention.verification.created`, `reward.candidate.created`,
/// `budget.reservation.created`, `reward.decision.approved`,
/// `wallet.value_lot.created`, `wallet.ledger_entry.created`,
/// `withdrawal.requested`, `conversion.completed`,
/// `admin.wallet.adjustment.created`.
abstract final class CanonicalEventTypesRequiringIdempotencyKeyV01 {
  static const String attentionVerificationCreated =
      CanonicalAttentionEventTypesV01.verificationCreated;
  static const String rewardCandidateCreated =
      CanonicalRewardEventTypesV01.candidateCreated;
  static const String budgetReservationCreated =
      CanonicalBudgetEventTypesV01.reservationCreated;
  static const String rewardDecisionApproved =
      CanonicalRewardEventTypesV01.decisionApproved;
  static const String walletValueLotCreated =
      '${CanonicalEventGroupPrefixesV01.wallet}value_lot.created';
  static const String walletLedgerEntryCreated =
      '${CanonicalEventGroupPrefixesV01.wallet}ledger_entry.created';
  static const String withdrawalRequested =
      '${CanonicalEventGroupPrefixesV01.withdrawal}requested';
  static const String conversionCompleted =
      '${CanonicalEventGroupPrefixesV01.conversion}completed';
  static const String adminWalletAdjustmentCreated =
      '${CanonicalEventGroupPrefixesV01.admin}wallet.adjustment.created';

  /// All §19 types (fixed catalog for membership checks).
  static const Set<EventTypeV01> all = {
    attentionVerificationCreated,
    rewardCandidateCreated,
    budgetReservationCreated,
    rewardDecisionApproved,
    walletValueLotCreated,
    walletLedgerEntryCreated,
    withdrawalRequested,
    conversionCompleted,
    adminWalletAdjustmentCreated,
  };
}

/// Whether [eventType] requires a non-null, non-empty [SystemEventV01.idempotencyKey] (§19).
bool eventTypeRequiresIdempotencyKeyV01(EventTypeV01 eventType) =>
    CanonicalEventTypesRequiringIdempotencyKeyV01.all.contains(eventType);

/// True if [event] satisfies §19 (key present whenever [event.eventType] requires it).
bool systemEventV01HasRequiredIdempotencyKey(SystemEventV01 event) {
  if (!eventTypeRequiresIdempotencyKeyV01(event.eventType)) return true;
  final k = event.idempotencyKey;
  return k != null && k.isNotEmpty;
}

/// Release reason (`budget.reservation.released`).
enum BudgetReservationReleasedReasonV01 {
  rewardRejected,
  reservationExpired,
  campaignCancelled,
  adminRelease,
}

extension BudgetReservationReleasedReasonV01Wire on BudgetReservationReleasedReasonV01 {
  String get wireName => switch (this) {
        BudgetReservationReleasedReasonV01.rewardRejected => 'reward_rejected',
        BudgetReservationReleasedReasonV01.reservationExpired => 'reservation_expired',
        BudgetReservationReleasedReasonV01.campaignCancelled => 'campaign_cancelled',
        BudgetReservationReleasedReasonV01.adminRelease => 'admin_release',
      };
}

BudgetReservationReleasedReasonV01? budgetReservationReleasedReasonV01FromWire(String wire) {
  for (final v in BudgetReservationReleasedReasonV01.values) {
    if (v.wireName == wire) return v;
  }
  return null;
}

abstract final class _BudgetStrictMap {
  static String str(Map<String, Object?> m, String key) {
    final Object? v = m[key];
    if (v is! String) {
      throw FormatException('budget payload: expected non-null String at "$key"');
    }
    return v;
  }

  static double numToDouble(Map<String, Object?> m, String key) {
    final Object? v = m[key];
    if (v is! num) {
      throw FormatException('budget payload: expected num at "$key"');
    }
    return v.toDouble();
  }

  static BudgetEventCurrencyV01 currency(Map<String, Object?> m, String key) {
    final Object? v = m[key];
    if (v is! String) {
      throw FormatException('budget payload: expected String currency at "$key"');
    }
    return rewardEventCurrencyV01FromWire(v) ??
        (throw FormatException('budget payload: unknown currency "$v"'));
  }

  static BudgetReservationReleasedReasonV01 releasedReason(Map<String, Object?> m, String key) {
    final Object? v = m[key];
    if (v is! String) {
      throw FormatException('budget payload: expected String reason at "$key"');
    }
    return budgetReservationReleasedReasonV01FromWire(v) ??
        (throw FormatException('budget payload: unknown reservation release reason "$v"'));
  }
}

/// `budget.funded`
final class BudgetFundedPayloadV01 {
  const BudgetFundedPayloadV01({
    required this.campaignId,
    required this.amount,
    required this.currency,
    required this.fundingSourceId,
  });

  final String campaignId;
  final double amount;
  final BudgetEventCurrencyV01 currency;
  final String fundingSourceId;

  Map<String, Object?> toPayloadMap() => {
        'campaignId': campaignId,
        'amount': amount,
        'currency': currency.wireName,
        'fundingSourceId': fundingSourceId,
      };

  factory BudgetFundedPayloadV01.fromStrictMap(Map<String, Object?> m) {
    return BudgetFundedPayloadV01(
      campaignId: _BudgetStrictMap.str(m, 'campaignId'),
      amount: _BudgetStrictMap.numToDouble(m, 'amount'),
      currency: _BudgetStrictMap.currency(m, 'currency'),
      fundingSourceId: _BudgetStrictMap.str(m, 'fundingSourceId'),
    );
  }
}

/// `budget.reservation.created`
final class BudgetReservationCreatedPayloadV01 {
  const BudgetReservationCreatedPayloadV01({
    required this.reservationId,
    required this.campaignId,
    required this.userId,
    required this.rewardCandidateId,
    required this.amount,
    required this.currency,
    required this.expiresAt,
  });

  final String reservationId;
  final String campaignId;
  final String userId;
  final String rewardCandidateId;
  final double amount;
  final BudgetEventCurrencyV01 currency;
  final IsoInstantString expiresAt;

  Map<String, Object?> toPayloadMap() => {
        'reservationId': reservationId,
        'campaignId': campaignId,
        'userId': userId,
        'rewardCandidateId': rewardCandidateId,
        'amount': amount,
        'currency': currency.wireName,
        'expiresAt': expiresAt,
      };

  factory BudgetReservationCreatedPayloadV01.fromStrictMap(Map<String, Object?> m) {
    return BudgetReservationCreatedPayloadV01(
      reservationId: _BudgetStrictMap.str(m, 'reservationId'),
      campaignId: _BudgetStrictMap.str(m, 'campaignId'),
      userId: _BudgetStrictMap.str(m, 'userId'),
      rewardCandidateId: _BudgetStrictMap.str(m, 'rewardCandidateId'),
      amount: _BudgetStrictMap.numToDouble(m, 'amount'),
      currency: _BudgetStrictMap.currency(m, 'currency'),
      expiresAt: _BudgetStrictMap.str(m, 'expiresAt'),
    );
  }
}

/// `budget.reservation.released`
final class BudgetReservationReleasedPayloadV01 {
  const BudgetReservationReleasedPayloadV01({
    required this.reservationId,
    required this.campaignId,
    required this.amount,
    required this.currency,
    required this.reason,
  });

  final String reservationId;
  final String campaignId;
  final double amount;
  final BudgetEventCurrencyV01 currency;
  final BudgetReservationReleasedReasonV01 reason;

  Map<String, Object?> toPayloadMap() => {
        'reservationId': reservationId,
        'campaignId': campaignId,
        'amount': amount,
        'currency': currency.wireName,
        'reason': reason.wireName,
      };

  factory BudgetReservationReleasedPayloadV01.fromStrictMap(Map<String, Object?> m) {
    return BudgetReservationReleasedPayloadV01(
      reservationId: _BudgetStrictMap.str(m, 'reservationId'),
      campaignId: _BudgetStrictMap.str(m, 'campaignId'),
      amount: _BudgetStrictMap.numToDouble(m, 'amount'),
      currency: _BudgetStrictMap.currency(m, 'currency'),
      reason: _BudgetStrictMap.releasedReason(m, 'reason'),
    );
  }
}

/// `budget.reservation.captured` — reserved campaign funds become spend.
final class BudgetReservationCapturedPayloadV01 {
  const BudgetReservationCapturedPayloadV01({
    required this.reservationId,
    required this.campaignId,
    required this.rewardDecisionId,
    required this.amount,
    required this.currency,
  });

  final String reservationId;
  final String campaignId;
  final String rewardDecisionId;
  final double amount;
  final BudgetEventCurrencyV01 currency;

  Map<String, Object?> toPayloadMap() => {
        'reservationId': reservationId,
        'campaignId': campaignId,
        'rewardDecisionId': rewardDecisionId,
        'amount': amount,
        'currency': currency.wireName,
      };

  factory BudgetReservationCapturedPayloadV01.fromStrictMap(Map<String, Object?> m) {
    return BudgetReservationCapturedPayloadV01(
      reservationId: _BudgetStrictMap.str(m, 'reservationId'),
      campaignId: _BudgetStrictMap.str(m, 'campaignId'),
      rewardDecisionId: _BudgetStrictMap.str(m, 'rewardDecisionId'),
      amount: _BudgetStrictMap.numToDouble(m, 'amount'),
      currency: _BudgetStrictMap.currency(m, 'currency'),
    );
  }
}

/// `budget.depleted`
final class BudgetDepletedPayloadV01 {
  const BudgetDepletedPayloadV01({
    required this.campaignId,
    required this.totalBudget,
    required this.spentBudget,
    required this.reservedBudget,
    required this.currency,
  });

  final String campaignId;
  final double totalBudget;
  final double spentBudget;
  final double reservedBudget;
  final BudgetEventCurrencyV01 currency;

  Map<String, Object?> toPayloadMap() => {
        'campaignId': campaignId,
        'totalBudget': totalBudget,
        'spentBudget': spentBudget,
        'reservedBudget': reservedBudget,
        'currency': currency.wireName,
      };

  factory BudgetDepletedPayloadV01.fromStrictMap(Map<String, Object?> m) {
    return BudgetDepletedPayloadV01(
      campaignId: _BudgetStrictMap.str(m, 'campaignId'),
      totalBudget: _BudgetStrictMap.numToDouble(m, 'totalBudget'),
      spentBudget: _BudgetStrictMap.numToDouble(m, 'spentBudget'),
      reservedBudget: _BudgetStrictMap.numToDouble(m, 'reservedBudget'),
      currency: _BudgetStrictMap.currency(m, 'currency'),
    );
  }
}

// --- §18 Critical event chains (normative ordering reference) ---
//
// These are the intended causal / temporal chains across attention, reward,
// budget, wallet, fraud, and withdrawal surfaces. Emitters should preserve
// provenance (Rule 8 in AGENTS.md); forks below are mutually exclusive branches.
//
// 18.1 Successful reward chain
//   attention.session.started
//   → attention.session.completed
//   → attention.verification.created
//   → reward.candidate.created
//   → budget.reservation.created
//   → reward.decision.approved
//   → wallet.value_lot.created
//   → wallet.ledger_entry.created
//   → wallet.balance.projected
//   After hold expires:
//   reward.released
//   → wallet.value_lot.available
//   → wallet.ledger_entry.created
//   → budget.reservation.captured
//   → wallet.balance.projected
//
// 18.2 Failed attention chain
//   attention.session.started
//   → attention.session.completed
//   → attention.verification.rejected
//   (no reward.candidate, no budget.reservation, no wallet.*)
//
// 18.3 Rejected reward chain
//   attention.verification.created
//   → reward.candidate.created
//   → reward.decision.rejected
//   If budget was already reserved: budget.reservation.released
//   (no value lot)
//
// 18.4 Fraud hold chain
//   attention.verification.created
//   → fraud.flag.created
//   → reward.candidate.created
//   → reward.decision.held
//   → wallet.value_lot.created
//   → wallet.value_lot.locked
//   → wallet.ledger_entry.created
//   Later either:
//   fraud.case.resolved → reward.released → wallet.value_lot.available
//   or:
//   fraud.case.resolved → reward.clawed_back → wallet.ledger_entry.created
//
// 18.5 Withdrawal chain
//   withdrawal.requested
//   → wallet.value_lot.locked
//   → wallet.ledger_entry.created
//   → withdrawal.approved
//   → withdrawal.completed
//   → wallet.value_lot.spent
//   → wallet.ledger_entry.created
//   → wallet.balance.projected
//   If failed:
//   withdrawal.failed
//   → wallet.value_lot.available
//   → wallet.ledger_entry.created
//
// §19 Idempotency (mandatory idempotencyKey on money-moving `eventType` values):
//   see [CanonicalEventTypesRequiringIdempotencyKeyV01] and [eventTypeRequiresIdempotencyKeyV01].

// --- Reason code examples (reference constants) ---

abstract final class ReasonCodesExamplesV01 {
  static const attentionLowGazeOnTarget = 'ATTENTION_LOW_GAZE_ON_TARGET';
  static const attentionNoFaceTooLong = 'ATTENTION_NO_FACE_TOO_LONG';
  static const attentionBlinkPatternInvalid = 'ATTENTION_BLINK_PATTERN_INVALID';
  static const qualityFrameTooLow = 'QUALITY_FRAME_TOO_LOW';
  static const riskDeviceReuse = 'RISK_DEVICE_REUSE';
  static const riskRewardVelocityHigh = 'RISK_REWARD_VELOCITY_HIGH';
  static const riskCollusionCluster = 'RISK_COLLUSION_CLUSTER';
  static const trustTierTooLow = 'TRUST_TIER_TOO_LOW';
  static const budgetNotAvailable = 'BUDGET_NOT_AVAILABLE';
  static const payoutKycRequired = 'PAYOUT_KYC_REQUIRED';
  static const payoutValueLotFrozen = 'PAYOUT_VALUE_LOT_FROZEN';
  static const conversionRiskHold = 'CONVERSION_RISK_HOLD';
}

/// Spec §2.2 core decision (thresholds on [campaign]).
bool attentionVerificationPassedV01({
  required AttentionVerificationResultV01 verification,
  required CampaignV01 campaign,
}) {
  return verification.attentionScore >= campaign.minAttentionScore &&
      verification.qualityScore >= campaign.minQualityScore &&
      verification.fraudSignalScore <= campaign.maxFraudSignalScore &&
      verification.verifiedMs >= campaign.minVerifiedMs;
}

/// Spec §2.3 initial weighted blend (all components 0..1).
double attentionScoreFromComponentsV01(AttentionScoreComponentsV01 c) {
  return (0.30 * c.gazeOnTarget +
          0.20 * c.gazeStability +
          0.15 * c.faceContinuity +
          0.10 * c.blinkNaturalness +
          0.10 * c.headPoseValidity +
          0.10 * c.durationCompletion +
          0.05 * c.frameQuality)
      .clamp(0.0, 1.0);
}
