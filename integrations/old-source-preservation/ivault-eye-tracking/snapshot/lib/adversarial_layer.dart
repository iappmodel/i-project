import 'dart:math' as math;

enum ManipulationAttackType {
  rewardInflation,
  attentionFarming,
  psychologicalExploitation,
  trustScoreGaming,
  budgetDraining,
}

enum CollusionAttackType {
  priceFixing,
  marketDivision,
  rewardCycling,
  botRingCoordination,
}

enum AgentSimulationType {
  honest,
  manipulative,
  colluding,
  bot,
}

final class UserBehaviorVector {
  const UserBehaviorVector({
    required this.watchTimeDistributionScore,
    required this.interactionVariance,
    required this.rewardResponsePatternScore,
    required this.interactionEntropy,
    required this.deviceFingerprintRisk,
    required this.behavioralConsistency,
  });

  final double watchTimeDistributionScore; // 0..1
  final double interactionVariance; // 0..1
  final double rewardResponsePatternScore; // 0..1
  final double interactionEntropy; // 0..1
  final double deviceFingerprintRisk; // 0..1
  final double behavioralConsistency; // 0..1
}

final class AgentBehaviorSnapshot {
  const AgentBehaviorSnapshot({
    required this.agentId,
    required this.campaignId,
    required this.rewardGrowthRate,
    required this.outcomeQualityScore,
    required this.conversionRate,
    required this.watchToEngagementRatio,
    required this.rewardThresholdConcentration,
    required this.trustScoreDelta,
    required this.competitorTargetPressure,
    required this.userBehavior,
  });

  final String agentId;
  final String campaignId;
  final double rewardGrowthRate; // 0..1
  final double outcomeQualityScore; // 0..1
  final double conversionRate; // 0..1
  final double watchToEngagementRatio; // 0..1
  final double rewardThresholdConcentration; // 0..1
  final double trustScoreDelta; // -1..1
  final double competitorTargetPressure; // 0..1
  final UserBehaviorVector userBehavior;
}

final class AgentMarketTrace {
  const AgentMarketTrace({
    required this.agentId,
    required this.segments,
    required this.bidPattern,
    required this.timingPattern,
    required this.rewardFlowToPeersScore,
    required this.botSimilarityScore,
  });

  final String agentId;
  final Set<String> segments;
  final List<double> bidPattern;
  final List<double> timingPattern;
  final double rewardFlowToPeersScore; // 0..1
  final double botSimilarityScore; // 0..1
}

final class ManipulationAssessment {
  const ManipulationAssessment({
    required this.severity,
    required this.detectedAttacks,
  });

  final double severity; // 0..1
  final Set<ManipulationAttackType> detectedAttacks;
}

final class CollusionAssessment {
  const CollusionAssessment({
    required this.severity,
    required this.detectedAttacks,
    required this.involvedAgents,
  });

  final double severity; // 0..1
  final Set<CollusionAttackType> detectedAttacks;
  final Set<String> involvedAgents;
}

final class RewardQualityCheck {
  const RewardQualityCheck({
    required this.correlationScore,
    required this.degraded,
  });

  final double correlationScore; // 0..1
  final bool degraded;
}

final class TrustScoreVector {
  const TrustScoreVector({
    required this.authenticityScore,
    required this.consistencyScore,
    required this.fraudProbability,
  });

  final double authenticityScore; // 0..1
  final double consistencyScore; // 0..1
  final double fraudProbability; // 0..1

  double get composite =>
      ((authenticityScore * 0.45) + (consistencyScore * 0.35) - (fraudProbability * 0.6))
          .clamp(0.0, 1.0)
          .toDouble();
}

final class DefensePenalty {
  const DefensePenalty({
    required this.reachMultiplier,
    required this.costMultiplier,
    required this.conversionPriorityMultiplier,
    required this.reasonCodes,
  });

  final double reachMultiplier; // lower = less reach
  final double costMultiplier; // higher = more expensive
  final double conversionPriorityMultiplier; // lower = deprioritized
  final Set<String> reasonCodes;
}

final class DefenseDecision {
  const DefenseDecision({
    required this.flagged,
    required this.manipulation,
    required this.collusion,
    required this.rewardQuality,
    required this.trust,
    required this.penalty,
    required this.policyVersionId,
  });

  final bool flagged;
  final ManipulationAssessment manipulation;
  final CollusionAssessment collusion;
  final RewardQualityCheck rewardQuality;
  final TrustScoreVector trust;
  final DefensePenalty penalty;

  /// Rule 7 — governance bundle that produced this fraud-defense outcome.
  final String policyVersionId;
}

