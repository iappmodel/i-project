// CLIENT SIMULATION / NON-AUTHORITATIVE
// This module is for client-side preview/simulation UX only.
// It must not be treated as the canonical writer for economy, wallet, trust, fraud, campaign, or POPS economic state.
// Backend/API source-of-truth ownership is documented in:
// docs/source-of-truth-ownership-contract.md
// docs/runtime-wiring-matrix.md

import 'dart:math' as math;

import 'package:eye_tracking_app/policy_version.dart';

// --- 2.5 Trust Score Engine (canonical snapshot) ---

/// Wire values match product spec:
/// `"new" | "low" | "normal" | "trusted" | "high_trust" | "restricted"`.
enum TrustScoreLevel {
  newUser,
  low,
  normal,
  trusted,
  highTrust,
  restricted,
}

extension TrustScoreLevelWire on TrustScoreLevel {
  String get wireName => switch (this) {
        TrustScoreLevel.newUser => 'new',
        TrustScoreLevel.low => 'low',
        TrustScoreLevel.normal => 'normal',
        TrustScoreLevel.trusted => 'trusted',
        TrustScoreLevel.highTrust => 'high_trust',
        TrustScoreLevel.restricted => 'restricted',
      };

  static TrustScoreLevel? tryParse(String wire) => switch (wire) {
        'new' => TrustScoreLevel.newUser,
        'low' => TrustScoreLevel.low,
        'normal' => TrustScoreLevel.normal,
        'trusted' => TrustScoreLevel.trusted,
        'high_trust' => TrustScoreLevel.highTrust,
        'restricted' => TrustScoreLevel.restricted,
        _ => null,
      };
}

/// All inputs used to derive [TrustScoreSnapshot].
final class TrustScoreInputs {
  const TrustScoreInputs({
    required this.userId,
    required this.accountAge,
    required this.verifiedAttentionQuality,
    required this.rewardClaimHistoryScore,
    required this.fraudFlags,
    required this.deviceConsistency,
    required this.behaviorConsistency,
    this.chargebackClawbackCount = 0,
    required this.withdrawalHistoryScore,
    this.campaignAbuseIndicatorCount = 0,
    this.identityVerificationLevel = 0,
    this.rewardFrozen = false,
  });

  final String userId;
  final Duration accountAge;

  /// 0..1 — verified attention / quality from attention pipeline.
  final double verifiedAttentionQuality;

  /// 0..1 — higher means cleaner claim history (reversals, disputes).
  final double rewardClaimHistoryScore;

  final TrustFlags fraudFlags;

  /// 0..1 — device fingerprint / session stability.
  final double deviceConsistency;

  /// 0..1 — temporal and interaction pattern stability.
  final double behaviorConsistency;

  final int chargebackClawbackCount;

  /// 0..1 — successful withdrawals vs flags.
  final double withdrawalHistoryScore;

  final int campaignAbuseIndicatorCount;

  /// 0 = none, 5 = strongest (document + biometric + payment).
  final int identityVerificationLevel;

  /// When true, user is treated as payout-frozen (maps to restricted limits).
  final bool rewardFrozen;
}

/// Canonical trust snapshot (spec 2.5).
final class TrustScoreSnapshot {
  const TrustScoreSnapshot({
    required this.userId,
    required this.score,
    required this.level,
    required this.payoutDelayHours,
    required this.dailyEarnLimit,
    required this.dailyWithdrawalLimit,
    required this.campaignAccessTier,
    required this.riskFlags,
    required this.positiveSignals,
    required this.updatedAt,
    required this.policyVersionId,
  });

  final String userId;

  /// 0..1000
  final int score;
  final TrustScoreLevel level;
  final double payoutDelayHours;
  final double dailyEarnLimit;
  final double dailyWithdrawalLimit;
  final int campaignAccessTier;
  final List<String> riskFlags;
  final List<String> positiveSignals;

  /// ISO-8601 UTC string.
  final String updatedAt;

  /// Rule 7 — governance bundle that produced this snapshot.
  final String policyVersionId;

  String get levelWire => level.wireName;

