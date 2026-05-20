// CLIENT SIMULATION / NON-AUTHORITATIVE
// This module is for client-side preview/simulation UX only.
// It must not be treated as the canonical writer for economy, wallet, trust, fraud, campaign, or POPS economic state.
// Backend/API source-of-truth ownership is documented in:
// docs/source-of-truth-ownership-contract.md
// docs/runtime-wiring-matrix.md

import 'dart:math' as math;

import 'package:eye_tracking_app/attention_verification_result.dart';

enum RewardStatus { pending, verified, available, rejected }

enum RewardType {
  watch,
  healthTracking,
  learning,
  campaign,
}

enum TrustTier {
  tier1Restricted,
  tier2Limited,
  tier3Standard,
  tier4Trusted,
  tier5Premium,
}

enum RewardValidationResult { hold, approved, rejected }

enum TrustPenaltySeverity {
  minor(4.0),
  moderate(10.0),
  major(22.0),
  critical(38.0);

  const TrustPenaltySeverity(this.points);
  final double points;
}

enum TrustEventType {
  sessionEnd,
  rewardValidation,
  fraudDetection,
}

enum FraudSensitivity { strict, elevated, relaxed }

enum CampaignValueTier { low, standard, high }

enum SupplyPressure { low, normal, high }

final class TrustPolicy {
  const TrustPolicy({
    required this.unlockWindow,
    required this.dailyEarningCapUsd,
    required this.withdrawAllowed,
    required this.withdrawDelay,
    required this.fraudSensitivity,
    required this.validationThreshold,
  });

  final Duration unlockWindow;
  final double dailyEarningCapUsd;
  final bool withdrawAllowed;
  final Duration withdrawDelay;
  final FraudSensitivity fraudSensitivity;
  final double validationThreshold;
}

final class TrustLimits {
  const TrustLimits({
    required this.dailyEarnCapUsd,
    required this.withdrawalCapUsd,
    required this.campaignAccessLevel,
  });

  final double dailyEarnCapUsd;
  final double withdrawalCapUsd;
  final int campaignAccessLevel;
}

final class TrustFlags {
  const TrustFlags({
    required this.suspicious,
    required this.restricted,
    required this.premium,
  });

  final bool suspicious;
  final bool restricted;
  final bool premium;
}

final class TrustState {
  const TrustState({
    required this.score,
    required this.tier,
    required this.multiplier,
    required this.limits,
    required this.flags,
  });

  final double score; // 0..100
  final int tier; // 1..5
  final double multiplier; // 0.6..1.5
  final TrustLimits limits;
  final TrustFlags flags;
}

final class TrustFeatures {
  const TrustFeatures({
    required this.attentionIntegrity,
    required this.avgAttentionScore,
    required this.fraudEvents,
    required this.anomalyScore,
    required this.sessionConsistency,
    required this.behavioralEntropy,
    required this.conversionRate,
    required this.withdrawalHistory,
    required this.accountAge,
    required this.externalVerifications,
  });

  final double attentionIntegrity;
  final double avgAttentionScore;
  final double fraudEvents;
  final double anomalyScore;
  final double sessionConsistency;
  final double behavioralEntropy;
  final double conversionRate;
  final double withdrawalHistory;
  final double accountAge;
  final double externalVerifications;
}

final class TrustLog {
  const TrustLog({
    required this.userId,
    required this.timestamp,
    required this.trustScore,
    required this.tier,
    required this.attentionIntegrity,
    required this.fraudEvents,
    required this.behaviorScore,
    required this.actions,
  });

  final String userId;
  final DateTime timestamp;
  final double trustScore;
  final int tier;
  final double attentionIntegrity;
  final double fraudEvents;
  final double behaviorScore;
  final List<String> actions;
}

final class UserTrust {
  UserTrust({
    required this.userId,
    this.trustScore = 50.0,
    DateTime? lastUpdated,
    this.behaviorScore = 50.0,
    this.attentionScoreAvg = 50.0,
    this.consistencyScore = 50.0,
    this.accountAgeScore = 0.0,
    this.deviceIntegrityScore = 60.0,
    this.externalSignalScore = 0.0,
    List<String>? flags,
  })  : lastUpdated = lastUpdated ?? DateTime.now(),
        flags = flags ?? <String>[];

  final String userId;
  double trustScore;
  TrustTier tier = TrustTier.tier3Standard;
  DateTime lastUpdated;

  double behaviorScore;
  double attentionScoreAvg;
  double consistencyScore;
  double accountAgeScore;
  double deviceIntegrityScore;
  double externalSignalScore;

  final List<String> flags;

  bool get isHighRisk =>
      tier == TrustTier.tier1Restricted || tier == TrustTier.tier2Limited;
}

final class SessionTrustSignal {
  const SessionTrustSignal({
    required this.sessionDurationSeconds,
    required this.interactionDiversity,
    required this.campaignCompletionRate,
    required this.navigationEntropy,
    required this.loopRepetitionRatio,
    required this.timingVariance,
    required this.avgAttentionScore,
    required this.consistencyScore,
    required this.deviceStabilityScore,
    required this.externalSignalScore,
    required this.accountAgeDays,
    this.validSessions = 0,
    this.totalSessions = 0,
    this.fraudEvents = 0.0,
    this.anomalyScore = 0.0,
    this.conversionRate = 0.0,
    this.withdrawalHistoryQuality = 0.0,
    this.externalVerifications = 0.0,
    this.failedAttentionVerification = false,
  });

  final int sessionDurationSeconds;
  final double interactionDiversity;
  final double campaignCompletionRate;
  final double navigationEntropy;
  final double loopRepetitionRatio;
  final double timingVariance;
  final double avgAttentionScore;
  final double consistencyScore;
  final double deviceStabilityScore;
  final double externalSignalScore;
  final int accountAgeDays;
  final int validSessions;
  final int totalSessions;
  final double fraudEvents;
  final double anomalyScore;
  final double conversionRate;
  final double withdrawalHistoryQuality;
  final double externalVerifications;
  final bool failedAttentionVerification;
}

final class PendingReward {
  PendingReward({
    required this.id,
    required this.userId,
    required this.creatorId,
    required this.contentId,
    required this.campaignId,
    required this.rewardType,
    required this.baseRewardUsd,
    required this.attentionScore,
    required this.confidence,
    required this.completionQuality,
    required this.demandMultiplier,
    required this.trustMultiplier,
    required this.pendingAmountUsd,
    required this.status,
    required this.createdAt,
    required this.unlockAt,
  });