final class SimulationAgentProfile {
  const SimulationAgentProfile({
    required this.type,
    required this.behavior,
    required this.marketTrace,
  });

  final AgentSimulationType type;
  final AgentBehaviorSnapshot behavior;
  final AgentMarketTrace marketTrace;
}

final class AdversarialLayer {
  const AdversarialLayer();

  ManipulationAssessment detectManipulation(AgentBehaviorSnapshot snapshot) {
    final attacks = <ManipulationAttackType>{};
    var severity = 0.0;

    final rewardInflationLikely =
        snapshot.rewardGrowthRate > 0.75 && snapshot.outcomeQualityScore < 0.45;
    if (rewardInflationLikely) {
      attacks.add(ManipulationAttackType.rewardInflation);
      severity += 0.25;
    }

    final attentionFarmingLikely = snapshot.watchToEngagementRatio > 0.8 &&
        snapshot.userBehavior.interactionEntropy < 0.35 &&
        snapshot.conversionRate < 0.4;
    if (attentionFarmingLikely) {
      attacks.add(ManipulationAttackType.attentionFarming);
      severity += 0.2;
    }

    if (snapshot.rewardThresholdConcentration > 0.85) {
      attacks.add(ManipulationAttackType.psychologicalExploitation);
      severity += 0.2;
    }

    if (snapshot.trustScoreDelta > 0.6 && snapshot.userBehavior.behavioralConsistency > 0.92) {
      attacks.add(ManipulationAttackType.trustScoreGaming);
      severity += 0.2;
    }

    if (snapshot.competitorTargetPressure > 0.75) {
      attacks.add(ManipulationAttackType.budgetDraining);
      severity += 0.15;
    }

    return ManipulationAssessment(
      severity: severity.clamp(0.0, 1.0).toDouble(),
      detectedAttacks: attacks,
    );
  }

  CollusionAssessment detectCollusion(List<AgentMarketTrace> traces) {
    if (traces.length < 2) {
      return const CollusionAssessment(
        severity: 0.0,
        detectedAttacks: <CollusionAttackType>{},
        involvedAgents: <String>{},
      );
    }

    final attacks = <CollusionAttackType>{};
    final involvedAgents = <String>{};
    var severity = 0.0;

    for (var i = 0; i < traces.length; i++) {
      for (var j = i + 1; j < traces.length; j++) {
        final a = traces[i];
        final b = traces[j];
        final segmentOverlap = _jaccard(a.segments, b.segments);
        final bidSimilarity = _seriesSimilarity(a.bidPattern, b.bidPattern);
        final timingSimilarity = _seriesSimilarity(a.timingPattern, b.timingPattern);

        if (segmentOverlap > 0.8 && bidSimilarity > 0.9) {
          attacks.add(CollusionAttackType.priceFixing);
          involvedAgents..add(a.agentId)..add(b.agentId);
          severity += 0.2;
        }
        if (segmentOverlap < 0.25 && timingSimilarity > 0.8) {
          attacks.add(CollusionAttackType.marketDivision);
          involvedAgents..add(a.agentId)..add(b.agentId);
          severity += 0.15;
        }
        if (a.rewardFlowToPeersScore > 0.7 && b.rewardFlowToPeersScore > 0.7) {
          attacks.add(CollusionAttackType.rewardCycling);
          involvedAgents..add(a.agentId)..add(b.agentId);
          severity += 0.2;
        }
        if (a.botSimilarityScore > 0.75 &&
            b.botSimilarityScore > 0.75 &&
            timingSimilarity > 0.85) {
          attacks.add(CollusionAttackType.botRingCoordination);
          involvedAgents..add(a.agentId)..add(b.agentId);
          severity += 0.25;
        }
      }
    }

    return CollusionAssessment(
      severity: severity.clamp(0.0, 1.0).toDouble(),
      detectedAttacks: attacks,
      involvedAgents: involvedAgents,
    );
  }

  RewardQualityCheck evaluateRewardQualityCorrelation({
    required double avgRewardLevel,
    required double avgOutcomeQuality,
    required double avgEngagementQuality,
  }) {
    final reward = avgRewardLevel.clamp(0.0, 1.0).toDouble();
    final outcome = avgOutcomeQuality.clamp(0.0, 1.0).toDouble();
    final engagement = avgEngagementQuality.clamp(0.0, 1.0).toDouble();
    final qualityComposite = ((outcome * 0.6) + (engagement * 0.4)).clamp(0.0, 1.0);
    final correlationScore = (1.0 - (reward - qualityComposite).abs()).clamp(0.0, 1.0);
    return RewardQualityCheck(
      correlationScore: correlationScore.toDouble(),
      degraded: correlationScore < 0.45,
    );
  }

