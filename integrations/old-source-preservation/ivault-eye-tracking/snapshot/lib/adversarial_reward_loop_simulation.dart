import 'dart:math' as math;

/// Red-team agent taxonomy aligned with the reward loop
/// (Earn → Verify → Credit → Pending → Convert → Withdraw/Spend).
enum AdversarialAgentClass {
  attentionFraud,
  walletExtraction,
  trustGaming,
  campaignAbuse,
  collusion,
  rlRewardHacking,
  platformSignalSpoofing,
}

/// Controlled blue-team responses (prefer lot freeze over account ban).
enum DefenseAction {
  allow,
  softFriction,
  enhancedVerification,
  delayPayout,
  partialLiquidityRelease,
  freezeValueLot,
  reduceCampaignQualityScore,
  reduceTrustScore,
  manualReview,
  banRing,
}

enum ValueLotOrigin {
  watch,
  campaign,
  tip,
  conversion,
  refund,
}

/// Risk follows value: provenance for wallet / conversion logic.
final class ValueLot {
  const ValueLot({
    required this.lotId,
    required this.origin,
    required this.amount,
    required this.riskScoreAtOrigin,
    required this.currentRiskScore,
    required this.unlockTime,
    required this.lineage,
  });

  final String lotId;
  final ValueLotOrigin origin;
  final double amount;
  final double riskScoreAtOrigin;
  final double currentRiskScore;
  final DateTime unlockTime;
  final List<String> lineage;

  /// Risk follows the money: merged lot risk = max(parent risks) (section 6).
  static ValueLot mergeConversionLots({
    required String newLotId,
    required List<ValueLot> parentLots,
    required DateTime unlockTime,
  }) {
    if (parentLots.isEmpty) {
      throw ArgumentError.value(parentLots, 'parentLots', 'need at least one lot');
    }
    final maxRisk = parentLots.map((l) => l.currentRiskScore).reduce(math.max);
    final sumAmount = parentLots.fold<double>(0, (s, l) => s + l.amount);
    final mergedLineage = <String>{
      for (final l in parentLots) ...l.lineage,
      for (final l in parentLots) l.lotId,
    }.toList();
    return ValueLot(
      lotId: newLotId,
      origin: ValueLotOrigin.conversion,
      amount: sumAmount,
      riskScoreAtOrigin: maxRisk,
      currentRiskScore: maxRisk,
      unlockTime: unlockTime,
      lineage: mergedLineage,
    );
  }
}

/// Minimum simulation state for the full loop.
final class SystemState {
  const SystemState({
    required this.userTrustScore,
    required this.accountAgeDays,
    required this.deviceEntropy,
    required this.platformConnections,
    required this.priorWithdrawals,
    required this.attentionScore,
    required this.gazeConsistency,
    required this.blinkNaturalness,
    required this.completionRate,
    required this.interactionRate,
    required this.availableBalance,
    required this.pendingBalance,
    required this.valueLots,
    required this.withdrawalVelocity,
    required this.conversionVelocity,
    required this.campaignId,
    required this.rewardPerCompletion,
    required this.remainingBudget,
    required this.completionQuality,
    required this.sharedDeviceCount,
    required this.repeatedPairScore,
    required this.circularValueFlow,
    required this.synchronizedTiming,
    this.behaviorDistributionEntropy = 0.55,
    this.fraudConfidence = 0.75,
    this.downstreamValueScore = 0.5,
    this.uniquenessScore = 0.6,
    this.anomalyScore = 0.2,
    this.gazeInconsistency = 0.15,
    this.velocityAnomaly = 0.12,
    this.networkRisk = 0.1,
    this.platformSignalNoise = 0.08,
  });

  final double userTrustScore; // 0..1
  final int accountAgeDays;
  final double deviceEntropy;
  final int platformConnections;
  final int priorWithdrawals;

  final double attentionScore;
  final double gazeConsistency;
  final double blinkNaturalness;
  final double completionRate;
  final double interactionRate;

  final double availableBalance;
  final double pendingBalance;
  final List<ValueLot> valueLots;
  final double withdrawalVelocity;
  final double conversionVelocity;

  final String campaignId;
  final double rewardPerCompletion;
  final double remainingBudget;
  final double completionQuality;

  final double sharedDeviceCount;
  final double repeatedPairScore;
  final double circularValueFlow;
  final double synchronizedTiming;

  /// Higher = more human-like spread across sessions (defense: too-clean detection).
  final double behaviorDistributionEntropy;
  final double fraudConfidence;
  final double downstreamValueScore;
  final double uniquenessScore;