  Map<String, Object?> toJson() => {
        'userId': userId,
        'score': score,
        'level': levelWire,
        'payoutDelayHours': payoutDelayHours,
        'dailyEarnLimit': dailyEarnLimit,
        'dailyWithdrawalLimit': dailyWithdrawalLimit,
        'campaignAccessTier': campaignAccessTier,
        'riskFlags': riskFlags,
        'positiveSignals': positiveSignals,
        'updatedAt': updatedAt,
        'policyVersionId': policyVersionId,
      };

  factory TrustScoreSnapshot.fromJson(Map<String, Object?> json) {
    final levelStr = json['level'] as String? ?? 'restricted';
    final parsed = TrustScoreLevelWire.tryParse(levelStr) ?? TrustScoreLevel.restricted;
    return TrustScoreSnapshot(
      userId: json['userId'] as String? ?? '',
      score: (json['score'] as num?)?.round() ?? 0,
      level: parsed,
      payoutDelayHours: (json['payoutDelayHours'] as num?)?.toDouble() ?? 0,
      dailyEarnLimit: (json['dailyEarnLimit'] as num?)?.toDouble() ?? 0,
      dailyWithdrawalLimit: (json['dailyWithdrawalLimit'] as num?)?.toDouble() ?? 0,
      campaignAccessTier: (json['campaignAccessTier'] as num?)?.round() ?? 0,
      riskFlags: List<String>.from(json['riskFlags'] as List? ?? const []),
      positiveSignals: List<String>.from(json['positiveSignals'] as List? ?? const []),
      updatedAt: json['updatedAt'] as String? ?? '',
      policyVersionId:
          json['policyVersionId'] as String? ?? kBootstrapPolicyVersionId,
    );
  }
}

enum TrustEventType {
  fullAttention,
  tabSwitchDetected,
  repeatedPattern,
  abnormalTiming,
  identicalSession,
  scriptedBehavior,
  sensorSpoofing,
  multiAccountDetected,
  manualAdjustment,
}

final class TrustSignalInput {
  const TrustSignalInput({
    required this.behaviorScore,
    required this.attentionScore,
    required this.deviceScore,
    required this.economicScore,
    required this.networkScore,
  });

  // Normalized to 0..1.
  final double behaviorScore;
  final double attentionScore;
  final double deviceScore;
  final double economicScore;
  final double networkScore;
}

final class TrustFlags {
  const TrustFlags({
    this.multiAccountDetected = false,
    this.scriptedBehavior = false,
    this.sensorSpoofing = false,
    this.abnormalTiming = false,
    this.identicalSessions = false,
    this.lowEntropyInteractions = false,
    this.recentHardFlag = false,
  });

  final bool multiAccountDetected;
  final bool scriptedBehavior;
  final bool sensorSpoofing;
  final bool abnormalTiming;
  final bool identicalSessions;
  final bool lowEntropyInteractions;
  final bool recentHardFlag;

  bool get hasHardFlag => multiAccountDetected || scriptedBehavior || sensorSpoofing;

  bool get hasSoftFlag => abnormalTiming || identicalSessions || lowEntropyInteractions;
}

final class TrustProfile {
  const TrustProfile({
    required this.userId,
    required this.trustScore,
    required this.trustTier,
    required this.trustMultiplier,
    required this.behaviorScore,
    required this.attentionScore,
    required this.deviceScore,
    required this.economicScore,
    required this.networkScore,
    required this.lastUpdated,
    this.rewardFrozen = false,
  });

  final String userId;
  final double trustScore; // 0..100
  final int trustTier; // 0..5
  final double trustMultiplier; // 0.2..2.0
  final double behaviorScore;
  final double attentionScore;
  final double deviceScore;
  final double economicScore;
  final double networkScore;
  final DateTime lastUpdated;
  final bool rewardFrozen;
}

final class TrustEvent {
  const TrustEvent({
    required this.userId,
    required this.eventType,
    required this.delta,
    required this.source,
    required this.metadata,
    required this.createdAt,
  });

  final String userId;
  final TrustEventType eventType;
  final double delta;
  final String source;
  final Map<String, Object?> metadata;
  final DateTime createdAt;
}