  TrustScoreVector computeTrust(AgentBehaviorSnapshot snapshot) {
    final authenticity = ((snapshot.outcomeQualityScore * 0.5) +
            (snapshot.userBehavior.interactionEntropy * 0.3) +
            ((1.0 - snapshot.userBehavior.deviceFingerprintRisk) * 0.2))
        .clamp(0.0, 1.0)
        .toDouble();
    final consistency = ((snapshot.userBehavior.behavioralConsistency * 0.6) +
            (snapshot.userBehavior.watchTimeDistributionScore * 0.4))
        .clamp(0.0, 1.0)
        .toDouble();
    final fraudProbability = ((snapshot.rewardGrowthRate * 0.25) +
            (snapshot.rewardThresholdConcentration * 0.2) +
            (snapshot.competitorTargetPressure * 0.2) +
            (snapshot.userBehavior.deviceFingerprintRisk * 0.2) +
            ((1.0 - snapshot.userBehavior.interactionVariance) * 0.15))
        .clamp(0.0, 1.0)
        .toDouble();
    return TrustScoreVector(
      authenticityScore: authenticity,
      consistencyScore: consistency,
      fraudProbability: fraudProbability,
    );
  }

  DefensePenalty computePenalty({
    required ManipulationAssessment manipulation,
    required CollusionAssessment collusion,
    required RewardQualityCheck rewardQuality,
    required TrustScoreVector trust,
  }) {
    final pressure = (manipulation.severity * 0.35) +
        (collusion.severity * 0.35) +
        ((rewardQuality.degraded ? 0.2 : 0.0)) +
        (trust.fraudProbability * 0.3);
    final normalizedPressure = pressure.clamp(0.0, 1.0).toDouble();

    final reach = (1.0 - normalizedPressure * 0.7).clamp(0.1, 1.0).toDouble();
    final cost = (1.0 + normalizedPressure * 1.6).clamp(1.0, 3.0).toDouble();
    final conversionPriority =
        (1.0 - normalizedPressure * 0.65).clamp(0.15, 1.0).toDouble();

    final reasons = <String>{};
    if (manipulation.detectedAttacks.isNotEmpty) reasons.add('manipulation_detected');
    if (collusion.detectedAttacks.isNotEmpty) reasons.add('collusion_detected');
    if (rewardQuality.degraded) reasons.add('reward_quality_mismatch');
    if (trust.fraudProbability > 0.6) reasons.add('high_fraud_probability');
    if (trust.composite < 0.45) reasons.add('low_composite_trust');

    return DefensePenalty(
      reachMultiplier: reach,
      costMultiplier: cost,
      conversionPriorityMultiplier: conversionPriority,
      reasonCodes: reasons,
    );
  }

  DefenseDecision runDefenseLoop({
    required AgentBehaviorSnapshot snapshot,
    required List<AgentMarketTrace> allAgentTraces,
    required double avgRewardLevel,
    required double avgOutcomeQuality,
    required double avgEngagementQuality,
    required String activePolicyVersionId,
  }) {
    final manipulation = detectManipulation(snapshot);
    final collusion = detectCollusion(allAgentTraces);
    final rewardQuality = evaluateRewardQualityCorrelation(
      avgRewardLevel: avgRewardLevel,
      avgOutcomeQuality: avgOutcomeQuality,
      avgEngagementQuality: avgEngagementQuality,
    );
    final trust = computeTrust(snapshot);
    final penalty = computePenalty(
      manipulation: manipulation,
      collusion: collusion,
      rewardQuality: rewardQuality,
      trust: trust,
    );

    final flagged = manipulation.severity > 0.25 ||
        collusion.severity > 0.25 ||
        rewardQuality.degraded ||
        trust.fraudProbability > 0.55;

    return DefenseDecision(
      flagged: flagged,
      manipulation: manipulation,
      collusion: collusion,
      rewardQuality: rewardQuality,
      trust: trust,
      penalty: penalty,
      policyVersionId: activePolicyVersionId,
    );
  }