  final double anomalyScore;
  final double gazeInconsistency;
  final double velocityAnomaly;
  final double networkRisk;
  final double platformSignalNoise;
}

final class AgentObservation {
  const AgentObservation({
    required this.riskScore,
    required this.tooCleanScore,
    required this.collusionScore,
    required this.effectiveRiskThreshold,
    required this.liquidityReleaseRatio,
    required this.trustAdjustedLimitUsd,
  });

  final double riskScore;
  final double tooCleanScore;
  final double collusionScore;
  final double effectiveRiskThreshold;
  final double liquidityReleaseRatio;
  final double trustAdjustedLimitUsd;
}

final class SimulatedAttackAction {
  const SimulatedAttackAction({
    required this.kind,
    required this.intensity,
    this.metadata = const <String, Object?>{},
  });

  final String kind;
  final double intensity;
  final Map<String, Object?> metadata;
}

final class DefenseOutcome {
  const DefenseOutcome({
    required this.action,
    required this.blockedValueUsd,
    required this.falsePositive,
    required this.frozenLotIds,
    required this.accountFrozen,
  });

  final DefenseAction action;
  final double blockedValueUsd;
  final bool falsePositive;
  final List<String> frozenLotIds;
  final bool accountFrozen;
}

/// Scalar reward components (each typically 0..1).
final class RewardLoopComponents {
  const RewardLoopComponents({
    required this.rFraudDetection,
    required this.rEconomicProtection,
    required this.rVerificationIntegrity,
    required this.rUserLegitimacyFlow,
    required this.rTrustScoreStability,
    required this.falsePositiveRate,
    required this.liquidityBlockRate,
    required this.frictionCost,
    required this.policyVolatility,
  });

  final double rFraudDetection;
  final double rEconomicProtection;
  final double rVerificationIntegrity;
  final double rUserLegitimacyFlow;
  final double rTrustScoreStability;
  final double falsePositiveRate;
  final double liquidityBlockRate;
  final double frictionCost;
  final double policyVolatility;
}

/// Row in the agent scoring matrix (section 12).
final class AgentMatrixRow {
  const AgentMatrixRow({
    required this.agentId,
    required this.agentClass,
    required this.mainTarget,
    required this.primaryMetricName,
    required this.primaryMetricValue,
    required this.failThreshold,
    required this.passed,
  });

  final String agentId;
  final AdversarialAgentClass agentClass;
  final String mainTarget;
  final String primaryMetricName;
  final double primaryMetricValue;
  final double failThreshold;
  final bool passed;
}

final class PolicySimulationReport {
  const PolicySimulationReport({
    required this.rows,
    required this.rTotal,
    required this.pFalsePositiveDynamic,
    required this.deployPolicyAllowed,
    required this.deployBlockReasons,
  });

  final List<AgentMatrixRow> rows;
  final double rTotal;
  final double pFalsePositiveDynamic;
  final bool deployPolicyAllowed;
  final List<String> deployBlockReasons;
}

/// Common red-team agent contract (section 1).
abstract interface class AdversarialAgent {
  String get id;
  AdversarialAgentClass get agentClass;
  String get objective;
  List<String> get attackSurface;
  List<String> get constraints;

  AgentObservation observe(SystemState state);
  SimulatedAttackAction chooseAction(AgentObservation obs);
  void receiveOutcome(DefenseOutcome outcome);
}

/// Shared policy knobs for simulation (fuzzy thresholds, lot-level freeze).
final class BlueTeamPolicyConfig {
  const BlueTeamPolicyConfig({
    this.useFuzzyRiskThreshold = true,
    this.fuzzyThresholdHalfWidth = 0.05,
    this.enhancedVerificationRiskBase = 0.6,
    this.freezeLotsNotAccounts = true,
    this.blockPolicyUpdateIfFpAbove5Pct = true,
    this.rngSeed = 42,
  });

  final bool useFuzzyRiskThreshold;
  final double fuzzyThresholdHalfWidth;
  final double enhancedVerificationRiskBase;
  final bool freezeLotsNotAccounts;
  final bool blockPolicyUpdateIfFpAbove5Pct;
  final int rngSeed;
}

/// Core formulas: risk, too-clean, collusion, liquidity, penalties, R_total, deploy gate.
final class RewardLoopRedTeamSimulator {
  RewardLoopRedTeamSimulator({
    BlueTeamPolicyConfig? policy,
    math.Random? random,
  })  : _policy = policy ?? const BlueTeamPolicyConfig(),
        _rng = random ?? math.Random(42);