final class TrustLimits {
  const TrustLimits({
    required this.dailyRewardCap,
    required this.withdrawalLimit,
    required this.campaignAccessTier,
    required this.blocked,
  });

  final double dailyRewardCap;
  final double withdrawalLimit;
  final int campaignAccessTier;
  final bool blocked;
}

final class WithdrawalGateDecision {
  const WithdrawalGateDecision({
    required this.allowed,
    required this.reason,
    required this.requireAdditionalVerification,
    required this.policyVersionId,
  });

  final bool allowed;
  final String reason;
  final bool requireAdditionalVerification;

  /// Rule 7 — governance bundle that produced this gate outcome.
  final String policyVersionId;
}

final class TrustEngine {
  const TrustEngine({
    this.behaviorWeight = 0.25,
    this.attentionWeight = 0.30,
    this.deviceWeight = 0.15,
    this.economicWeight = 0.15,
    this.networkWeight = 0.15,
    this.inactivityDailyDecay = 0.98,
  });

  final double behaviorWeight;
  final double attentionWeight;
  final double deviceWeight;
  final double economicWeight;
  final double networkWeight;
  final double inactivityDailyDecay;

  /// Derives [TrustScoreSnapshot] from structured risk/behavior inputs (spec 2.5).
  TrustScoreSnapshot computeTrustScoreSnapshot({
    required TrustScoreInputs inputs,
    required DateTime now,
    required String activePolicyVersionId,
  }) {
    final risk = <String>[];
    final positive = <String>[];

    if (inputs.fraudFlags.hasHardFlag) {
      risk.add('hard_fraud_signal');
    }
    if (inputs.fraudFlags.multiAccountDetected) risk.add('multi_account');
    if (inputs.fraudFlags.scriptedBehavior) risk.add('scripted_behavior');
    if (inputs.fraudFlags.sensorSpoofing) risk.add('sensor_spoofing');
    if (inputs.fraudFlags.abnormalTiming) risk.add('abnormal_timing');
    if (inputs.fraudFlags.identicalSessions) risk.add('identical_sessions');
    if (inputs.fraudFlags.lowEntropyInteractions) risk.add('low_entropy_interactions');
    if (inputs.fraudFlags.recentHardFlag) risk.add('recent_hard_flag');
    if (inputs.chargebackClawbackCount > 0) {
      risk.add('chargeback_clawback_history');
    }
    if (inputs.campaignAbuseIndicatorCount > 0) {
      risk.add('campaign_abuse_indicators');
    }
    if (inputs.rewardFrozen) risk.add('reward_frozen');

    void addPositive(String code, bool condition) {
      if (condition) positive.add(code);
    }

    addPositive('strong_verified_attention', inputs.verifiedAttentionQuality >= 0.82);
    addPositive('clean_reward_claims', inputs.rewardClaimHistoryScore >= 0.85);
    addPositive('consistent_device', inputs.deviceConsistency >= 0.8);
    addPositive('consistent_behavior', inputs.behaviorConsistency >= 0.8);
    addPositive('stable_withdrawals', inputs.withdrawalHistoryScore >= 0.85);
    addPositive('aged_account', inputs.accountAge.inDays >= 90);
    addPositive('identity_verified', inputs.identityVerificationLevel >= 3);

    final raw = _rawTrustScore1000(inputs);
    final restricted = inputs.rewardFrozen ||
        inputs.fraudFlags.hasHardFlag ||
        (raw < 120 &&
            (inputs.chargebackClawbackCount >= 2 ||
                inputs.campaignAbuseIndicatorCount >= 3));

    final level = _trustLevelFor(
      inputs: inputs,
      rawScore: raw,
      forceRestricted: restricted,
    );

    final score = switch (level) {
      TrustScoreLevel.restricted => 0,
      _ => raw.round().clamp(0, 1000),
    };

    final limits = _snapshotLimits(level);

    return TrustScoreSnapshot(
      userId: inputs.userId,
      score: score,
      level: level,
      payoutDelayHours: limits.payoutDelayHours,
      dailyEarnLimit: limits.dailyEarnLimit,
      dailyWithdrawalLimit: limits.dailyWithdrawalLimit,
      campaignAccessTier: limits.campaignAccessTier,
      riskFlags: risk..sort(),
      positiveSignals: positive..sort(),
      updatedAt: now.toUtc().toIso8601String(),
      policyVersionId: activePolicyVersionId,
    );
  }