  List<SimulationAgentProfile> buildAdversarialSimulationSet({
    required String campaignId,
    required String baseSegment,
  }) {
    return <SimulationAgentProfile>[
      SimulationAgentProfile(
        type: AgentSimulationType.honest,
        behavior: AgentBehaviorSnapshot(
          agentId: 'sim_honest',
          campaignId: campaignId,
          rewardGrowthRate: 0.3,
          outcomeQualityScore: 0.82,
          conversionRate: 0.64,
          watchToEngagementRatio: 0.58,
          rewardThresholdConcentration: 0.32,
          trustScoreDelta: 0.18,
          competitorTargetPressure: 0.2,
          userBehavior: const UserBehaviorVector(
            watchTimeDistributionScore: 0.7,
            interactionVariance: 0.72,
            rewardResponsePatternScore: 0.45,
            interactionEntropy: 0.75,
            deviceFingerprintRisk: 0.1,
            behavioralConsistency: 0.62,
          ),
        ),
        marketTrace: AgentMarketTrace(
          agentId: 'sim_honest',
          segments: <String>{baseSegment, '${baseSegment}_adjacent'},
          bidPattern: const <double>[0.18, 0.19, 0.17, 0.21],
          timingPattern: const <double>[0.4, 0.6, 0.52, 0.65],
          rewardFlowToPeersScore: 0.05,
          botSimilarityScore: 0.1,
        ),
      ),
      SimulationAgentProfile(
        type: AgentSimulationType.manipulative,
        behavior: AgentBehaviorSnapshot(
          agentId: 'sim_manip',
          campaignId: campaignId,
          rewardGrowthRate: 0.92,
          outcomeQualityScore: 0.26,
          conversionRate: 0.31,
          watchToEngagementRatio: 0.9,
          rewardThresholdConcentration: 0.91,
          trustScoreDelta: 0.74,
          competitorTargetPressure: 0.81,
          userBehavior: const UserBehaviorVector(
            watchTimeDistributionScore: 0.97,
            interactionVariance: 0.14,
            rewardResponsePatternScore: 0.93,
            interactionEntropy: 0.16,
            deviceFingerprintRisk: 0.62,
            behavioralConsistency: 0.96,
          ),
        ),
        marketTrace: AgentMarketTrace(
          agentId: 'sim_manip',
          segments: <String>{baseSegment},
          bidPattern: const <double>[0.42, 0.43, 0.44, 0.45],
          timingPattern: const <double>[0.2, 0.2, 0.2, 0.2],
          rewardFlowToPeersScore: 0.68,
          botSimilarityScore: 0.64,
        ),
      ),
      SimulationAgentProfile(
        type: AgentSimulationType.colluding,
        behavior: AgentBehaviorSnapshot(
          agentId: 'sim_collude',
          campaignId: campaignId,
          rewardGrowthRate: 0.78,
          outcomeQualityScore: 0.38,
          conversionRate: 0.44,
          watchToEngagementRatio: 0.83,
          rewardThresholdConcentration: 0.82,
          trustScoreDelta: 0.52,
          competitorTargetPressure: 0.73,
          userBehavior: const UserBehaviorVector(
            watchTimeDistributionScore: 0.88,
            interactionVariance: 0.24,
            rewardResponsePatternScore: 0.81,
            interactionEntropy: 0.28,
            deviceFingerprintRisk: 0.48,
            behavioralConsistency: 0.9,
          ),
        ),
        marketTrace: AgentMarketTrace(
          agentId: 'sim_collude',
          segments: <String>{baseSegment, '${baseSegment}_premium'},
          bidPattern: const <double>[0.41, 0.41, 0.42, 0.42],
          timingPattern: const <double>[0.84, 0.85, 0.84, 0.86],
          rewardFlowToPeersScore: 0.84,
          botSimilarityScore: 0.58,
        ),
      ),
      SimulationAgentProfile(
        type: AgentSimulationType.bot,
        behavior: AgentBehaviorSnapshot(
          agentId: 'sim_bot',
          campaignId: campaignId,
          rewardGrowthRate: 0.88,
          outcomeQualityScore: 0.21,
          conversionRate: 0.22,
          watchToEngagementRatio: 0.95,
          rewardThresholdConcentration: 0.89,
          trustScoreDelta: 0.61,
          competitorTargetPressure: 0.69,
          userBehavior: const UserBehaviorVector(
            watchTimeDistributionScore: 0.99,
            interactionVariance: 0.08,
            rewardResponsePatternScore: 0.95,
            interactionEntropy: 0.07,
            deviceFingerprintRisk: 0.86,
            behavioralConsistency: 0.98,
          ),
        ),
        marketTrace: AgentMarketTrace(
          agentId: 'sim_bot',
          segments: <String>{baseSegment, '${baseSegment}_premium'},
          bidPattern: const <double>[0.4, 0.4, 0.4, 0.4],
          timingPattern: const <double>[0.84, 0.84, 0.84, 0.84],
          rewardFlowToPeersScore: 0.87,
          botSimilarityScore: 0.93,
        ),
      ),
    ];
  }

  double _jaccard(Set<String> a, Set<String> b) {
    final intersection = a.intersection(b).length.toDouble();
    final union = a.union(b).length.toDouble();
    if (union <= 0) return 0.0;
    return intersection / union;
  }