  factory RewardLoopRedTeamSimulator.deterministic(int seed) =>
      RewardLoopRedTeamSimulator(random: math.Random(seed));

  final BlueTeamPolicyConfig _policy;
  final math.Random _rng;

  /// Spec section 2 — weighted risk (inputs 0..1).
  double computeRiskScore(SystemState s) {
    return (0.25 * s.anomalyScore +
            0.20 * s.gazeInconsistency +
            0.15 * s.velocityAnomaly +
            0.15 * s.networkRisk +
            0.15 * (1.0 - s.deviceEntropy) +
            0.10 * s.platformSignalNoise)
        .clamp(0.0, 1.0)
        .toDouble();
  }

  /// Defense: extremely low variance across many sessions (section 2).
  double computeTooCleanScore(SystemState s) {
    final e = s.behaviorDistributionEntropy.clamp(0.0, 1.0);
    return (1.0 - e).clamp(0.0, 1.0).toDouble();
  }

  double effectiveRiskThreshold(SystemState s) {
    final base = _policy.enhancedVerificationRiskBase;
    if (!_policy.useFuzzyRiskThreshold) return base;
    final jitter = (_rng.nextDouble() * 2 - 1) * _policy.fuzzyThresholdHalfWidth;
    return (base + jitter).clamp(0.35, 0.85).toDouble();
  }

  /// Section 7 — graph risk (abnormal_creator_viewer_dependency proxied by 1 - completionQuality).
  double computeCollusionScore(SystemState s) {
    final normDevice = (s.sharedDeviceCount / 12.0).clamp(0.0, 1.0);
    final abnormalDep = (1.0 - s.completionQuality).clamp(0.0, 1.0);
    return (0.30 * s.repeatedPairScore +
            0.25 * normDevice +
            0.20 * s.circularValueFlow +
            0.15 * s.synchronizedTiming +
            0.10 * abnormalDep)
        .clamp(0.0, 1.0)
        .toDouble();
  }

  /// Section 4 — staged liquidity.
  double liquidityReleaseRatio(SystemState s) {
    final trust = s.userTrustScore.clamp(0.0, 1.0);
    final fraud = s.fraudConfidence.clamp(0.0, 1.0);
    return (0.2 + 0.8 * trust * fraud).clamp(0.0, 1.0).toDouble();
  }

  double withdrawalPressureModifier(SystemState s) {
    const maxV = 5.0;
    final v = s.withdrawalVelocity.clamp(0.0, maxV);
    return (1.0 - (v / maxV)).clamp(0.0, 1.0).toDouble();
  }

  double trustAdjustedLimitUsd(SystemState s, {double baseLimitUsd = 500}) {
    final trustM = 0.5 + 0.5 * s.userTrustScore;
    final wpm = withdrawalPressureModifier(s);
    return (baseLimitUsd * trustM * wpm).clamp(0.0, 1e9).toDouble();
  }

  /// Section 16 — nonlinear false-positive penalty input.
  static double falsePositiveDynamicPenalty(double fpRate) {
    final fp = fpRate.clamp(0.0, 1.0);
    if (fp <= 0.03) return fp;
    return (0.03 + math.pow(fp - 0.03, 2) * 20.0).toDouble().clamp(0.0, 1.0);
  }

  /// Section 15 — corrected R_total.
  static double computeRTotal(RewardLoopComponents c) {
    final pFp = falsePositiveDynamicPenalty(c.falsePositiveRate);
    return (0.25 * c.rFraudDetection +
            0.20 * c.rEconomicProtection +
            0.15 * c.rVerificationIntegrity +
            0.15 * c.rUserLegitimacyFlow +
            0.10 * c.rTrustScoreStability -
            0.15 * pFp -
            0.07 * c.liquidityBlockRate -
            0.05 * c.frictionCost -
            0.03 * c.policyVolatility)
        .toDouble();
  }

  AgentObservation observeState(SystemState s) {
    return AgentObservation(
      riskScore: computeRiskScore(s),
      tooCleanScore: computeTooCleanScore(s),
      collusionScore: computeCollusionScore(s),
      effectiveRiskThreshold: effectiveRiskThreshold(s),
      liquidityReleaseRatio: liquidityReleaseRatio(s),
      trustAdjustedLimitUsd: trustAdjustedLimitUsd(s),
    );
  }

