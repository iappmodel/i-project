import 'dart:math' as math;

/// Watch → verify → earn, wallet/pending, pay/transfer, conversion gates,
/// platform signals — global reward and risk as **explicit scalars** for RL / monitoring.
///
/// Weights match the product spec (positive terms sum to **0.90**; penalties use **0.20**
/// of coefficient budget). [GlobalRewardBreakdown.rTotal] is the raw weighted sum.

// --- Section 1: global reward weights (literal) --------------------------------

/// Sum of positive coefficients (for scaling / documentation).
const double kGlobalRewardPositiveWeightSum =
    0.30 + 0.20 + 0.15 + 0.15 + 0.10; // 0.90

const double kWeightFraudDetection = 0.30;
const double kWeightEconomicProtection = 0.20;
const double kWeightTrustStability = 0.15;
const double kWeightUserLegitimacyFlow = 0.15;
const double kWeightVerificationIntegrity = 0.10;

const double kWeightPenaltyFalsePositive = 0.10;
const double kWeightPenaltyFriction = 0.05;
const double kWeightPenaltyLiquidity = 0.05;

// --- Section 4: normalization -------------------------------------------------

/// `clamp((x - min) / (max - min), 0, 1)` with safe handling of `max == min`.
double normalizeLinear(double x, double min, double max) {
  if (max == min) return x >= max ? 1.0 : 0.0;
  return ((x - min) / (max - min)).clamp(0.0, 1.0).toDouble();
}

// --- Section 2.1: fraud detection ---------------------------------------------

/// Raw counters for fraud-detection ratios (fill from ledger / analytics).
final class FraudDetectionCounts {
  const FraudDetectionCounts({
    required this.fraudulentSessionsStoppedBeforePayout,
    required this.totalFraudulentSessions,
    required this.highRiskUsersBlocked,
    required this.highRiskUsersTotal,
    required this.repeatAttackers,
    required this.totalAttackers,
  });

  final int fraudulentSessionsStoppedBeforePayout;
  final int totalFraudulentSessions;
  final int highRiskUsersBlocked;
  final int highRiskUsersTotal;
  final int repeatAttackers;
  final int totalAttackers;

  /// (# fraudulent sessions stopped before payout) / (# total fraudulent sessions).
  /// Vacuous: no fraud → **1.0** (no missed payout signal).
  double get earlyDetectionRate {
    if (totalFraudulentSessions <= 0) return 1.0;
    return (fraudulentSessionsStoppedBeforePayout / totalFraudulentSessions)
        .clamp(0.0, 1.0)
        .toDouble();
  }

  /// (# users risk > 0.8 blocked) / (# users risk > 0.8).
  /// Vacuous: none in bucket → **1.0**.
  double get highRiskBlockRate {
    if (highRiskUsersTotal <= 0) return 1.0;
    return (highRiskUsersBlocked / highRiskUsersTotal).clamp(0.0, 1.0).toDouble();
  }

  /// `1 - (repeat_attackers / total_attackers)`.
  /// Vacuous: no attackers → **1.0**.
  double get repeatAttackPrevention {
    if (totalAttackers <= 0) return 1.0;
    return (1.0 - (repeatAttackers / totalAttackers)).clamp(0.0, 1.0).toDouble();
  }

  /// Spec: `0.5 * early + 0.3 * high_risk_block + 0.2 * repeat_prevention`, all in [0,1].
  double get rFraudDetection =>
      0.5 * earlyDetectionRate +
      0.3 * highRiskBlockRate +
      0.2 * repeatAttackPrevention;
}

// --- Section 2.2: economic protection -------------------------------------------

/// `normalized_extraction_loss = total_fraud_payout_usd / total_reward_pool_usd`.
/// Vacuous pool → loss **0**, R = **1**.
double rEconomicProtection({
  required double totalFraudPayoutUsd,
  required double totalRewardPoolUsd,
}) {
  if (totalRewardPoolUsd <= 0) return 1.0;
  final loss = (totalFraudPayoutUsd / totalRewardPoolUsd).clamp(0.0, 1.0).toDouble();
  return (1.0 - loss).clamp(0.0, 1.0).toDouble();
}

// --- Section 2.3: trust stability ----------------------------------------------