  double _seriesSimilarity(List<double> a, List<double> b) {
    if (a.isEmpty || b.isEmpty) return 0.0;
    final length = math.min(a.length, b.length);
    var totalDelta = 0.0;
    for (var i = 0; i < length; i++) {
      totalDelta += (a[i] - b[i]).abs();
    }
    final avgDelta = totalDelta / length;
    return (1.0 - avgDelta).clamp(0.0, 1.0).toDouble();
  }
}

enum RedTeamAgentType {
  attentionSpoofing,
  economicExploit,
  collusionSwarm,
  withdrawalAttack,
  platformSpoofing,
}

enum RedTeamScenarioType {
  botFarm,
  slowHumanLikeFraud,
  flashAttack,
  creatorExploit,
  crossPlatformAttack,
}

enum SimulationEnvironmentMode {
  shadow,
  liveFire,
}

final class RedTeamGenome {
  const RedTeamGenome({
    required this.timingAggression,
    required this.behaviorEntropy,
    required this.gazeRandomness,
    required this.rewardExtractionBias,
    required this.collusionCoordination,
    required this.withdrawVelocity,
    required this.platformSpoofDepth,
  });

  final double timingAggression; // 0..1
  final double behaviorEntropy; // 0..1
  final double gazeRandomness; // 0..1
  final double rewardExtractionBias; // 0..1
  final double collusionCoordination; // 0..1
  final double withdrawVelocity; // 0..1
  final double platformSpoofDepth; // 0..1

  RedTeamGenome mutate({
    required math.Random rng,
    required bool detectedFast,
  }) {
    final mutationStep = detectedFast ? 0.16 : 0.08;
    double mutateValue(double value) {
      final delta = (rng.nextDouble() * mutationStep * 2) - mutationStep;
      return (value + delta).clamp(0.0, 1.0).toDouble();
    }

    return RedTeamGenome(
      timingAggression: mutateValue(timingAggression),
      behaviorEntropy: mutateValue(behaviorEntropy),
      gazeRandomness: mutateValue(gazeRandomness),
      rewardExtractionBias: mutateValue(rewardExtractionBias),
      collusionCoordination: mutateValue(collusionCoordination),
      withdrawVelocity: mutateValue(withdrawVelocity),
      platformSpoofDepth: mutateValue(platformSpoofDepth),
    );
  }
}

final class RedTeamAgent {
  const RedTeamAgent({
    required this.id,
    required this.type,
    required this.genome,
    required this.fitness,
  });

  final String id;
  final RedTeamAgentType type;
  final RedTeamGenome genome;
  final double fitness;

  RedTeamAgent evolve({
    required RedTeamGenome nextGenome,
    required double nextFitness,
  }) {
    return RedTeamAgent(
      id: id,
      type: type,
      genome: nextGenome,
      fitness: nextFitness,
    );
  }
}

final class SystemSurfaceState {
  const SystemSurfaceState({
    required this.watchVerifyStrength,
    required this.rewardIssuanceStrength,
    required this.walletGateStrength,
    required this.trustIntegrityStrength,
    required this.integrationIntegrityStrength,
    required this.liquidityResilience,
  });

  final double watchVerifyStrength; // 0..1
  final double rewardIssuanceStrength; // 0..1
  final double walletGateStrength; // 0..1
  final double trustIntegrityStrength; // 0..1
  final double integrationIntegrityStrength; // 0..1
  final double liquidityResilience; // 0..1
}

final class PolicyEngineState {
  const PolicyEngineState({
    required this.anomalySensitivity,
    required this.payoutThrottle,
    required this.rewardClamp,
    required this.trustWeighting,
    required this.integrationSignalWeighting,
  });

  final double anomalySensitivity; // 0..1
  final double payoutThrottle; // 0..1
  final double rewardClamp; // 0..1
  final double trustWeighting; // 0..1
  final double integrationSignalWeighting; // 0..1

  PolicyEngineState adapt({
    required double globalPressure,
  }) {
    final pressure = globalPressure.clamp(0.0, 1.0).toDouble();
    return PolicyEngineState(
      anomalySensitivity: (anomalySensitivity + pressure * 0.18).clamp(0.0, 1.0).toDouble(),
      payoutThrottle: (payoutThrottle + pressure * 0.22).clamp(0.0, 1.0).toDouble(),
      rewardClamp: (rewardClamp + pressure * 0.2).clamp(0.0, 1.0).toDouble(),
      trustWeighting: (trustWeighting + pressure * 0.14).clamp(0.0, 1.0).toDouble(),
      integrationSignalWeighting:
          (integrationSignalWeighting + pressure * 0.16).clamp(0.0, 1.0).toDouble(),
    );
  }
}