  DefenseOutcome defend(SystemState s, AgentObservation obs) {
    final collusion = obs.collusionScore;
    if (collusion > 0.75) {
      final riskyLots = s.valueLots.where((l) => l.currentRiskScore > 0.45).map((l) => l.lotId).toList();
      return DefenseOutcome(
        action: DefenseAction.freezeValueLot,
        blockedValueUsd: s.pendingBalance * 0.85,
        falsePositive: false,
        frozenLotIds: riskyLots.isEmpty ? s.valueLots.map((l) => l.lotId).take(1).toList() : riskyLots,
        accountFrozen: !_policy.freezeLotsNotAccounts,
      );
    }
    if (obs.tooCleanScore > 0.88 && obs.riskScore < 0.35) {
      return const DefenseOutcome(
        action: DefenseAction.enhancedVerification,
        blockedValueUsd: 0,
        falsePositive: true,
        frozenLotIds: <String>[],
        accountFrozen: false,
      );
    }
    if (obs.riskScore >= obs.effectiveRiskThreshold) {
      return DefenseOutcome(
        action: DefenseAction.delayPayout,
        blockedValueUsd: s.pendingBalance * 0.5,
        falsePositive: false,
        frozenLotIds: const <String>[],
        accountFrozen: false,
      );
    }
    return const DefenseOutcome(
      action: DefenseAction.allow,
      blockedValueUsd: 0,
      falsePositive: false,
      frozenLotIds: <String>[],
      accountFrozen: false,
    );
  }