  TrustProfile computeProfile({
    required String userId,
    required TrustSignalInput signals,
    required DateTime now,
  }) {
    final score = computeTrustScore(signals);
    return _profileFromScore(
      userId: userId,
      score: score,
      signals: signals,
      now: now,
      rewardFrozen: false,
    );
  }

  double computeTrustScore(TrustSignalInput signals) {
    final weighted = (behaviorWeight * _to100(signals.behaviorScore)) +
        (attentionWeight * _to100(signals.attentionScore)) +
        (deviceWeight * _to100(signals.deviceScore)) +
        (economicWeight * _to100(signals.economicScore)) +
        (networkWeight * _to100(signals.networkScore));
    return weighted.clamp(0.0, 100.0).toDouble();
  }

  TrustProfile applyRealtimeEvent({
    required TrustProfile current,
    required TrustEventType eventType,
    required DateTime now,
  }) {
    final delta = deltaForEvent(eventType);
    final nextScore = (current.trustScore + delta).clamp(0.0, 100.0).toDouble();
    final rewardFrozen = current.rewardFrozen ||
        eventType == TrustEventType.multiAccountDetected ||
        eventType == TrustEventType.scriptedBehavior ||
        eventType == TrustEventType.sensorSpoofing;
    return _profileFromScore(
      userId: current.userId,
      score: nextScore,
      signals: TrustSignalInput(
        behaviorScore: current.behaviorScore / 100.0,
        attentionScore: current.attentionScore / 100.0,
        deviceScore: current.deviceScore / 100.0,
        economicScore: current.economicScore / 100.0,
        networkScore: current.networkScore / 100.0,
      ),
      now: now,
      rewardFrozen: rewardFrozen,
    );
  }

  TrustProfile applyDailyDecay({
    required TrustProfile current,
    required int inactiveDays,
    required DateTime now,
  }) {
    if (inactiveDays <= 0) return current;
    final decayed = current.trustScore * math.pow(inactivityDailyDecay, inactiveDays);
    return _profileFromScore(
      userId: current.userId,
      score: decayed.toDouble(),
      signals: TrustSignalInput(
        behaviorScore: current.behaviorScore / 100.0,
        attentionScore: current.attentionScore / 100.0,
        deviceScore: current.deviceScore / 100.0,
        economicScore: current.economicScore / 100.0,
        networkScore: current.networkScore / 100.0,
      ),
      now: now,
      rewardFrozen: current.rewardFrozen,
    );
  }

  TrustProfile applyFraudFlags({
    required TrustProfile current,
    required TrustFlags flags,
    required DateTime now,
  }) {
    if (flags.hasHardFlag) {
      return _profileFromScore(
        userId: current.userId,
        score: 0.0,
        signals: TrustSignalInput(
          behaviorScore: current.behaviorScore / 100.0,
          attentionScore: current.attentionScore / 100.0,
          deviceScore: current.deviceScore / 100.0,
          economicScore: current.economicScore / 100.0,
          networkScore: current.networkScore / 100.0,
        ),
        now: now,
        rewardFrozen: true,
      );
    }

    if (!flags.hasSoftFlag) {
      return current;
    }

    final penalty = (flags.abnormalTiming ? 1.2 : 0.0) +
        (flags.identicalSessions ? 2.0 : 0.0) +
        (flags.lowEntropyInteractions ? 1.5 : 0.0);
    final nextScore = (current.trustScore - penalty).clamp(0.0, 100.0).toDouble();

    return _profileFromScore(
      userId: current.userId,
      score: nextScore,
      signals: TrustSignalInput(
        behaviorScore: current.behaviorScore / 100.0,
        attentionScore: current.attentionScore / 100.0,
        deviceScore: current.deviceScore / 100.0,
        economicScore: current.economicScore / 100.0,
        networkScore: current.networkScore / 100.0,
      ),
      now: now,
      rewardFrozen: current.rewardFrozen || flags.recentHardFlag,
    );
  }