final class RedTeamOutcome {
  const RedTeamOutcome({
    required this.agentId,
    required this.agentType,
    required this.scenario,
    required this.rewardsExtracted,
    required this.detectionPenalty,
    required this.timeToDetection,
    required this.detected,
    required this.fitness,
  });

  final String agentId;
  final RedTeamAgentType agentType;
  final RedTeamScenarioType scenario;
  final double rewardsExtracted;
  final double detectionPenalty;
  final double timeToDetection;
  final bool detected;
  final double fitness;
}

final class WarCycleReport {
  const WarCycleReport({
    required this.environmentMode,
    required this.scenario,
    required this.outcomes,
    required this.policyState,
    required this.globalPressure,
  });

  final SimulationEnvironmentMode environmentMode;
  final RedTeamScenarioType scenario;
  final List<RedTeamOutcome> outcomes;
  final PolicyEngineState policyState;
  final double globalPressure; // 0..1
}

final class WarLoopReport {
  const WarLoopReport({
    required this.cycles,
    required this.reports,
    required this.finalAgents,
    required this.finalPolicy,
  });

  final int cycles;
  final List<WarCycleReport> reports;
  final List<RedTeamAgent> finalAgents;
  final PolicyEngineState finalPolicy;
}

final class RedTeamSimulationEngine {
  RedTeamSimulationEngine({
    math.Random? random,
  }) : _rng = random ?? math.Random(111);

  final math.Random _rng;

  List<RedTeamAgent> buildInitialSwarm() {
    return <RedTeamAgent>[
      RedTeamAgent(
        id: 'agent_attention',
        type: RedTeamAgentType.attentionSpoofing,
        genome: const RedTeamGenome(
          timingAggression: 0.7,
          behaviorEntropy: 0.25,
          gazeRandomness: 0.35,
          rewardExtractionBias: 0.6,
          collusionCoordination: 0.3,
          withdrawVelocity: 0.2,
          platformSpoofDepth: 0.2,
        ),
        fitness: 0,
      ),
      RedTeamAgent(
        id: 'agent_econ',
        type: RedTeamAgentType.economicExploit,
        genome: const RedTeamGenome(
          timingAggression: 0.8,
          behaviorEntropy: 0.45,
          gazeRandomness: 0.2,
          rewardExtractionBias: 0.92,
          collusionCoordination: 0.5,
          withdrawVelocity: 0.5,
          platformSpoofDepth: 0.4,
        ),
        fitness: 0,
      ),
      RedTeamAgent(
        id: 'agent_collusion',
        type: RedTeamAgentType.collusionSwarm,
        genome: const RedTeamGenome(
          timingAggression: 0.55,
          behaviorEntropy: 0.35,
          gazeRandomness: 0.3,
          rewardExtractionBias: 0.65,
          collusionCoordination: 0.95,
          withdrawVelocity: 0.45,
          platformSpoofDepth: 0.45,
        ),
        fitness: 0,
      ),
      RedTeamAgent(
        id: 'agent_withdraw',
        type: RedTeamAgentType.withdrawalAttack,
        genome: const RedTeamGenome(
          timingAggression: 0.9,
          behaviorEntropy: 0.28,
          gazeRandomness: 0.2,
          rewardExtractionBias: 0.78,
          collusionCoordination: 0.4,
          withdrawVelocity: 0.96,
          platformSpoofDepth: 0.3,
        ),
        fitness: 0,
      ),
      RedTeamAgent(
        id: 'agent_platform',
        type: RedTeamAgentType.platformSpoofing,
        genome: const RedTeamGenome(
          timingAggression: 0.68,
          behaviorEntropy: 0.48,
          gazeRandomness: 0.36,
          rewardExtractionBias: 0.7,
          collusionCoordination: 0.5,
          withdrawVelocity: 0.35,
          platformSpoofDepth: 0.94,
        ),
        fitness: 0,
      ),
    ];
  }

  PolicyEngineState initialPolicy() {
    return const PolicyEngineState(
      anomalySensitivity: 0.45,
      payoutThrottle: 0.35,
      rewardClamp: 0.4,
      trustWeighting: 0.5,
      integrationSignalWeighting: 0.45,
    );
  }