/// Std-dev of trust score **deltas** over the window (user: "variance = std_dev").
/// [deltas] should be comparable magnitudes (e.g. change in trust 0..1 per tick, or /100).
double standardDeviation(List<double> values) {
  if (values.isEmpty) return 0.0;
  if (values.length == 1) return 0.0;
  final mean = values.reduce((a, b) => a + b) / values.length;
  var sq = 0.0;
  for (final v in values) {
    final d = v - mean;
    sq += d * d;
  }
  return math.sqrt(sq / values.length);
}

/// `R = 1 - std` then clamp to [0,1] (std above 1 treated as full instability).
double rTrustScoreStability(List<double> trustScoreDeltas) {
  final std = standardDeviation(trustScoreDeltas);
  return (1.0 - std).clamp(0.0, 1.0).toDouble();
}

// --- Section 2.4: legitimacy flow ---------------------------------------------

/// Watch → verify → earn + wallet payout success.
double rUserLegitimacyFlow({
  required int validSessionsCompleted,
  required int totalSessions,
  required int validWithdrawalsCompleted,
  required int totalValidWithdrawals,
}) {
  final completionRate = totalSessions <= 0
      ? 0.0
      : (validSessionsCompleted / totalSessions).clamp(0.0, 1.0).toDouble();
  final payoutRate = totalValidWithdrawals <= 0
      ? 1.0
      : (validWithdrawalsCompleted / totalValidWithdrawals).clamp(0.0, 1.0).toDouble();
  return 0.6 * completionRate + 0.4 * payoutRate;
}

// --- Section 2.5: verification integrity ----------------------------------------

/// `R = 1 - spoof_success_rate`; [spoofSuccessRate] in [0,1].
double rVerificationIntegrity(double spoofSuccessRate) =>
    (1.0 - spoofSuccessRate.clamp(0.0, 1.0)).clamp(0.0, 1.0).toDouble();

// --- Section 3: penalties -------------------------------------------------------

/// `P_false_positive = legit_blocked / total_legit`.
double pFalsePositive({
  required int legitimateUsersBlockedOrThrottled,
  required int totalLegitimateUsers,
}) {
  if (totalLegitimateUsers <= 0) return 0.0;
  return (legitimateUsersBlockedOrThrottled / totalLegitimateUsers)
      .clamp(0.0, 1.0)
      .toDouble();
}

/// Baseline verify ≈ 2–3 s; `friction_score = avg_extra_time / baseline`.
/// `P_friction_cost = min(friction_score / 2, 1)`.
double pFrictionCost({
  required double avgVerificationTimeSeconds,
  required double baselineVerificationSeconds,
}) {
  if (baselineVerificationSeconds <= 0) return 1.0;
  final frictionScore = (avgVerificationTimeSeconds / baselineVerificationSeconds)
      .clamp(0.0, double.infinity)
      .toDouble();
  return math.min(frictionScore / 2.0, 1.0);
}

/// `blocked_legit_funds / total_legit_funds`.
double pLiquidityBlock({
  required double blockedLegitimateFundsUsd,
  required double totalLegitimateFundsUsd,
}) {
  if (totalLegitimateFundsUsd <= 0) return 0.0;
  return (blockedLegitimateFundsUsd / totalLegitimateFundsUsd).clamp(0.0, 1.0).toDouble();
}

// --- Section 6: risk score ------------------------------------------------------

/// All inputs **0..1**; output **0..1**.
final class PlatformRiskSignals {
  const PlatformRiskSignals({
    required this.anomalyScore,
    required this.gazeInconsistency,
    required this.velocityAnomaly,
    required this.networkRisk,
    required this.deviceEntropy,
    required this.platformSignalNoise,
  });

  final double anomalyScore;
  final double gazeInconsistency;
  final double velocityAnomaly;
  final double networkRisk;
  final double deviceEntropy;
  final double platformSignalNoise;

  /// Spec weights; range [0,1].
  double get riskScore {
    return (0.25 * anomalyScore.clamp(0.0, 1.0) +
            0.20 * gazeInconsistency.clamp(0.0, 1.0) +
            0.15 * velocityAnomaly.clamp(0.0, 1.0) +
            0.15 * networkRisk.clamp(0.0, 1.0) +
            0.15 * deviceEntropy.clamp(0.0, 1.0) +
            0.10 * platformSignalNoise.clamp(0.0, 1.0))
        .clamp(0.0, 1.0)
        .toDouble();
  }
}