  double deltaForEvent(TrustEventType eventType) {
    return switch (eventType) {
      TrustEventType.fullAttention => 0.3,
      TrustEventType.tabSwitchDetected => -1.2,
      TrustEventType.repeatedPattern => -3.0,
      TrustEventType.abnormalTiming => -1.0,
      TrustEventType.identicalSession => -2.0,
      TrustEventType.scriptedBehavior => -100.0,
      TrustEventType.sensorSpoofing => -100.0,
      TrustEventType.multiAccountDetected => -100.0,
      TrustEventType.manualAdjustment => 0.0,
    };
  }

  int trustTierForScore(double trustScore) {
    final score = trustScore.clamp(0.0, 100.0).toDouble();
    if (score <= 20) return 0;
    if (score <= 40) return 1;
    if (score <= 60) return 2;
    if (score <= 75) return 3;
    if (score <= 90) return 4;
    return 5;
  }

  double trustMultiplierForTier(int tier) {
    return switch (tier) {
      0 => 0.2,
      1 => 0.5,
      2 => 1.0,
      3 => 1.2,
      4 => 1.5,
      _ => 2.0,
    };
  }

  TrustLimits limitsForProfile(TrustProfile profile) {
    final tier = profile.trustTier;
    return switch (tier) {
      0 => const TrustLimits(
          dailyRewardCap: 0.0,
          withdrawalLimit: 0.0,
          campaignAccessTier: 0,
          blocked: true,
        ),
      1 => const TrustLimits(
          dailyRewardCap: 10.0,
          withdrawalLimit: 5.0,
          campaignAccessTier: 1,
          blocked: false,
        ),
      2 => const TrustLimits(
          dailyRewardCap: 50.0,
          withdrawalLimit: 25.0,
          campaignAccessTier: 2,
          blocked: false,
        ),
      3 => const TrustLimits(
          dailyRewardCap: 120.0,
          withdrawalLimit: 80.0,
          campaignAccessTier: 3,
          blocked: false,
        ),
      4 => const TrustLimits(
          dailyRewardCap: 250.0,
          withdrawalLimit: 150.0,
          campaignAccessTier: 4,
          blocked: false,
        ),
      _ => const TrustLimits(
          dailyRewardCap: 500.0,
          withdrawalLimit: 300.0,
          campaignAccessTier: 5,
          blocked: false,
        ),
    };
  }

  WithdrawalGateDecision evaluateWithdrawalGate({
    required TrustProfile profile,
    required TrustFlags flags,
    required bool verificationChecksPass,
    required String activePolicyVersionId,
    double minimumScore = 60.0,
  }) {
    if (profile.rewardFrozen || flags.hasHardFlag) {
      return WithdrawalGateDecision(
        allowed: false,
        reason: 'hard_flag_or_frozen',
        requireAdditionalVerification: true,
        policyVersionId: activePolicyVersionId,
      );
    }
    if (profile.trustScore < minimumScore) {
      return WithdrawalGateDecision(
        allowed: false,
        reason: 'trust_below_threshold',
        requireAdditionalVerification: true,
        policyVersionId: activePolicyVersionId,
      );
    }
    if (!verificationChecksPass) {
      return WithdrawalGateDecision(
        allowed: false,
        reason: 'verification_failed',
        requireAdditionalVerification: true,
        policyVersionId: activePolicyVersionId,
      );
    }
    if (flags.hasSoftFlag) {
      return WithdrawalGateDecision(
        allowed: false,
        reason: 'under_review_soft_flags',
        requireAdditionalVerification: true,
        policyVersionId: activePolicyVersionId,
      );
    }
    return WithdrawalGateDecision(
      allowed: true,
      reason: 'trusted',
      requireAdditionalVerification: false,
      policyVersionId: activePolicyVersionId,
    );
  }

  double applyRewardTrustMultiplier({
    required double baseReward,
    required TrustProfile profile,
  }) {
    return baseReward * profile.trustMultiplier;
  }