  final String id;
  final String userId;
  final String creatorId;
  final String contentId;
  final String campaignId;
  final RewardType rewardType;
  final double baseRewardUsd;
  final double attentionScore;
  final double confidence;
  final double completionQuality;
  final double demandMultiplier;
  final double trustMultiplier;
  final double pendingAmountUsd;
  RewardStatus status;
  final DateTime createdAt;
  final DateTime unlockAt;
}

final class RewardEvent {
  const RewardEvent({
    required this.id,
    required this.userId,
    required this.contentId,
    required this.campaignId,
    required this.attentionScore,
    required this.confidence,
    required this.baseReward,
    required this.finalReward,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final String contentId;
  final String campaignId;
  final double attentionScore;
  final double confidence;
  final double baseReward;
  final double finalReward;
  final RewardStatus status;
  final DateTime createdAt;
}

final class RewardSplit {
  const RewardSplit({
    required this.rewardId,
    required this.viewerAmount,
    required this.creatorAmount,
    required this.platformAmount,
  });

  final String rewardId;
  final double viewerAmount;
  final double creatorAmount;
  final double platformAmount;
}

final class CampaignBudget {
  CampaignBudget({
    required this.id,
    required this.brandId,
    required this.totalBudgetUsd,
    required this.rewardPerActionUsd,
    required this.targetActions,
    this.expectedValidViews = 0,
    this.valueTier = CampaignValueTier.standard,
    this.minTrustScore = 0.0,
    double? remainingBudgetUsd,
  }) : remainingBudgetUsd = remainingBudgetUsd ?? totalBudgetUsd;

  final String id;
  final String brandId;
  final double totalBudgetUsd;
  double remainingBudgetUsd;
  final double rewardPerActionUsd;
  final int targetActions;
  final int expectedValidViews;
  final CampaignValueTier valueTier;
  final double minTrustScore;
  double spentUsd = 0.0;
  double reservedUsd = 0.0;

  bool get isExhausted => remainingBudgetUsd <= 0.0;

  double get campaignMultiplier {
    switch (valueTier) {
      case CampaignValueTier.high:
        return 1.3;
      case CampaignValueTier.standard:
        return 1.0;
      case CampaignValueTier.low:
        return 0.7;
    }
  }
}

/// Mutable per-user buckets for [RewardEngine] simulations.
///
/// **Not Rule 2–compliant as a system of record:** fields are updated directly by
/// this engine. Production-style truth should use [WalletLedgerEngine] (balances
/// derived from lots + ledger). Prefer extending issuance/ledger paths over
/// adding new direct mutations here when building accounting features.
final class Wallet {
  double availableUsd = 0.0;
  double pendingUsd = 0.0;
  double rCoins = 0.0;
  double iCoins = 0.0;
  double hCoins = 0.0;
  double kCoins = 0.0;
  double vCoins = 0.0;
}

final class FraudSignals {
  const FraudSignals({
    required this.noFraudFlags,
    this.hasReplayPattern = false,
    this.hasSpoofPattern = false,
    this.hasVelocityViolation = false,
  });

  final bool noFraudFlags;
  final bool hasReplayPattern;
  final bool hasSpoofPattern;
  final bool hasVelocityViolation;

  bool get isClean =>
      noFraudFlags &&
      !hasReplayPattern &&
      !hasSpoofPattern &&
      !hasVelocityViolation;
}

final class AttentionValueState {
  const AttentionValueState({
    required this.score,
    required this.confidence,
    required this.intent,
    required this.predictedDurationMs,
    required this.fraudRisk,
  });

  final double score; // 0..1
  final double confidence; // 0..1
  final String intent;
  final int predictedDurationMs;
  final double fraudRisk; // 0..1
}

final class RewardGateEvaluation {
  const RewardGateEvaluation({
    required this.granted,
    required this.partialRewardFactor,
    required this.reason,
  });

  final bool granted;
  final double partialRewardFactor;
  final String reason;
}

final class ConversionGateDecision {
  const ConversionGateDecision({
    required this.allowed,
    required this.requireAdditionalVerification,
    required this.reason,
    required this.policyVersionId,
  });

  final bool allowed;
  final bool requireAdditionalVerification;
  final String reason;

  /// Rule 7 — governance bundle that produced this conversion gate outcome.
  final String policyVersionId;
}

final class RewardValidationInput {
  const RewardValidationInput({
    required this.attentionPass,
    required this.completionPass,
    required this.fraudSignals,
    required this.now,
  });

  final bool attentionPass;
  final bool completionPass;
  final FraudSignals fraudSignals;
  final DateTime now;
}

final class WithdrawRequest {
  WithdrawRequest({
    required this.id,
    required this.userId,
    required this.amountUsd,
    required this.createdAt,
    required this.unlockAt,
  });

  final String id;
  final String userId;
  final double amountUsd;
  final DateTime createdAt;
  final DateTime unlockAt;
  bool completed = false;
}

final class RewardEngine {
  RewardEngine({
    this.minimumWithdrawUsd = 10.0,
    this.withdrawDelay = const Duration(hours: 12),
    this.attentionThreshold = 0.5,
    this.trustThresholdForWithdraw = 40.0,
    this.baseDailyEarningCapUsd = 18.0,
    this.viewerShare = 0.30,
    this.creatorShare = 0.60,
    this.platformShare = 0.10,
    this.repeatViewsPenaltyAfter = 3,
    this.repeatViewsPenaltyMultiplier = 0.2,
    this.maxViewsPerUserPerCampaign = 6,
    this.minRewardUsd = 0.01,
    this.maxRewardUsd = 50.0,
  });

  final double minimumWithdrawUsd;
  final Duration withdrawDelay;
  final double attentionThreshold;
  final double trustThresholdForWithdraw;
  final double baseDailyEarningCapUsd;
  final double viewerShare;
  final double creatorShare;
  final double platformShare;
  final int repeatViewsPenaltyAfter;
  final double repeatViewsPenaltyMultiplier;
  final int maxViewsPerUserPerCampaign;
  final double minRewardUsd;
  final double maxRewardUsd;

  final Map<String, Wallet> _walletsByUserId = <String, Wallet>{};
  final Map<String, PendingReward> _rewardsById = <String, PendingReward>{};
  final Map<String, CampaignBudget> _campaignsById = <String, CampaignBudget>{};
  final Map<String, WithdrawRequest> _withdrawById = <String, WithdrawRequest>{};
  final Map<String, RewardEvent> _rewardEventsById = <String, RewardEvent>{};
  final Map<String, RewardSplit> _rewardSplitsById = <String, RewardSplit>{};
  final Map<String, UserTrust> _trustByUserId = <String, UserTrust>{};
  final Map<String, List<TrustLog>> _trustLogsByUserId = <String, List<TrustLog>>{};
  final Map<String, DateTime> _earningCapWindowByUserId = <String, DateTime>{};
  final Map<String, double> _earnedTodayByUserId = <String, double>{};
  final Map<String, int> _viewsByUserCampaign = <String, int>{};
  double platformTreasuryUsd = 0.0;
  int _idCounter = 0;

  Wallet walletForUser(String userId) =>
      _walletsByUserId.putIfAbsent(userId, Wallet.new);

  UserTrust trustForUser(String userId) =>
      _trustByUserId.putIfAbsent(userId, () => UserTrust(userId: userId));

  List<TrustLog> trustLogsForUser(String userId) =>
      List<TrustLog>.unmodifiable(_trustLogsByUserId[userId] ?? const <TrustLog>[]);

  void registerCampaign(CampaignBudget campaign) {
    _campaignsById[campaign.id] = campaign;
  }

  CampaignBudget campaignById(String campaignId) {
    final campaign = _campaignsById[campaignId];
    if (campaign == null) {
      throw StateError('Campaign not found: $campaignId');
    }
    return campaign;
  }

  RewardEvent? rewardEventById(String rewardId) => _rewardEventsById[rewardId];
  RewardSplit? rewardSplitById(String rewardId) => _rewardSplitsById[rewardId];

  /// Low-level reservation API. Prefer [createPendingRewardFromVerification]
  /// so rewards are keyed only to sealed [AttentionVerificationResult] values.
  PendingReward createPendingReward({
    required String userId,
    required String campaignId,
    required double baseRewardUsd,
    required double attentionScore,
    String? creatorId,
    String? contentId,
    RewardType rewardType = RewardType.watch,
    double confidence = 1.0,
    double completionQuality = 1.0,
    double? demandMultiplier,
    required DateTime now,
    UserTrust? trust,
    double? trustScore,
    TrustTier? trustTier,
  }) {
    final effectiveTrust = trust ?? trustForUser(userId);
    final numericTrust =
        trustScore ?? effectiveTrust.trustScore.clamp(0.0, 100.0).toDouble();
    final tier = trustTier ?? tierForScore(numericTrust);
    final campaign = campaignById(campaignId);
    final isHighValueCampaign =
        campaign.rewardPerActionUsd >= 5.0 || baseRewardUsd >= 5.0;
    if (isHighValueCampaign && !canAccessHighValueCampaign(numericTrust)) {
      throw StateError(
        'High-value campaign blocked for trust '
        '${numericTrust.toStringAsFixed(1)}. Minimum is 40.',
      );
    }
    if (!isCampaignEligible(trustScore: numericTrust, campaign: campaign)) {
      throw StateError(
        'Trust score below campaign minimum: '
        '${numericTrust.toStringAsFixed(1)} < ${campaign.minTrustScore.toStringAsFixed(1)}.',
      );
    }
    final viewsForPair = _viewsFor(userId: userId, campaignId: campaignId);
    if (viewsForPair >= maxViewsPerUserPerCampaign) {
      throw StateError('Maximum views per campaign reached for this user.');
    }
    final normalizedAttention = attentionScore.clamp(0.0, 1.0).toDouble();
    final normalizedConfidence = confidence.clamp(0.0, 1.0).toDouble();
    final normalizedCompletion = completionQuality.clamp(0.0, 1.0).toDouble();
    final effectiveDemandMultiplier =
        demandMultiplier ?? computeDemandMultiplier(campaign);
    final trustMultiplier = rewardTrustMultiplier(numericTrust).clamp(0.5, 2.0);
    var pendingAmountUsd = calculateRewardAmount(
      baseRewardUsd: baseRewardUsd,
      verifiedAttention: normalizedAttention,
      confidence: normalizedConfidence,
      trustScore: numericTrust,
      campaign: campaign,
      supplyPressure: SupplyPressure.normal,
      completionQuality: normalizedCompletion,
      demandMultiplier: effectiveDemandMultiplier,
    );
    if (viewsForPair >= repeatViewsPenaltyAfter) {
      pendingAmountUsd *= repeatViewsPenaltyMultiplier;
    }
    pendingAmountUsd =
        pendingAmountUsd.clamp(minRewardUsd, maxRewardUsd).toDouble();
    _enforceEarningCap(
      userId: userId,
      amountUsd: pendingAmountUsd,
      trustScore: numericTrust,
      now: now,
    );
    if (campaign.remainingBudgetUsd < pendingAmountUsd) {
      throw StateError('Campaign budget exhausted for reward reservation.');
    }

    campaign.remainingBudgetUsd -= pendingAmountUsd;
    campaign.reservedUsd += pendingAmountUsd;

    final reward = PendingReward(
      id: _nextId('rw'),
      userId: userId,
      creatorId: creatorId ?? 'creator:$campaignId',
      contentId: contentId ?? 'content:$campaignId',
      campaignId: campaignId,
      rewardType: rewardType,
      baseRewardUsd: baseRewardUsd,
      attentionScore: normalizedAttention,
      confidence: normalizedConfidence,
      completionQuality: normalizedCompletion,
      demandMultiplier: effectiveDemandMultiplier,
      trustMultiplier: trustMultiplier,
      pendingAmountUsd: pendingAmountUsd,
      status: RewardStatus.pending,
      createdAt: now,
      unlockAt: now.add(trustPolicy(numericTrust, tier).unlockWindow),
    );

    _rewardsById[reward.id] = reward;
    _rewardEventsById[reward.id] = RewardEvent(
      id: reward.id,
      userId: reward.userId,
      contentId: reward.contentId,
      campaignId: reward.campaignId,
      attentionScore: reward.attentionScore,
      confidence: reward.confidence,
      baseReward: reward.baseRewardUsd,
      finalReward: reward.pendingAmountUsd,
      status: reward.status,
      createdAt: reward.createdAt,
    );
    final wallet = walletForUser(userId);
    wallet.pendingUsd += pendingAmountUsd;
    wallet.rCoins += pendingAmountUsd;
    _setViewsFor(
      userId: userId,
      campaignId: campaignId,
      views: viewsForPair + 1,
    );
    _appendTrustLog(
      userId: userId,
      timestamp: now,
      attentionIntegrity: normalizedAttention,
      fraudEvents: 0.0,
      behaviorScore: effectiveTrust.behaviorScore / 100.0,
      actions: <String>['earn'],
    );
    return reward;
  }

  /// Issues a pending reward only from a sealed verification record (not raw frames).
  PendingReward createPendingRewardFromVerification({
    required AttentionVerificationResult verification,
    required String campaignId,
    required double baseRewardUsd,
    required DateTime now,
    String? creatorId,
    RewardType rewardType = RewardType.watch,
    double? demandMultiplier,
    UserTrust? trust,
    double? trustScore,
    TrustTier? trustTier,
  }) {
    if (!verification.verified) {
      throw StateError(
        'Cannot create pending reward: verification failed '
        '(${verification.failureReason ?? 'unknown'}).',
      );
    }
    return createPendingReward(
      userId: verification.userId,
      campaignId: campaignId,
      baseRewardUsd: baseRewardUsd,
      attentionScore: verification.attentionScore,
      creatorId: creatorId,
      contentId: verification.contentId,
      rewardType: rewardType,
      confidence: verification.qualityScore,
      completionQuality: verification.qualityScore,
      demandMultiplier: demandMultiplier,
      now: now,
      trust: trust,
      trustScore: trustScore,
      trustTier: trustTier,
    );
  }

  RewardValidationResult validateReward({
    required String rewardId,
    required RewardValidationInput input,
    UserTrust? trust,
  }) {
    final reward = _rewardById(rewardId);
    final effectiveTrust = trust ?? trustForUser(reward.userId);
    if (reward.status != RewardStatus.pending &&
        reward.status != RewardStatus.verified) {
      return reward.status == RewardStatus.available
          ? RewardValidationResult.approved
          : RewardValidationResult.rejected;
    }

    final policy = trustPolicy(effectiveTrust.trustScore, effectiveTrust.tier);
    final attentionPass = input.attentionPass &&
        reward.attentionScore >=
            (attentionThreshold * policy.validationThreshold)
                .clamp(0.15, 0.95)
                .toDouble();
    if (!attentionPass || !input.completionPass || !input.fraudSignals.isClean) {
      if (!input.fraudSignals.isClean) {
        applyPenalty(
          userId: reward.userId,
          severity: TrustPenaltySeverity.major,
          reason: 'fraud_signal_on_validation',
          now: input.now,
        );
      } else if (!attentionPass) {
        applyPenalty(
          userId: reward.userId,
          severity: TrustPenaltySeverity.moderate,
          reason: 'failed_attention_verification',
          now: input.now,
        );
      }
      _rejectReward(reward);
      return RewardValidationResult.rejected;
    }
    if (reward.status == RewardStatus.pending) {
      _markRewardVerified(reward);
    }
    if (input.now.isBefore(reward.unlockAt)) {
      return RewardValidationResult.hold;
    }

    _approveReward(reward);
    return RewardValidationResult.approved;
  }

  RewardValidationResult validateRewardFromAttention({
    required String rewardId,
    required AttentionVerificationResult attention,
    required FraudSignals fraudSignals,
    required bool completionPass,
    required DateTime now,
    UserTrust? trust,
  }) {
    final attentionPass = attention.verified &&
        attention.attentionScore >= 0.65 &&
        attention.verifiedMs >= attention.requiredMs;
    final fraudPass = attention.fraudRisk <= 0.6 && fraudSignals.isClean;
    return validateReward(
      rewardId: rewardId,
      trust: trust,
      input: RewardValidationInput(
        attentionPass: attentionPass,
        completionPass: completionPass,
        fraudSignals: fraudSignals.copyWithNoFraudOverride(fraudPass),
        now: now,
      ),
    );
  }

  RewardGateEvaluation evaluateAttentionGate({
    required AttentionValueState attention,
    required int observedDurationMs,
    required int requiredDurationMs,
  }) {
    final score = attention.score.clamp(0.0, 1.0).toDouble();
    final risk = attention.fraudRisk.clamp(0.0, 1.0).toDouble();
    final durationOk = observedDurationMs >= requiredDurationMs;
    final passesCore = score >= 0.65 && durationOk && risk < 0.6;
    if (passesCore) {
      return RewardGateEvaluation(
        granted: true,
        partialRewardFactor: score,
        reason: 'approved',
      );
    }
    if (risk >= 0.8) {
      return const RewardGateEvaluation(
        granted: false,
        partialRewardFactor: 0.0,
        reason: 'fraud_risk_high',
      );
    }
    final reduced = (score * (1.0 - risk)).clamp(0.0, 1.0).toDouble();
    return RewardGateEvaluation(
      granted: reduced > 0.2,
      partialRewardFactor: reduced,
      reason: durationOk ? 'partial_attention' : 'partial_duration',
    );
  }

  ConversionGateDecision evaluateConversionGate({
    required double trustScore,
    required double threshold,
    required bool hasFraudFlags,
    required String activePolicyVersionId,
  }) {
    if (hasFraudFlags) {
      return ConversionGateDecision(
        allowed: false,
        requireAdditionalVerification: true,
        reason: 'fraud_flags',
        policyVersionId: activePolicyVersionId,
      );
    }
    if (requiresExtraConversionVerification(
      trustScore: trustScore,
      threshold: threshold,
    )) {
      return ConversionGateDecision(
        allowed: true,
        requireAdditionalVerification: true,
        reason: 'trust_below_threshold',
        policyVersionId: activePolicyVersionId,
      );
    }
    return ConversionGateDecision(
      allowed: true,
      requireAdditionalVerification: false,
      reason: 'trusted',
      policyVersionId: activePolicyVersionId,
    );
  }

  double convertAvailableUsdToICoins({
    required String userId,
    required double usdAmount,
  }) {
    final wallet = walletForUser(userId);
    if (usdAmount <= 0 || wallet.availableUsd < usdAmount) {
      throw StateError('Insufficient available balance for conversion.');
    }
    wallet.availableUsd -= usdAmount;
    wallet.iCoins += usdAmount; // 1 iCoin = $1 peg
    return usdAmount;
  }

  WithdrawRequest requestWithdraw({
    required String userId,
    required double usdAmount,
    required double trustScore,
    required bool hasFraudFlags,
    required DateTime now,
  }) {
    final wallet = walletForUser(userId);
    if (usdAmount < minimumWithdrawUsd) {
      throw StateError('Withdraw amount below minimum threshold.');
    }
    if (wallet.availableUsd < usdAmount) {
      throw StateError('Insufficient available balance.');
    }
    final tier = tierForScore(trustScore);
    final policy = trustPolicy(trustScore, tier);
    final limits = trustLimitsForScore(trustScore);
    if (!policy.withdrawAllowed ||
        trustScore < 50.0 ||
        trustScore < trustThresholdForWithdraw) {
      throw StateError('Trust score below withdrawal threshold.');
    }
    if (usdAmount > limits.withdrawalCapUsd && limits.withdrawalCapUsd > 0) {
      throw StateError(
        'Withdrawal amount exceeds trust cap: '
        '${usdAmount.toStringAsFixed(2)} > ${limits.withdrawalCapUsd.toStringAsFixed(2)}.',
      );
    }
    if (hasFraudFlags) {
      throw StateError('Withdrawal blocked by fraud flags.');
    }

    wallet.availableUsd -= usdAmount;
    final request = WithdrawRequest(
      id: _nextId('wd'),
      userId: userId,
      amountUsd: usdAmount,
      createdAt: now,
      unlockAt: now.add(policy.withdrawDelay),
    );
    _withdrawById[request.id] = request;
    _appendTrustLog(
      userId: userId,
      timestamp: now,
      attentionIntegrity: trustScore.clamp(0.0, 100.0).toDouble() / 100.0,
      fraudEvents: hasFraudFlags ? 1.0 : 0.0,
      behaviorScore: trustScore.clamp(0.0, 100.0).toDouble() / 100.0,
      actions: <String>['withdraw'],
    );
    return request;
  }

  bool completeWithdraw({
    required String withdrawId,
    required DateTime now,
  }) {
    final request = _withdrawById[withdrawId];
    if (request == null || request.completed || now.isBefore(request.unlockAt)) {
      return false;
    }
    request.completed = true;
    return true;
  }

  UserTrust updateTrustFromSession({
    required String userId,
    required SessionTrustSignal signal,
    required DateTime now,
  }) {
    final trust = trustForUser(userId);
    trust.behaviorScore = _computeBehaviorScore(signal);
    trust.attentionScoreAvg = (signal.avgAttentionScore * 100.0)
        .clamp(0.0, 100.0)
        .toDouble();
    trust.consistencyScore =
        (signal.consistencyScore * 100.0).clamp(0.0, 100.0).toDouble();
    trust.accountAgeScore = _accountAgeScore(signal.accountAgeDays);
    trust.deviceIntegrityScore =
        (signal.deviceStabilityScore * 100.0).clamp(0.0, 100.0).toDouble();
    trust.externalSignalScore =
        (signal.externalSignalScore * 100.0).clamp(0.0, 100.0).toDouble();

    final totalSessions = signal.totalSessions > 0
        ? signal.totalSessions
        : (signal.validSessions > 0 ? signal.validSessions : 1);
    final attentionIntegrity =
        (signal.validSessions / totalSessions).clamp(0.0, 1.0).toDouble();
    final features = TrustFeatures(
      attentionIntegrity: attentionIntegrity,
      avgAttentionScore: signal.avgAttentionScore.clamp(0.0, 1.0).toDouble(),
      fraudEvents: signal.fraudEvents.clamp(0.0, 1.0).toDouble(),
      anomalyScore: signal.anomalyScore.clamp(0.0, 1.0).toDouble(),
      sessionConsistency: signal.consistencyScore.clamp(0.0, 1.0).toDouble(),
      behavioralEntropy: (1.0 - signal.navigationEntropy).clamp(0.0, 1.0).toDouble(),
      conversionRate: signal.conversionRate.clamp(0.0, 1.0).toDouble(),
      withdrawalHistory: signal.withdrawalHistoryQuality.clamp(0.0, 1.0).toDouble(),
      accountAge: (signal.accountAgeDays / 365.0).clamp(0.0, 1.0).toDouble(),
      externalVerifications: signal.externalVerifications > 0
          ? signal.externalVerifications.clamp(0.0, 1.0).toDouble()
          : signal.externalSignalScore.clamp(0.0, 1.0).toDouble(),
    );
    final trustState = computeTrustState(features: features);
    trust.trustScore = trustState.score;
    trust.tier = tierForScore(trust.trustScore);
    trust.lastUpdated = now;
    if (signal.failedAttentionVerification) {
      applyPenalty(
        userId: userId,
        severity: TrustPenaltySeverity.moderate,
        reason: 'failed_attention_verification',
        now: now,
      );
    }
    _appendTrustLog(
      userId: userId,
      timestamp: now,
      attentionIntegrity: attentionIntegrity,
      fraudEvents: features.fraudEvents,
      behaviorScore: features.sessionConsistency,
      actions: <String>['session'],
    );
    return trust;
  }

  UserTrust applyPenalty({
    required String userId,
    required TrustPenaltySeverity severity,
    required String reason,
    required DateTime now,
  }) {
    final trust = trustForUser(userId);
    trust.trustScore = (trust.trustScore - severity.points).clamp(0.0, 100.0);
    trust.tier = tierForScore(trust.trustScore);
    trust.lastUpdated = now;
    if (!trust.flags.contains(reason)) {
      trust.flags.add(reason);
    }
    _appendTrustLog(
      userId: userId,
      timestamp: now,
      attentionIntegrity: trust.attentionScoreAvg / 100.0,
      fraudEvents: severity.points / 100.0,
      behaviorScore: trust.consistencyScore / 100.0,
      actions: <String>['penalty:$reason'],
    );
    return trust;
  }

  UserTrust recoverTrust({
    required String userId,
    required double cleanBehaviorQuality,
    required DateTime now,
  }) {
    final trust = trustForUser(userId);
    final recoveryDelta = (cleanBehaviorQuality.clamp(0.0, 1.0) * 1.8);
    trust.trustScore = (trust.trustScore + recoveryDelta).clamp(0.0, 100.0);
    trust.tier = tierForScore(trust.trustScore);
    trust.lastUpdated = now;
    if (cleanBehaviorQuality >= 0.9 && trust.flags.isNotEmpty) {
      trust.flags.removeAt(0);
    }
    _appendTrustLog(
      userId: userId,
      timestamp: now,
      attentionIntegrity: cleanBehaviorQuality.clamp(0.0, 1.0).toDouble(),
      fraudEvents: 0.0,
      behaviorScore: cleanBehaviorQuality.clamp(0.0, 1.0).toDouble(),
      actions: <String>['recover'],
    );
    return trust;
  }

  UserTrust applyRealtimeDecay({
    required String userId,
    required double inactivityDecay,
    required double anomalySpikes,
    required DateTime now,
  }) {
    final trust = trustForUser(userId);
    trust.trustScore = (trust.trustScore - inactivityDecay - anomalySpikes)
        .clamp(0.0, 100.0)
        .toDouble();
    trust.tier = tierForScore(trust.trustScore);
    trust.lastUpdated = now;
    _appendTrustLog(
      userId: userId,
      timestamp: now,
      attentionIntegrity: trust.attentionScoreAvg / 100.0,
      fraudEvents: anomalySpikes.clamp(0.0, 100.0).toDouble() / 100.0,
      behaviorScore: trust.consistencyScore / 100.0,
      actions: <String>['decay'],
    );
    return trust;
  }

  UserTrust recoverFromConsistentSessions({
    required String userId,
    required double consistentValidSessions,
    required DateTime now,
  }) {
    final trust = trustForUser(userId);
    final recovery = (consistentValidSessions.clamp(0.0, 1.0) * 3.0);
    trust.trustScore = (trust.trustScore + recovery).clamp(0.0, 100.0);
    trust.tier = tierForScore(trust.trustScore);
    trust.lastUpdated = now;
    _appendTrustLog(
      userId: userId,
      timestamp: now,
      attentionIntegrity: consistentValidSessions.clamp(0.0, 1.0).toDouble(),
      fraudEvents: 0.0,
      behaviorScore: consistentValidSessions.clamp(0.0, 1.0).toDouble(),
      actions: <String>['recovery'],
    );
    return trust;
  }

  static TrustTier tierForScore(double trustScore) {
    final score = trustScore.clamp(0.0, 100.0).toDouble();
    if (score < 30) return TrustTier.tier1Restricted;
    if (score < 55) return TrustTier.tier2Limited;
    if (score < 75) return TrustTier.tier3Standard;
    if (score < 90) return TrustTier.tier4Trusted;
    return TrustTier.tier5Premium;
  }

  bool isCampaignEligible({
    required double trustScore,
    required CampaignBudget campaign,
  }) =>
      trustScore >= campaign.minTrustScore;

  double rewardTrustMultiplier(double trustScore) {
    return switch (_trustTierIndex(trustScore)) {
      0 => 0.2,
      1 => 0.5,
      2 => 1.0,
      3 => 1.2,
      4 => 1.5,
      _ => 2.0,
    };
  }

  double systemAdjustmentMultiplier(SupplyPressure pressure) {
    switch (pressure) {
      case SupplyPressure.high:
        return 0.8;
      case SupplyPressure.low:
        return 1.2;
      case SupplyPressure.normal:
        return 1.0;
    }
  }

  double calculateBaseReward(CampaignBudget campaign) {
    if (campaign.expectedValidViews > 0) {
      return campaign.totalBudgetUsd / campaign.expectedValidViews;
    }
    return campaign.rewardPerActionUsd;
  }

  double calculateRewardAmount({
    required double baseRewardUsd,
    required double verifiedAttention,
    double confidence = 1.0,
    required double trustScore,
    required CampaignBudget campaign,
    required SupplyPressure supplyPressure,
    double completionQuality = 1.0,
    double demandMultiplier = 1.0,
  }) {
    final attention = verifiedAttention.clamp(0.0, 1.0).toDouble();
    final confidenceFactor = confidence.clamp(0.0, 1.0).toDouble();
    final completionFactor = completionQuality.clamp(0.0, 1.0).toDouble();
    final trustMultiplier = rewardTrustMultiplier(trustScore);
    final campaignMultiplier = campaign.campaignMultiplier;
    final systemMultiplier = systemAdjustmentMultiplier(supplyPressure);
    return baseRewardUsd *
        attention *
        confidenceFactor *
        completionFactor *
        trustMultiplier *
        demandMultiplier *
        campaignMultiplier *
        systemMultiplier;
  }

  double computeDemandMultiplier(CampaignBudget campaign) {
    final activeCampaigns = _campaignsById.values
        .where((c) => !c.isExhausted && c.remainingBudgetUsd > 0)
        .length;
    final competition = math.max(1.0, activeCampaigns / 3.0);
    final pressureBoost = (campaign.demandMultiplier * (1.0 + competition * 0.05))
        .clamp(0.8, 2.0);
    return pressureBoost.toDouble();
  }

  ({double viewer, double creator, double platform}) splitReward(double reward) {
    final viewer = reward * viewerShare;
    final creator = reward * creatorShare;
    final platform = reward * platformShare;
    return (viewer: viewer, creator: creator, platform: platform);
  }

  int campaignAccessLevelForScore(double trustScore) {
    return switch (tierForScore(trustScore)) {
      TrustTier.tier1Restricted => 1,
      TrustTier.tier2Limited => 2,
      TrustTier.tier3Standard => 3,
      TrustTier.tier4Trusted => 4,
      TrustTier.tier5Premium => 5,
    };
  }

  bool canAccessHighValueCampaign(double trustScore) =>
      trustScore >= 40.0 && campaignAccessLevelForScore(trustScore) >= 3;

  bool requiresExtraConversionVerification({
    required double trustScore,
    required double threshold,
  }) =>
      trustScore < threshold;

  TrustState trustStateForScore(double trustScore) {
    final score = trustScore.clamp(0.0, 100.0).toDouble();
    final tier = tierForScore(score);
    final multiplier = rewardTrustMultiplier(score);
    final limits = trustLimitsForScore(score);
    final flags = TrustFlags(
      suspicious: score < 55,
      restricted: score < 30,
      premium: score >= 90,
    );
    final tierNumber = switch (tier) {
      TrustTier.tier1Restricted => 1,
      TrustTier.tier2Limited => 2,
      TrustTier.tier3Standard => 3,
      TrustTier.tier4Trusted => 4,
      TrustTier.tier5Premium => 5,
    };
    return TrustState(
      score: score,
      tier: tierNumber,
      multiplier: multiplier,
      limits: limits,
      flags: flags,
    );
  }

  TrustLimits trustLimitsForScore(double trustScore) {
    switch (_trustTierIndex(trustScore)) {
      case 0:
        return const TrustLimits(
          dailyEarnCapUsd: 1.0,
          withdrawalCapUsd: 0.0,
          campaignAccessLevel: 1,
        );
      case 1:
        return const TrustLimits(
          dailyEarnCapUsd: 2.0,
          withdrawalCapUsd: 10.0,
          campaignAccessLevel: 2,
        );
      case 2:
        return const TrustLimits(
          dailyEarnCapUsd: 5.0,
          withdrawalCapUsd: 25.0,
          campaignAccessLevel: 3,
        );
      case 3:
        return const TrustLimits(
          dailyEarnCapUsd: 12.0,
          withdrawalCapUsd: 80.0,
          campaignAccessLevel: 4,
        );
      case 4:
        return const TrustLimits(
          dailyEarnCapUsd: 25.0,
          withdrawalCapUsd: 200.0,
          campaignAccessLevel: 5,
        );
      default:
        return const TrustLimits(
          dailyEarnCapUsd: 50.0,
          withdrawalCapUsd: 500.0,
          campaignAccessLevel: 5,
        );
    }
  }

  TrustState computeTrustState({
    required TrustFeatures features,
    double inactivityDecay = 0.0,
    double anomalySpikes = 0.0,
    double consistencyRecovery = 0.0,
  }) {
    final attentionIntegrity = features.attentionIntegrity.clamp(0.0, 1.0);
    final behaviorConsistency = ((features.sessionConsistency * 0.7) +
            ((1.0 - features.behavioralEntropy.clamp(0.0, 1.0)) * 0.3))
        .clamp(0.0, 1.0);
    final economicQuality = ((features.conversionRate * 0.7) +
            (features.withdrawalHistory * 0.3))
        .clamp(0.0, 1.0);
    final accountAge = features.accountAge.clamp(0.0, 1.0);
    final externalVerification = features.externalVerifications.clamp(0.0, 1.0);
    final fraudPenalty = ((features.fraudEvents * 0.4) +
            (features.anomalyScore * 0.6))
        .clamp(0.0, 1.0);

    var score = (attentionIntegrity * 30.0) +
        (behaviorConsistency * 20.0) +
        (economicQuality * 20.0) +
        (accountAge * 10.0) +
        (externalVerification * 10.0) -
        (fraudPenalty * 30.0);

    score -= inactivityDecay.clamp(0.0, 100.0);
    score -= anomalySpikes.clamp(0.0, 100.0);
    score += consistencyRecovery.clamp(0.0, 100.0);

    return trustStateForScore(score);
  }

  TrustPolicy trustPolicy(double trustScore, TrustTier tier) {
    final score = trustScore.clamp(0.0, 100.0).toDouble();
    switch (_trustTierIndex(score)) {
      case 0:
        return const TrustPolicy(
          unlockWindow: Duration(hours: 24),
          dailyEarningCapUsd: 1.0,
          withdrawAllowed: false,
          withdrawDelay: Duration(hours: 24),
          fraudSensitivity: FraudSensitivity.strict,
          validationThreshold: 1.35,
        );
      case 1:
        return const TrustPolicy(
          unlockWindow: Duration(hours: 24),
          dailyEarningCapUsd: 2.0,
          withdrawAllowed: true,
          withdrawDelay: Duration(hours: 18),
          fraudSensitivity: FraudSensitivity.strict,
          validationThreshold: 1.2,
        );
      case 2:
        return const TrustPolicy(
          unlockWindow: Duration(hours: 6),
          dailyEarningCapUsd: 5.0,
          withdrawAllowed: true,
          withdrawDelay: Duration(hours: 6),
          fraudSensitivity: FraudSensitivity.elevated,
          validationThreshold: 1.0,
        );
      case 3:
        return TrustPolicy(
          unlockWindow: const Duration(hours: 2),
          dailyEarningCapUsd: 12.0,
          withdrawAllowed: true,
          withdrawDelay: const Duration(hours: 2),
          fraudSensitivity: FraudSensitivity.relaxed,
          validationThreshold: score >= 70 ? 0.9 : 1.0,
        );
      case 4:
        return const TrustPolicy(
          unlockWindow: Duration(minutes: 15),
          dailyEarningCapUsd: 25.0,
          withdrawAllowed: true,
          withdrawDelay: Duration(minutes: 30),
          fraudSensitivity: FraudSensitivity.relaxed,
          validationThreshold: 0.85,
        );
      default:
        return const TrustPolicy(
          unlockWindow: Duration.zero,
          dailyEarningCapUsd: 50.0,
          withdrawAllowed: true,
          withdrawDelay: Duration(minutes: 5),
          fraudSensitivity: FraudSensitivity.relaxed,
          validationThreshold: 0.8,
        );
    }
  }

  double _earningCapFactor(TrustTier tier) {
    switch (tier) {
      case TrustTier.tier1Restricted:
        return 0.45;
      case TrustTier.tier2Limited:
        return 0.9;
      case TrustTier.tier3Standard:
        return 1.6;
      case TrustTier.tier4Trusted:
        return 2.7;
      case TrustTier.tier5Premium:
        return 4.5;
    }
  }

  PendingReward _rewardById(String rewardId) {
    final reward = _rewardsById[rewardId];
    if (reward == null) {
      throw StateError('Reward not found: $rewardId');
    }
    return reward;
  }

  void _approveReward(PendingReward reward) {
    final wallet = walletForUser(reward.userId);
    final creatorWallet = walletForUser(reward.creatorId);
    final campaign = campaignById(reward.campaignId);
    // Rule 3: no reward approval without a prior campaign budget lock for this amount.
    if (campaign.reservedUsd + 1e-9 < reward.pendingAmountUsd) {
      throw StateError(
        'Campaign budget reserve missing or insufficient for approval '
        '(reservedUsd=${campaign.reservedUsd}, pending=${reward.pendingAmountUsd}).',
      );
    }
    reward.status = RewardStatus.available;
    wallet.pendingUsd -= reward.pendingAmountUsd;
    wallet.rCoins -= reward.pendingAmountUsd;
    final split = splitReward(reward.pendingAmountUsd);
    wallet.availableUsd += split.viewer;
    creatorWallet.availableUsd += split.creator;
    platformTreasuryUsd += split.platform;
    _routeRewardCoins(wallet: wallet, rewardType: reward.rewardType, amount: split.viewer);
    _routeRewardCoins(
      wallet: creatorWallet,
      rewardType: RewardType.campaign,
      amount: split.creator,
    );
    _rewardSplitsById[reward.id] = RewardSplit(
      rewardId: reward.id,
      viewerAmount: split.viewer,
      creatorAmount: split.creator,
      platformAmount: split.platform,
    );
    final event = _rewardEventsById[reward.id];
    if (event != null) {
      _rewardEventsById[reward.id] = RewardEvent(
        id: event.id,
        userId: event.userId,
        contentId: event.contentId,
        campaignId: event.campaignId,
        attentionScore: event.attentionScore,
        confidence: event.confidence,
        baseReward: event.baseReward,
        finalReward: event.finalReward,
        status: reward.status,
        createdAt: event.createdAt,
      );
    }
    campaign.reservedUsd -= reward.pendingAmountUsd;
    campaign.spentUsd += reward.pendingAmountUsd;
  }

  void _rejectReward(PendingReward reward) {
    final wallet = walletForUser(reward.userId);
    final campaign = campaignById(reward.campaignId);
    reward.status = RewardStatus.rejected;
    wallet.pendingUsd -= reward.pendingAmountUsd;
    wallet.rCoins -= reward.pendingAmountUsd;
    campaign.reservedUsd -= reward.pendingAmountUsd;
    campaign.remainingBudgetUsd += reward.pendingAmountUsd;
    final event = _rewardEventsById[reward.id];
    if (event != null) {
      _rewardEventsById[reward.id] = RewardEvent(
        id: event.id,
        userId: event.userId,
        contentId: event.contentId,
        campaignId: event.campaignId,
        attentionScore: event.attentionScore,
        confidence: event.confidence,
        baseReward: event.baseReward,
        finalReward: event.finalReward,
        status: reward.status,
        createdAt: event.createdAt,
      );
    }
  }

  void _markRewardVerified(PendingReward reward) {
    reward.status = RewardStatus.verified;
    final event = _rewardEventsById[reward.id];
    if (event != null) {
      _rewardEventsById[reward.id] = RewardEvent(
        id: event.id,
        userId: event.userId,
        contentId: event.contentId,
        campaignId: event.campaignId,
        attentionScore: event.attentionScore,
        confidence: event.confidence,
        baseReward: event.baseReward,
        finalReward: event.finalReward,
        status: reward.status,
        createdAt: event.createdAt,
      );
    }
  }

  int _viewsFor({required String userId, required String campaignId}) {
    return _viewsByUserCampaign['$userId::$campaignId'] ?? 0;
  }

  void _setViewsFor({
    required String userId,
    required String campaignId,
    required int views,
  }) {
    _viewsByUserCampaign['$userId::$campaignId'] = views;
  }

  void _routeRewardCoins({
    required Wallet wallet,
    required RewardType rewardType,
    required double amount,
  }) {
    switch (rewardType) {
      case RewardType.watch:
        wallet.iCoins += amount;
        break;
      case RewardType.healthTracking:
        wallet.hCoins += amount;
        break;
      case RewardType.learning:
        wallet.kCoins += amount;
        break;
      case RewardType.campaign:
        wallet.vCoins += amount;
        break;
    }
  }

  void _enforceEarningCap({
    required String userId,
    required double amountUsd,
    required double trustScore,
    required DateTime now,
  }) {
    final dayStart = DateTime(now.year, now.month, now.day);
    final currentWindow = _earningCapWindowByUserId[userId];
    if (currentWindow == null || currentWindow != dayStart) {
      _earningCapWindowByUserId[userId] = dayStart;
      _earnedTodayByUserId[userId] = 0.0;
    }

    final tier = tierForScore(trustScore);
    final policyCap = trustPolicy(trustScore, tier).dailyEarningCapUsd;
    final scaledBaseCap = baseDailyEarningCapUsd * _earningCapFactor(tier);
    final cap = policyCap < scaledBaseCap ? policyCap : scaledBaseCap;
    final current = _earnedTodayByUserId[userId] ?? 0.0;
    if (current + amountUsd > cap) {
      throw StateError(
        'Daily earning cap exceeded for current trust tier. '
        'Attempted ${(current + amountUsd).toStringAsFixed(2)} > ${cap.toStringAsFixed(2)} USD.',
      );
    }
    _earnedTodayByUserId[userId] = current + amountUsd;
  }

  double _computeBehaviorScore(SessionTrustSignal signal) {
    final durationNorm = (signal.sessionDurationSeconds / 480.0).clamp(0.0, 1.0);
    final diversity = signal.interactionDiversity.clamp(0.0, 1.0);
    final completion = signal.campaignCompletionRate.clamp(0.0, 1.0);
    final entropy = signal.navigationEntropy.clamp(0.0, 1.0);
    final antiLoop = (1.0 - signal.loopRepetitionRatio).clamp(0.0, 1.0);
    final timing = signal.timingVariance.clamp(0.0, 1.0);

    final raw = (durationNorm * 0.2) +
        (diversity * 0.2) +
        (completion * 0.2) +
        (entropy * 0.2) +
        (antiLoop * 0.1) +
        (timing * 0.1);
    return (raw * 100.0).clamp(0.0, 100.0).toDouble();
  }

  double _accountAgeScore(int accountAgeDays) {
    return ((accountAgeDays / 180.0) * 100.0).clamp(0.0, 100.0).toDouble();
  }

  void _appendTrustLog({
    required String userId,
    required DateTime timestamp,
    required double attentionIntegrity,
    required double fraudEvents,
    required double behaviorScore,
    required List<String> actions,
  }) {
    final trust = trustForUser(userId);
    final state = trustStateForScore(trust.trustScore);
    final logs = _trustLogsByUserId.putIfAbsent(userId, () => <TrustLog>[]);
    logs.add(
      TrustLog(
        userId: userId,
        timestamp: timestamp,
        trustScore: state.score,
        tier: state.tier,
        attentionIntegrity: attentionIntegrity.clamp(0.0, 1.0).toDouble(),
        fraudEvents: fraudEvents.clamp(0.0, 1.0).toDouble(),
        behaviorScore: behaviorScore.clamp(0.0, 1.0).toDouble(),
        actions: List<String>.from(actions),
      ),
    );
    if (logs.length > 500) {
      logs.removeRange(0, logs.length - 500);
    }
  }


  String _nextId(String prefix) {
    _idCounter += 1;
    return '$prefix-$_idCounter';
  }

  int _trustTierIndex(double trustScore) {
    final score = trustScore.clamp(0.0, 100.0).toDouble();
    if (score < 20) return 0;
    if (score < 40) return 1;
    if (score < 60) return 2;
    if (score < 75) return 3;
    if (score < 90) return 4;
    return 5;
  }
}

extension on FraudSignals {
  FraudSignals copyWithNoFraudOverride(bool noFraud) {
    return FraudSignals(
      noFraudFlags: noFraud,
      hasReplayPattern: hasReplayPattern,
      hasSpoofPattern: hasSpoofPattern,
      hasVelocityViolation: hasVelocityViolation,
    );
  }
}