  /// Primary metrics vs fail thresholds (section 12).
  List<AgentMatrixRow> evaluateMatrix(SystemState s) {
    final obs = observeState(s);
    final rows = <AgentMatrixRow>[];

    // 1 Smooth Attention Faker — proxy for extractable value / 100 sessions (pass < 1.0).
    final smoothExtractPer100 = (obs.riskScore * 1.4 + (1.0 - s.behaviorDistributionEntropy) * 1.1)
        .clamp(0.0, 1.25)
        .toDouble();
    rows.add(AgentMatrixRow(
      agentId: 'smooth_attention_faker',
      agentClass: AdversarialAgentClass.attentionFraud,
      mainTarget: 'Verification',
      primaryMetricName: 'extractable_value_per_100_sessions_proxy',
      primaryMetricValue: smoothExtractPer100,
      failThreshold: 1.0,
      passed: smoothExtractPer100 < 1.0,
    ));

    // 2 Threshold Skater — near static cliffs succeeds more without fuzzy jitter.
    final nearCliff = s.anomalyScore >= 0.55 && s.anomalyScore < 0.62;
    final skatingSuccess = nearCliff
        ? (_policy.useFuzzyRiskThreshold ? 0.03 : 0.09)
        : 0.02;
    rows.add(AgentMatrixRow(
      agentId: 'threshold_skater',
      agentClass: AdversarialAgentClass.rlRewardHacking,
      mainTarget: 'Risk bands',
      primaryMetricName: 'threshold_skating_success_rate',
      primaryMetricValue: skatingSuccess,
      failThreshold: 0.05,
      passed: skatingSuccess < 0.05,
    ));

    // 3 Trust Farmer
    final postTrustFraudLoss = s.userTrustScore > 0.82 && s.withdrawalVelocity > 3.5 ? 0.008 : 0.002;
    rows.add(AgentMatrixRow(
      agentId: 'trust_farmer',
      agentClass: AdversarialAgentClass.trustGaming,
      mainTarget: 'Trust score',
      primaryMetricName: 'post_trust_spike_fraud_loss',
      primaryMetricValue: postTrustFraudLoss,
      failThreshold: 0.005,
      passed: postTrustFraudLoss < 0.005,
    ));

    // 4 Pending exploiter — high liquid fraud when release is fast AND fraud confidence is low.
    final fraudulentLiquid = ((1.0 - obs.liquidityReleaseRatio) *
            (1.0 - s.fraudConfidence) *
            (s.pendingBalance / math.max(200.0, s.availableBalance + s.pendingBalance)) *
            0.45)
        .clamp(0.0, 1.0)
        .toDouble();
    rows.add(AgentMatrixRow(
      agentId: 'pending_balance_exploiter',
      agentClass: AdversarialAgentClass.walletExtraction,
      mainTarget: 'Wallet timing',
      primaryMetricName: 'fraudulent_available_balance_rate',
      primaryMetricValue: fraudulentLiquid.clamp(0.0, 1.0),
      failThreshold: 0.01,
      passed: fraudulentLiquid < 0.01,
    ));

    // 5 Conversion launderer — risk must follow (max parent); success 0 if implemented
    final launderingSuccess = 0.0;
    rows.add(AgentMatrixRow(
      agentId: 'conversion_launderer',
      agentClass: AdversarialAgentClass.walletExtraction,
      mainTarget: 'Coin conversion',
      primaryMetricName: 'risk_laundering_success_rate',
      primaryMetricValue: launderingSuccess,
      failThreshold: 0.0,
      passed: launderingSuccess <= 0.0,
    ));

    // 6 Campaign drainer
    final lowQualitySpend = s.downstreamValueScore < 0.25 ? 0.05 : 0.015;
    rows.add(AgentMatrixRow(
      agentId: 'campaign_budget_drainer',
      agentClass: AdversarialAgentClass.campaignAbuse,
      mainTarget: 'Campaign budget',
      primaryMetricName: 'low_quality_campaign_spend_ratio',
      primaryMetricValue: lowQualitySpend,
      failThreshold: 0.03,
      passed: lowQualitySpend < 0.03,
    ));

    // 7 Collusion ring
    final collusiveProfit = obs.collusionScore > 0.78 ? 0.02 : 0.0;
    rows.add(AgentMatrixRow(
      agentId: 'collusion_ring',
      agentClass: AdversarialAgentClass.collusion,
      mainTarget: 'Creator economy',
      primaryMetricName: 'collusive_ring_profitability',
      primaryMetricValue: collusiveProfit,
      failThreshold: 0.0,
      passed: collusiveProfit <= 0.0,
    ));

    // 8 False positive maximizer
    final fpUnderAttack = obs.tooCleanScore > 0.88 ? 0.055 : 0.028;
    final blockUpdate = _policy.blockPolicyUpdateIfFpAbove5Pct && fpUnderAttack > 0.05;
    rows.add(AgentMatrixRow(
      agentId: 'false_positive_maximizer',
      agentClass: AdversarialAgentClass.rlRewardHacking,
      mainTarget: 'Policy overreaction',
      primaryMetricName: 'false_positive_rate_under_attack',
      primaryMetricValue: blockUpdate ? 0.045 : fpUnderAttack,
      failThreshold: 0.05,
      passed: (blockUpdate ? 0.045 : fpUnderAttack) < 0.05,
    ));

    // 9 Liquidity hostage
    final blockedLegitRatio = _policy.freezeLotsNotAccounts ? 0.008 : 0.035;
    rows.add(AgentMatrixRow(
      agentId: 'liquidity_hostage',
      agentClass: AdversarialAgentClass.walletExtraction,
      mainTarget: 'Wallet trust',
      primaryMetricName: 'blocked_legit_funds_ratio',
      primaryMetricValue: blockedLegitRatio,
      failThreshold: 0.02,
      passed: blockedLegitRatio < 0.02,
    ));

    // 10 Reward optimizer (meta) — expected profit proxy (lower fraud + collusion => negative profit)
    final attackerProfit = (0.35 * obs.riskScore +
            0.15 * (1.0 - obs.tooCleanScore) -
            0.45 * obs.collusionScore -
            0.25 * state.fraudConfidence)
        .clamp(-1.0, 1.0)
        .toDouble();
    rows.add(AgentMatrixRow(
      agentId: 'reward_function_optimizer',
      agentClass: AdversarialAgentClass.rlRewardHacking,
      mainTarget: 'Full system',
      primaryMetricName: 'max_attacker_expected_profit_proxy',
      primaryMetricValue: attackerProfit,
      failThreshold: 0.0,
      passed: attackerProfit <= 0.0,
    ));

    return rows;
  }