/// Policy bands for gating UX / verification (Section 6 thresholds).
enum RiskActionBand {
  normal,
  softFriction,
  strongVerification,
  restrictOrDelay,
  isolateOrFreeze,
}

RiskActionBand riskActionBand(double riskScore) {
  final r = riskScore.clamp(0.0, 1.0);
  if (r < 0.3) return RiskActionBand.normal;
  if (r < 0.6) return RiskActionBand.softFriction;
  if (r < 0.8) return RiskActionBand.strongVerification;
  if (r < 0.9) return RiskActionBand.restrictOrDelay;
  return RiskActionBand.isolateOrFreeze;
}

// --- Section 5: micro reward (instant RL signals) -------------------------------

/// Fixed teaching signals per action type.
abstract final class MicroRewardSignals {
  static const double blockFraud = 0.2;
  static const double blockLegitimateUser = -0.4;
  static const double delayPayoutCorrectly = 0.1;
  static const double attackerBypassed = -0.5;
}

// --- Section 7: guardrails ------------------------------------------------------

/// Hard limits RL / policy tuning must not violate.
final class PolicyGuardrails {
  const PolicyGuardrails({
    this.maxBlockRate = 0.10,
    this.maxRewardReduction = 0.25,
    this.maxWithdrawDelayHours = 48,
    this.maxFrictionMultiplier = 2.0,
  });

  final double maxBlockRate;
  final double maxRewardReduction;
  final int maxWithdrawDelayHours;
  final double maxFrictionMultiplier;

  /// Returns human-readable violations; empty ⇒ within guardrails.
  List<String> evaluate({
    required double observedBlockRate,
    required double observedRewardReduction,
    required double withdrawDelayHours,
    required double frictionMultiplierVsBaseline,
  }) {
    final out = <String>[];
    if (observedBlockRate > maxBlockRate) {
      out.add(
        'block_rate ${observedBlockRate.toStringAsFixed(3)} > max $maxBlockRate',
      );
    }
    if (observedRewardReduction > maxRewardReduction) {
      out.add(
        'reward_reduction ${observedRewardReduction.toStringAsFixed(3)} > max $maxRewardReduction',
      );
    }
    if (withdrawDelayHours > maxWithdrawDelayHours) {
      out.add(
        'withdraw_delay_h ${withdrawDelayHours.toStringAsFixed(1)} > max $maxWithdrawDelayHours',
      );
    }
    if (frictionMultiplierVsBaseline > maxFrictionMultiplier) {
      out.add(
        'friction_x ${frictionMultiplierVsBaseline.toStringAsFixed(2)} > max $maxFrictionMultiplier',
      );
    }
    return out;
  }
}

// --- Failsafe: R_total drop > 20% in 10 minutes ---------------------------------

/// Append [GlobalRewardMonitorEntry] from periodic job; [shouldRevert] checks drop.
final class GlobalRewardMonitorEntry {
  const GlobalRewardMonitorEntry({required this.at, required this.rTotal});

  final DateTime at;
  final double rTotal;
}

/// True if [latest] is more than [dropFraction] below the max R in [window].
bool shouldRevertPolicyForRewardDrop({
  required List<GlobalRewardMonitorEntry> history,
  required GlobalRewardMonitorEntry latest,
  Duration window = const Duration(minutes: 10),
  double dropFraction = 0.20,
}) {
  final cutoff = latest.at.subtract(window);
  final inWindow = history.where((e) => !e.at.isBefore(cutoff)).toList()..add(latest);
  if (inWindow.length < 2) return false;
  final peak = inWindow.map((e) => e.rTotal).reduce(math.max);
  if (peak <= 0) return false;
  return latest.rTotal < peak * (1.0 - dropFraction);
}

// --- Aggregate -----------------------------------------------------------------

/// Full ledger snapshot for one evaluation window (tune from DB / batch job).
final class GlobalRewardLedgerSnapshot {
  const GlobalRewardLedgerSnapshot({
    required this.fraud,
    required this.totalFraudPayoutUsd,
    required this.totalRewardPoolUsd,
    required this.trustScoreDeltas24h,
    required this.validSessionsCompleted,
    required this.totalSessions,
    required this.validWithdrawalsCompleted,
    required this.totalValidWithdrawals,
    required this.spoofSuccessRate,
    required this.legitimateUsersBlockedOrThrottled,
    required this.totalLegitimateUsers,
    required this.avgVerificationTimeSeconds,
    required this.baselineVerificationSeconds,
    required this.blockedLegitimateFundsUsd,
    required this.totalLegitimateFundsUsd,
  });