  WarLoopReport runWarLoop({
    required int cycles,
    required List<RedTeamAgent> initialAgents,
    required SystemSurfaceState surface,
    required PolicyEngineState initialPolicy,
    required SimulationEnvironmentMode mode,
    double liveFireConfidence = 0.0,
    double liveFireThreshold = 0.82,
  }) {
    var agents = List<RedTeamAgent>.of(initialAgents);
    var policy = initialPolicy;
    final reports = <WarCycleReport>[];
    final runLiveFire = mode == SimulationEnvironmentMode.liveFire &&
        liveFireConfidence >= liveFireThreshold;

    for (var i = 0; i < cycles; i++) {
      final scenario = _spawnAttackScenario();
      final executionMode = runLiveFire ? SimulationEnvironmentMode.liveFire : SimulationEnvironmentMode.shadow;
      final outcomes = <RedTeamOutcome>[
        for (final agent in agents)
          _runAgent(
            agent: agent,
            scenario: scenario,
            surface: surface,
            policy: policy,
            mode: executionMode,
          ),
      ];

      final averageFitness =
          outcomes.fold<double>(0.0, (sum, item) => sum + item.fitness) / math.max(1, outcomes.length);
      final globalPressure = (averageFitness / 4.0).clamp(0.0, 1.0).toDouble();
      policy = policy.adapt(globalPressure: globalPressure);

      final byId = <String, RedTeamOutcome>{
        for (final outcome in outcomes) outcome.agentId: outcome,
      };
      agents = agents.map((agent) {
        final outcome = byId[agent.id]!;
        final detectedFast = outcome.detected && outcome.timeToDetection < 0.35;
        final nextGenome = agent.genome.mutate(rng: _rng, detectedFast: detectedFast);
        return agent.evolve(nextGenome: nextGenome, nextFitness: outcome.fitness);
      }).toList();

      reports.add(
        WarCycleReport(
          environmentMode: executionMode,
          scenario: scenario,
          outcomes: outcomes,
          policyState: policy,
          globalPressure: globalPressure,
        ),
      );
    }

    return WarLoopReport(
      cycles: cycles,
      reports: List<WarCycleReport>.unmodifiable(reports),
      finalAgents: List<RedTeamAgent>.unmodifiable(agents),
      finalPolicy: policy,
    );
  }

  RedTeamScenarioType _spawnAttackScenario() {
    final draw = _rng.nextDouble();
    if (draw < 0.20) return RedTeamScenarioType.botFarm;
    if (draw < 0.45) return RedTeamScenarioType.slowHumanLikeFraud;
    if (draw < 0.65) return RedTeamScenarioType.flashAttack;
    if (draw < 0.82) return RedTeamScenarioType.creatorExploit;
    return RedTeamScenarioType.crossPlatformAttack;
  }

  RedTeamOutcome _runAgent({
    required RedTeamAgent agent,
    required RedTeamScenarioType scenario,
    required SystemSurfaceState surface,
    required PolicyEngineState policy,
    required SimulationEnvironmentMode mode,
  }) {
    final extractionPressure = _scenarioExtractionPressure(scenario);
    final scenarioSurface = _scenarioSurfaceSensitivity(scenario, agent.type, surface);
    final genomePower = _genomePower(agent.genome, agent.type);
    final modeScale = mode == SimulationEnvironmentMode.shadow ? 1.0 : 0.25;

    final rewardsExtracted = (extractionPressure * genomePower * scenarioSurface * modeScale * 100.0)
        .clamp(0.0, 100.0)
        .toDouble();
    final detectionPenalty =
        _detectionPenalty(agent: agent, scenario: scenario, policy: policy, surface: surface);
    final timeToDetection = _timeToDetection(
      detectionPenalty: detectionPenalty,
      policy: policy,
      mode: mode,
    );
    final detected = detectionPenalty > 18.0 || timeToDetection < 0.2;
    final fitness = (rewardsExtracted - detectionPenalty - timeToDetection).toDouble();

    return RedTeamOutcome(
      agentId: agent.id,
      agentType: agent.type,
      scenario: scenario,
      rewardsExtracted: rewardsExtracted,
      detectionPenalty: detectionPenalty,
      timeToDetection: timeToDetection,
      detected: detected,
      fitness: fitness,
    );
  }

  double _scenarioExtractionPressure(RedTeamScenarioType scenario) {
    return switch (scenario) {
      RedTeamScenarioType.botFarm => 0.88,
      RedTeamScenarioType.slowHumanLikeFraud => 0.72,
      RedTeamScenarioType.flashAttack => 0.96,
      RedTeamScenarioType.creatorExploit => 0.82,
      RedTeamScenarioType.crossPlatformAttack => 0.78,
    };
  }