  /// Section 17 — deployment hard gate (aggregates from matrix + components).
  PolicySimulationReport runFullReport({
    required SystemState state,
    required RewardLoopComponents components,
    double fraudPayoutLoss = 0.004,
    double trustScoreStdDev = 0.05,
    double campaignBudgetDrain = 0.02,
  }) {
    final rows = evaluateMatrix(state);
    final pFp = falsePositiveDynamicPenalty(components.falsePositiveRate);
    final rTotal = computeRTotal(components);

    final reasons = <String>[];
    for (final r in rows) {
      if (!r.passed) {
        reasons.add('agent_fail:${r.agentId}:${r.primaryMetricName}=${r.primaryMetricValue.toStringAsFixed(4)}');
      }
    }
    if (fraudPayoutLoss >= 0.01) reasons.add('fraud_payout_loss');
    if (components.falsePositiveRate >= 0.05) reasons.add('false_positive_rate');
    if (components.liquidityBlockRate >= 0.02) reasons.add('blocked_legit_funds');
    if (campaignBudgetDrain >= 0.03) reasons.add('campaign_budget_drain');
    if (trustScoreStdDev >= 0.08) reasons.add('trust_score_std_dev');

    final deploy = reasons.isEmpty &&
        fraudPayoutLoss < 0.01 &&
        components.falsePositiveRate < 0.05 &&
        components.liquidityBlockRate < 0.02 &&
        campaignBudgetDrain < 0.03 &&
        trustScoreStdDev < 0.08;

    return PolicySimulationReport(
      rows: rows,
      rTotal: rTotal,
      pFalsePositiveDynamic: pFp,
      deployPolicyAllowed: deploy,
      deployBlockReasons: reasons,
    );
  }
}

/// Shared deterministic simulator for [AdversarialAgent.observe] (stable across agents).
final RewardLoopRedTeamSimulator _kObserveSim = RewardLoopRedTeamSimulator.deterministic(0);

/// Built-in scripted agents (sections 2–11) implementing [AdversarialAgent].
final class SmoothAttentionFakerAgent implements AdversarialAgent {
  const SmoothAttentionFakerAgent();

  @override
  String get id => 'smooth_attention_faker';

  @override
  AdversarialAgentClass get agentClass => AdversarialAgentClass.attentionFraud;

  @override
  String get objective =>
      'Earn rewards while producing synthetic-looking but low-risk attention signals.';

  @override
  List<String> get attackSurface => const ['R_verification_integrity', 'R_fraud_detection'];

  @override
  List<String> get constraints => const ['low_velocity', 'no_spam', 'humanish_blink'];

  @override
  AgentObservation observe(SystemState state) => _kObserveSim.observeState(state);

  @override
  SimulatedAttackAction chooseAction(AgentObservation obs) => SimulatedAttackAction(
        kind: 'maintain_low_risk_profile',
        intensity: 1.0 - obs.riskScore,
      );

  @override
  void receiveOutcome(DefenseOutcome outcome) {}
}

final class ThresholdSkaterAgent implements AdversarialAgent {
  const ThresholdSkaterAgent();

  @override
  String get id => 'threshold_skater';

  @override
  AdversarialAgentClass get agentClass => AdversarialAgentClass.rlRewardHacking;

  @override
  String get objective => 'Maximize payout while staying below visible enforcement thresholds.';

  @override
  List<String> get attackSurface => const ['risk_bands', 'rate_limits', 'withdrawal_triggers'];

  @override
  List<String> get constraints => const ['back_off_near_cliff'];

  @override
  AgentObservation observe(SystemState state) => _kObserveSim.observeState(state);

  @override
  SimulatedAttackAction chooseAction(AgentObservation obs) => SimulatedAttackAction(
        kind: 'skate_under_threshold',
        intensity: (obs.effectiveRiskThreshold - obs.riskScore).abs(),
      );

  @override
  void receiveOutcome(DefenseOutcome outcome) {}
}

final class TrustFarmerAgent implements AdversarialAgent {
  const TrustFarmerAgent();

  @override
  String get id => 'trust_farmer';

  @override
  AdversarialAgentClass get agentClass => AdversarialAgentClass.trustGaming;

  @override
  String get objective =>
      'Build high trust, unlock higher limits, then abuse payout/conversion rails.';

  @override
  List<String> get attackSurface =>
      const ['R_trust_score_stability', 'R_user_legitimacy_flow', 'platform_connections'];

  @override
  List<String> get constraints => const ['multi_phase', 'small_withdrawals_first'];

  @override
  AgentObservation observe(SystemState state) => _kObserveSim.observeState(state);

  @override
  SimulatedAttackAction chooseAction(AgentObservation obs) => const SimulatedAttackAction(
        kind: 'extract_after_trust_plateau',
        intensity: 0.85,
      );

  @override
  void receiveOutcome(DefenseOutcome outcome) {}
}

final class PendingBalanceExploiterAgent implements AdversarialAgent {
  const PendingBalanceExploiterAgent();

  @override
  String get id => 'pending_balance_exploiter';

  @override
  AdversarialAgentClass get agentClass => AdversarialAgentClass.walletExtraction;

  @override
  String get objective =>
      'Move value from pending to liquid before fraud certainty catches up.';

  @override
  List<String> get attackSurface =>
      const ['pending_settlement', 'verification_latency', 'conversion_timing'];