  TrustProfile _profileFromScore({
    required String userId,
    required double score,
    required TrustSignalInput signals,
    required DateTime now,
    required bool rewardFrozen,
  }) {
    final normalizedScore = score.clamp(0.0, 100.0).toDouble();
    final tier = trustTierForScore(normalizedScore);
    final multiplier = trustMultiplierForTier(tier);
    return TrustProfile(
      userId: userId,
      trustScore: normalizedScore,
      trustTier: tier,
      trustMultiplier: multiplier,
      behaviorScore: _to100(signals.behaviorScore),
      attentionScore: _to100(signals.attentionScore),
      deviceScore: _to100(signals.deviceScore),
      economicScore: _to100(signals.economicScore),
      networkScore: _to100(signals.networkScore),
      lastUpdated: now,
      rewardFrozen: rewardFrozen,
    );
  }

  double _to100(double normalized) => normalized.clamp(0.0, 1.0).toDouble() * 100.0;
}

double _norm01(double x) => x.clamp(0.0, 1.0).toDouble();

double _rawTrustScore1000(TrustScoreInputs i) {
  if (i.fraudFlags.hasHardFlag) return 0;

  var s = 0.0;
  s += _norm01(i.verifiedAttentionQuality) * 260;
  s += _norm01(i.rewardClaimHistoryScore) * 170;
  s += _norm01(i.deviceConsistency) * 160;
  s += _norm01(i.behaviorConsistency) * 160;
  s += _norm01(i.withdrawalHistoryScore) * 110;
  s += (i.identityVerificationLevel.clamp(0, 5) / 5.0) * 140;

  final days = i.accountAge.inDays;
  s += (days / 120.0).clamp(0.0, 1.0) * 70;
  s += (days / 600.0).clamp(0.0, 1.0) * 40;

  s -= math.min(450, i.chargebackClawbackCount * 110.0);
  s -= math.min(280, i.campaignAbuseIndicatorCount * 55.0);

  if (i.fraudFlags.hasSoftFlag) s -= 55;
  if (i.fraudFlags.abnormalTiming) s -= 25;
  if (i.fraudFlags.identicalSessions) s -= 35;
  if (i.fraudFlags.lowEntropyInteractions) s -= 30;

  return s.clamp(0.0, 1000.0).toDouble();
}

TrustScoreLevel _trustLevelFor({
  required TrustScoreInputs inputs,
  required double rawScore,
  required bool forceRestricted,
}) {
  if (forceRestricted) return TrustScoreLevel.restricted;
  if (inputs.accountAge.inDays < 14) return TrustScoreLevel.newUser;
  if (rawScore < 380) return TrustScoreLevel.low;
  if (rawScore < 580) return TrustScoreLevel.normal;
  if (rawScore < 820) return TrustScoreLevel.trusted;
  return TrustScoreLevel.highTrust;
}

({
  double payoutDelayHours,
  double dailyEarnLimit,
  double dailyWithdrawalLimit,
  int campaignAccessTier,
}) _snapshotLimits(TrustScoreLevel level) {
  return switch (level) {
    TrustScoreLevel.restricted => (
        payoutDelayHours: 336,
        dailyEarnLimit: 0,
        dailyWithdrawalLimit: 0,
        campaignAccessTier: 0,
      ),
    TrustScoreLevel.newUser => (
        payoutDelayHours: 72,
        dailyEarnLimit: 45,
        dailyWithdrawalLimit: 20,
        campaignAccessTier: 1,
      ),
    TrustScoreLevel.low => (
        payoutDelayHours: 48,
        dailyEarnLimit: 120,
        dailyWithdrawalLimit: 50,
        campaignAccessTier: 1,
      ),
    TrustScoreLevel.normal => (
        payoutDelayHours: 36,
        dailyEarnLimit: 280,
        dailyWithdrawalLimit: 150,
        campaignAccessTier: 2,
      ),
    TrustScoreLevel.trusted => (
        payoutDelayHours: 24,
        dailyEarnLimit: 650,
        dailyWithdrawalLimit: 400,
        campaignAccessTier: 3,
      ),
    TrustScoreLevel.highTrust => (
        payoutDelayHours: 12,
        dailyEarnLimit: 2500,
        dailyWithdrawalLimit: 1800,
        campaignAccessTier: 5,
      ),
  };
}