  double _scenarioSurfaceSensitivity(
    RedTeamScenarioType scenario,
    RedTeamAgentType type,
    SystemSurfaceState surface,
  ) {
    final watchWeakness = 1.0 - surface.watchVerifyStrength;
    final rewardWeakness = 1.0 - surface.rewardIssuanceStrength;
    final walletWeakness = 1.0 - surface.walletGateStrength;
    final trustWeakness = 1.0 - surface.trustIntegrityStrength;
    final integrationWeakness = 1.0 - surface.integrationIntegrityStrength;
    final liquidityWeakness = 1.0 - surface.liquidityResilience;

    final agentBias = switch (type) {
      RedTeamAgentType.attentionSpoofing => (watchWeakness * 0.55) + (rewardWeakness * 0.45),
      RedTeamAgentType.economicExploit => (rewardWeakness * 0.65) + (walletWeakness * 0.35),
      RedTeamAgentType.collusionSwarm => (trustWeakness * 0.6) + (rewardWeakness * 0.4),
      RedTeamAgentType.withdrawalAttack => (walletWeakness * 0.65) + (liquidityWeakness * 0.35),
      RedTeamAgentType.platformSpoofing =>
        (integrationWeakness * 0.7) + (trustWeakness * 0.3),
    };

    final scenarioBias = switch (scenario) {
      RedTeamScenarioType.botFarm => watchWeakness * 0.25,
      RedTeamScenarioType.slowHumanLikeFraud => trustWeakness * 0.28,
      RedTeamScenarioType.flashAttack => walletWeakness * 0.3,
      RedTeamScenarioType.creatorExploit => rewardWeakness * 0.26,
      RedTeamScenarioType.crossPlatformAttack => integrationWeakness * 0.3,
    };
    return (0.45 + agentBias + scenarioBias).clamp(0.2, 1.9).toDouble();
  }

  double _genomePower(RedTeamGenome genome, RedTeamAgentType type) {
    return switch (type) {
      RedTeamAgentType.attentionSpoofing =>
        (genome.gazeRandomness * 0.45) + (genome.behaviorEntropy * 0.3) + (genome.timingAggression * 0.25),
      RedTeamAgentType.economicExploit =>
        (genome.rewardExtractionBias * 0.6) + (genome.timingAggression * 0.25) + (genome.behaviorEntropy * 0.15),
      RedTeamAgentType.collusionSwarm =>
        (genome.collusionCoordination * 0.65) + (genome.rewardExtractionBias * 0.2) + (genome.behaviorEntropy * 0.15),
      RedTeamAgentType.withdrawalAttack =>
        (genome.withdrawVelocity * 0.7) + (genome.timingAggression * 0.2) + (genome.rewardExtractionBias * 0.1),
      RedTeamAgentType.platformSpoofing =>
        (genome.platformSpoofDepth * 0.7) + (genome.behaviorEntropy * 0.15) + (genome.collusionCoordination * 0.15),
    }
        .clamp(0.0, 1.0)
        .toDouble();
  }

  double _detectionPenalty({
    required RedTeamAgent agent,
    required RedTeamScenarioType scenario,
    required PolicyEngineState policy,
    required SystemSurfaceState surface,
  }) {
    final scenarioDifficulty = switch (scenario) {
      RedTeamScenarioType.botFarm => 0.7,
      RedTeamScenarioType.slowHumanLikeFraud => 0.48,
      RedTeamScenarioType.flashAttack => 0.82,
      RedTeamScenarioType.creatorExploit => 0.62,
      RedTeamScenarioType.crossPlatformAttack => 0.66,
    };
    final policyStrength = (policy.anomalySensitivity * 0.35) +
        (policy.payoutThrottle * 0.2) +
        (policy.rewardClamp * 0.15) +
        (policy.trustWeighting * 0.15) +
        (policy.integrationSignalWeighting * 0.15);
    final surfaceStrength = (surface.watchVerifyStrength * 0.2) +
        (surface.rewardIssuanceStrength * 0.2) +
        (surface.walletGateStrength * 0.2) +
        (surface.trustIntegrityStrength * 0.2) +
        (surface.integrationIntegrityStrength * 0.2);

    final stealth = (agent.genome.behaviorEntropy * 0.4) + (agent.genome.gazeRandomness * 0.2);
    return ((scenarioDifficulty + policyStrength + surfaceStrength - stealth) * 24.0)
        .clamp(0.0, 30.0)
        .toDouble();
  }

  double _timeToDetection({
    required double detectionPenalty,
    required PolicyEngineState policy,
    required SimulationEnvironmentMode mode,
  }) {
    final base = 1.0 - (detectionPenalty / 30.0);
    final policyEffect = 1.0 - (policy.anomalySensitivity * 0.6);
    final modeMultiplier = mode == SimulationEnvironmentMode.shadow ? 1.0 : 0.7;
    return (base * policyEffect * modeMultiplier).clamp(0.02, 1.0).toDouble();
  }
}