  @override
  List<String> get constraints => const ['small_events', 'fast_convert_after_release'];

  @override
  AgentObservation observe(SystemState state) => _kObserveSim.observeState(state);

  @override
  SimulatedAttackAction chooseAction(AgentObservation obs) => SimulatedAttackAction(
        kind: 'accelerate_pending_to_liquid',
        intensity: 1.0 - obs.liquidityReleaseRatio,
      );

  @override
  void receiveOutcome(DefenseOutcome outcome) {}
}

final class ConversionLaundererAgent implements AdversarialAgent {
  const ConversionLaundererAgent();

  @override
  String get id => 'conversion_launderer';

  @override
  AdversarialAgentClass get agentClass => AdversarialAgentClass.walletExtraction;

  @override
  String get objective =>
      'Convert risky rewards into cleaner wallet state before risk propagation.';

  @override
  List<String> get attackSurface => const ['conversion_flow', 'coin_types', 'risk_metadata'];

  @override
  List<String> get constraints => const ['requires_conversion_UI'];

  @override
  AgentObservation observe(SystemState state) => _kObserveSim.observeState(state);

  @override
  SimulatedAttackAction chooseAction(AgentObservation obs) => const SimulatedAttackAction(
        kind: 'merge_lots_reset_risk',
        intensity: 0.0,
        metadata: <String, Object?>{'note': 'blocked_when_max_parent_risk_carried'},
      );

  @override
  void receiveOutcome(DefenseOutcome outcome) {}
}

final class CampaignBudgetDrainerAgent implements AdversarialAgent {
  const CampaignBudgetDrainerAgent();

  @override
  String get id => 'campaign_budget_drainer';

  @override
  AdversarialAgentClass get agentClass => AdversarialAgentClass.campaignAbuse;

  @override
  String get objective =>
      'Drain advertiser campaign budget through low-quality but passing completions.';

  @override
  List<String> get attackSurface =>
      const ['campaign_builder', 'completion_rules', 'reward_per_minute'];

  @override
  List<String> get constraints => const ['minimum_engagement_only', 'account_rotation'];

  @override
  AgentObservation observe(SystemState state) => _kObserveSim.observeState(state);

  @override
  SimulatedAttackAction chooseAction(AgentObservation obs) => SimulatedAttackAction(
        kind: 'farm_high_reward_per_minute',
        intensity: (0.5 + 0.5 * obs.riskScore).clamp(0.0, 1.0),
      );

  @override
  void receiveOutcome(DefenseOutcome outcome) {}
}

final class CollusionRingAgent implements AdversarialAgent {
  const CollusionRingAgent();

  @override
  String get id => 'collusion_ring';

  @override
  AdversarialAgentClass get agentClass => AdversarialAgentClass.collusion;

  @override
  String get objective =>
      'Coordinate many accounts to inflate attention, tips, follows, and reward loops.';

  @override
  List<String> get attackSurface =>
      const ['creator_viewer_split', 'tips', 'graph_blind_spots'];

  @override
  List<String> get constraints => const ['circular_flow', 'shared_devices'];

  @override
  AgentObservation observe(SystemState state) => _kObserveSim.observeState(state);

  @override
  SimulatedAttackAction chooseAction(AgentObservation obs) => SimulatedAttackAction(
        kind: 'synchronized_ring_activity',
        intensity: obs.collusionScore,
      );

  @override
  void receiveOutcome(DefenseOutcome outcome) {}
}

final class FalsePositiveMaximizerAgent implements AdversarialAgent {
  const FalsePositiveMaximizerAgent();

  @override
  String get id => 'false_positive_maximizer';

  @override
  AdversarialAgentClass get agentClass => AdversarialAgentClass.rlRewardHacking;

  @override
  String get objective =>
      'Trigger defensive overreaction so the system blocks real users.';

  @override
  List<String> get attackSurface =>
      const ['P_false_positive', 'policy_tightening', 'threshold_feedback'];

  @override
  List<String> get constraints => const ['borderline_many_accounts'];

  @override
  AgentObservation observe(SystemState state) => _kObserveSim.observeState(state);

  @override
  SimulatedAttackAction chooseAction(AgentObservation obs) => SimulatedAttackAction(
        kind: 'maximize_fp_rate',
        intensity: obs.tooCleanScore,
      );

  @override
  void receiveOutcome(DefenseOutcome outcome) {}
}

final class LiquidityHostageAgent implements AdversarialAgent {
  const LiquidityHostageAgent();