  final FraudDetectionCounts fraud;
  final double totalFraudPayoutUsd;
  final double totalRewardPoolUsd;
  final List<double> trustScoreDeltas24h;
  final int validSessionsCompleted;
  final int totalSessions;
  final int validWithdrawalsCompleted;
  final int totalValidWithdrawals;
  final double spoofSuccessRate;
  final int legitimateUsersBlockedOrThrottled;
  final int totalLegitimateUsers;
  final double avgVerificationTimeSeconds;
  final double baselineVerificationSeconds;
  final double blockedLegitimateFundsUsd;
  final double totalLegitimateFundsUsd;
}

final class GlobalRewardBreakdown {
  const GlobalRewardBreakdown({
    required this.rFraudDetection,
    required this.rEconomicProtection,
    required this.rTrustStability,
    required this.rUserLegitimacyFlow,
    required this.rVerificationIntegrity,
    required this.pFalsePositive,
    required this.pFrictionCost,
    required this.pLiquidityBlock,
    required this.rTotal,
  });

  final double rFraudDetection;
  final double rEconomicProtection;
  final double rTrustStability;
  final double rUserLegitimacyFlow;
  final double rVerificationIntegrity;
  final double pFalsePositive;
  final double pFrictionCost;
  final double pLiquidityBlock;

  /// Section 1: weighted sum (positive weights sum to 0.90; penalties subtract).
  final double rTotal;

  /// Optional 0..1 view when positives are at ceiling and penalties zero.
  double get rTotalNormalizedByPositiveWeights =>
      kGlobalRewardPositiveWeightSum <= 0
          ? 0.0
          : (rTotal / kGlobalRewardPositiveWeightSum).clamp(-1.0, 1.0).toDouble();
}

/// Computes [GlobalRewardBreakdown.rTotal] from a snapshot.
GlobalRewardBreakdown computeGlobalReward(GlobalRewardLedgerSnapshot s) {
  final rf = s.fraud.rFraudDetection.clamp(0.0, 1.0);
  final re = rEconomicProtection(
    totalFraudPayoutUsd: s.totalFraudPayoutUsd,
    totalRewardPoolUsd: s.totalRewardPoolUsd,
  );
  final rt = rTrustScoreStability(s.trustScoreDeltas24h);
  final ru = rUserLegitimacyFlow(
    validSessionsCompleted: s.validSessionsCompleted,
    totalSessions: s.totalSessions,
    validWithdrawalsCompleted: s.validWithdrawalsCompleted,
    totalValidWithdrawals: s.totalValidWithdrawals,
  );
  final rv = rVerificationIntegrity(s.spoofSuccessRate);
  final pf = pFalsePositive(
    legitimateUsersBlockedOrThrottled: s.legitimateUsersBlockedOrThrottled,
    totalLegitimateUsers: s.totalLegitimateUsers,
  );
  final pfc = pFrictionCost(
    avgVerificationTimeSeconds: s.avgVerificationTimeSeconds,
    baselineVerificationSeconds: s.baselineVerificationSeconds,
  );
  final pl = pLiquidityBlock(
    blockedLegitimateFundsUsd: s.blockedLegitimateFundsUsd,
    totalLegitimateFundsUsd: s.totalLegitimateFundsUsd,
  );

  final total = kWeightFraudDetection * rf +
      kWeightEconomicProtection * re +
      kWeightTrustStability * rt +
      kWeightUserLegitimacyFlow * ru +
      kWeightVerificationIntegrity * rv -
      kWeightPenaltyFalsePositive * pf -
      kWeightPenaltyFriction * pfc -
      kWeightPenaltyLiquidity * pl;

  return GlobalRewardBreakdown(
    rFraudDetection: rf,
    rEconomicProtection: re,
    rTrustStability: rt,
    rUserLegitimacyFlow: ru,
    rVerificationIntegrity: rv,
    pFalsePositive: pf,
    pFrictionCost: pfc,
    pLiquidityBlock: pl,
    rTotal: total.clamp(-1.0, 1.0).toDouble(),
  );
}