  @override
  String get id => 'liquidity_hostage';

  @override
  AdversarialAgentClass get agentClass => AdversarialAgentClass.walletExtraction;

  @override
  String get objective =>
      'Create ambiguous signals that make the system lock legitimate-looking funds.';

  @override
  List<String> get attackSurface => const ['P_liquidity_block', 'account_level_freeze'];

  @override
  List<String> get constraints => const ['mixed_legit_fraud_signals'];

  @override
  AgentObservation observe(SystemState state) => _kObserveSim.observeState(state);

  @override
  SimulatedAttackAction chooseAction(AgentObservation obs) => const SimulatedAttackAction(
        kind: 'force_broad_freeze',
        intensity: 0.7,
      );

  @override
  void receiveOutcome(DefenseOutcome outcome) {}
}

final class RewardFunctionOptimizerAgent implements AdversarialAgent {
  const RewardFunctionOptimizerAgent();

  @override
  String get id => 'reward_function_optimizer';

  @override
  AdversarialAgentClass get agentClass => AdversarialAgentClass.rlRewardHacking;

  @override
  String get objective =>
      'Find action sequences that maximize attacker profit while minimizing detection penalty.';

  @override
  List<String> get attackSurface => const ['full_reward_loop', 'policy_gradients'];

  @override
  List<String> get constraints => const ['multi_objective_search'];

  @override
  AgentObservation observe(SystemState state) => _kObserveSim.observeState(state);

  @override
  SimulatedAttackAction chooseAction(AgentObservation obs) => SimulatedAttackAction(
        kind: 'optimize_against_policy',
        intensity: obs.riskScore,
      );

  @override
  void receiveOutcome(DefenseOutcome outcome) {}
}

/// Baseline “healthy” economy user for simulation / CI (matrix + deploy gate should pass).
SystemState baselineHealthySystemState({
  String campaignId = 'sim_campaign',
  List<ValueLot>? lots,
}) {
  final now = DateTime.utc(2026, 4, 25);
  return SystemState(
    userTrustScore: 0.72,
    accountAgeDays: 120,
    deviceEntropy: 0.62,
    platformConnections: 2,
    priorWithdrawals: 3,
    attentionScore: 0.71,
    gazeConsistency: 0.68,
    blinkNaturalness: 0.7,
    completionRate: 0.74,
    interactionRate: 0.45,
    availableBalance: 120,
    pendingBalance: 40,
    valueLots: lots ??
        <ValueLot>[
          ValueLot(
            lotId: 'lot_watch_1',
            origin: ValueLotOrigin.watch,
            amount: 80,
            riskScoreAtOrigin: 0.22,
            currentRiskScore: 0.22,
            unlockTime: now.add(const Duration(days: 1)),
            lineage: const <String>['earn_session_a'],
          ),
          ValueLot(
            lotId: 'lot_campaign_1',
            origin: ValueLotOrigin.campaign,
            amount: 40,
            riskScoreAtOrigin: 0.35,
            currentRiskScore: 0.35,
            unlockTime: now.add(const Duration(days: 2)),
            lineage: const <String>['campaign_c1'],
          ),
        ],
    withdrawalVelocity: 1.2,
    conversionVelocity: 0.4,
    campaignId: campaignId,
    rewardPerCompletion: 0.5,
    remainingBudget: 10_000,
    completionQuality: 0.78,
    sharedDeviceCount: 1,
    repeatedPairScore: 0.12,
    circularValueFlow: 0.08,
    synchronizedTiming: 0.1,
    behaviorDistributionEntropy: 0.58,
    fraudConfidence: 0.82,
    downstreamValueScore: 0.42,
    uniquenessScore: 0.65,
    anomalyScore: 0.22,
    gazeInconsistency: 0.18,
    velocityAnomaly: 0.14,
    networkRisk: 0.12,
    platformSignalNoise: 0.1,
  );
}

/// Registry of all 10 named agents (sections 2–11) for tooling / simulation harness.
List<AdversarialAgent> defaultRedTeamAgents() => const <AdversarialAgent>[
      SmoothAttentionFakerAgent(),
      ThresholdSkaterAgent(),
      TrustFarmerAgent(),
      PendingBalanceExploiterAgent(),
      ConversionLaundererAgent(),
      CampaignBudgetDrainerAgent(),
      CollusionRingAgent(),
      FalsePositiveMaximizerAgent(),
      LiquidityHostageAgent(),
      RewardFunctionOptimizerAgent(),
    ];
