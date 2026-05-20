import 'dart:math' as math;

import 'attention_market_engine.dart';

enum StrategyType {
  yourAgent,
  aggressive,
  conservative,
  sniper,
  flooder,
  manipulator,
  random,
  exploit,
}

final class VirtualUser {
  const VirtualUser({
    required this.id,
    required this.segment,
    required this.attentionProfile,
    required this.conversionProbability,
    required this.fatigueCurve,
    required this.trustScore,
    required this.rewardSensitivity,
  });

  final String id;
  final String segment;
  final double attentionProfile;
  final double conversionProbability;
  final double fatigueCurve;
  final double trustScore;
  final double rewardSensitivity;
}

final class VirtualMarketState {
  const VirtualMarketState({
    required this.demandDensity,
    required this.priceDistribution,
    required this.timeOfDayEffects,
    required this.competitionIntensity,
    required this.timestep,
  });

  final double demandDensity;
  final double priceDistribution;
  final double timeOfDayEffects;
  final double competitionIntensity;
  final int timestep;
}

final class StrategyGenome {
  const StrategyGenome({
    required this.bidBias,
    required this.targetSelectivity,
    required this.timingSensitivity,
    required this.rewardShaping,
  });

  final double bidBias;
  final double targetSelectivity;
  final double timingSensitivity;
  final double rewardShaping;

  StrategyGenome mutate(math.Random rng) {
    double mutateParam(double value, {double maxStep = 0.08}) {
      final step = (rng.nextDouble() * maxStep * 2) - maxStep;
      return (value + step).clamp(0.0, 1.0).toDouble();
    }

    return StrategyGenome(
      bidBias: mutateParam(bidBias),
      targetSelectivity: mutateParam(targetSelectivity),
      timingSensitivity: mutateParam(timingSensitivity),
      rewardShaping: mutateParam(rewardShaping, maxStep: 0.06),
    );
  }
}

final class SimDecision {
  const SimDecision({
    required this.agentId,
    required this.bidUsd,
    required this.targetUserId,
    required this.rewardLevel,
  });

  final String agentId;
  final double bidUsd;
  final String targetUserId;
  final double rewardLevel;
}

final class SimOutcome {
  const SimOutcome({
    required this.agentId,
    required this.userId,
    required this.costUsd,
    required this.revenueUsd,
    required this.conversion,
    required this.segment,
  });

  final String agentId;
  final String userId;
  final double costUsd;
  final double revenueUsd;
  final bool conversion;
  final String segment;

  double get reward => revenueUsd - costUsd;
  double get roi => costUsd <= 0 ? 0 : (revenueUsd - costUsd) / costUsd;
}

final class SimulatedAgent {
  SimulatedAgent({
    required this.id,
    required this.type,
    required this.genome,
    required this.initialBudgetUsd,
  }) : budgetRemainingUsd = initialBudgetUsd;

  final String id;
  final StrategyType type;
  final StrategyGenome genome;
  final double initialBudgetUsd;
  double budgetRemainingUsd;
  double cumulativeRevenueUsd = 0;
  double cumulativeCostUsd = 0;
  int conversions = 0;
  int steps = 0;
  final Map<String, double> segmentScore = <String, double>{};
  final List<double> roiCurve = <double>[];
  final List<double> bidHistory = <double>[];
  final List<String> failures = <String>[];

  SimDecision decide({
    required VirtualMarketState market,
    required List<VirtualUser> users,
    required math.Random rng,
  }) {
    final candidate = _selectUser(users, market, rng);
    final baseBid = _baseBidByType();
    final timingEdge = (market.timeOfDayEffects * genome.timingSensitivity)
        .clamp(0.4, 1.8)
        .toDouble();
    final competitionEdge =
        (1.0 + market.competitionIntensity * genome.bidBias).clamp(0.5, 2.2);

    final rewardLevel = (0.6 + genome.rewardShaping * 0.8).clamp(0.5, 1.6);
    final bidUsd = (baseBid *
            timingEdge *
            competitionEdge *
            (0.6 + candidate.rewardSensitivity * 0.8 * rewardLevel))
        .clamp(0.01, math.max(0.01, budgetRemainingUsd))
        .toDouble();

    bidHistory.add(bidUsd);
    return SimDecision(
      agentId: id,
      bidUsd: bidUsd,
      targetUserId: candidate.id,
      rewardLevel: rewardLevel.toDouble(),
    );
  }

  void learn(SimOutcome outcome) {
    steps += 1;
    cumulativeCostUsd += outcome.costUsd;
    cumulativeRevenueUsd += outcome.revenueUsd;
    if (outcome.conversion) conversions += 1;
    budgetRemainingUsd = math.max(0, budgetRemainingUsd - outcome.costUsd);
    segmentScore[outcome.segment] = (segmentScore[outcome.segment] ?? 0) + outcome.reward;

    final roiNow = cumulativeCostUsd <= 0
        ? 0.0
        : (cumulativeRevenueUsd - cumulativeCostUsd) / cumulativeCostUsd;
    roiCurve.add(roiNow);

    if (outcome.costUsd > outcome.revenueUsd * 1.5) {
      failures.add('overbid_${outcome.segment}');
    }
    if (!outcome.conversion && outcome.costUsd > 0.25) {
      failures.add('wasted_budget_${outcome.segment}');
    }
  }

  double get roi =>
      cumulativeCostUsd <= 0 ? 0.0 : (cumulativeRevenueUsd - cumulativeCostUsd) / cumulativeCostUsd;

  List<String> bestSegments() {
    final sorted = segmentScore.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return sorted.take(3).map((e) => e.key).toList();
  }

  BidRange optimalBidRange() {
    if (bidHistory.isEmpty) {
      return const BidRange(minUsd: 0.0, maxUsd: 0.0);
    }
    final sorted = List<double>.of(bidHistory)..sort();
    final minIndex = (sorted.length * 0.25).floor().clamp(0, sorted.length - 1);
    final maxIndex = (sorted.length * 0.75).floor().clamp(0, sorted.length - 1);
    return BidRange(minUsd: sorted[minIndex], maxUsd: sorted[maxIndex]);
  }

  VirtualUser _selectUser(
    List<VirtualUser> users,
    VirtualMarketState market,
    math.Random rng,
  ) {
    final sorted = List<VirtualUser>.of(users)
      ..sort((a, b) {
        final scoreA = (a.conversionProbability * genome.targetSelectivity) +
            (a.attentionProfile * (1 - genome.targetSelectivity)) -
            (a.fatigueCurve * 0.2 * market.competitionIntensity);
        final scoreB = (b.conversionProbability * genome.targetSelectivity) +
            (b.attentionProfile * (1 - genome.targetSelectivity)) -
            (b.fatigueCurve * 0.2 * market.competitionIntensity);
        return scoreB.compareTo(scoreA);
      });
    if (type == StrategyType.flooder || type == StrategyType.random) {
      return users[rng.nextInt(users.length)];
    }
    final topWindow = math.max(1, (users.length * 0.35).round());
    return sorted[rng.nextInt(topWindow)];
  }

  double _baseBidByType() {
    return switch (type) {
      StrategyType.aggressive => 0.42,
      StrategyType.conservative => 0.16,
      StrategyType.sniper => 0.24,
      StrategyType.flooder => 0.19,
      StrategyType.manipulator => 0.28,
      StrategyType.random => 0.22,
      StrategyType.exploit => 0.31,
      StrategyType.yourAgent => 0.26,
    };
  }
}

final class BidRange {
  const BidRange({
    required this.minUsd,
    required this.maxUsd,
  });

  final double minUsd;
  final double maxUsd;
}

final class AgentSimulationResult {
  const AgentSimulationResult({
    required this.agentId,
    required this.strategyType,
    required this.roiCurve,
    required this.bestSegments,
    required this.optimalBidRange,
    required this.failurePatterns,
    required this.finalRoi,
  });

  final String agentId;
  final StrategyType strategyType;
  final List<double> roiCurve;
  final List<String> bestSegments;
  final BidRange optimalBidRange;
  final List<String> failurePatterns;
  final double finalRoi;
}

final class SimulationResult {
  const SimulationResult({
    required this.runs,
    required this.timestepsPerRun,
    required this.agentResults,
    required this.evolvedStrategies,
  });

  final int runs;
  final int timestepsPerRun;
  final List<AgentSimulationResult> agentResults;
  final Map<String, StrategyGenome> evolvedStrategies;
}

final class SimulationLayerCoordinator {
  const SimulationLayerCoordinator();

  /// Translate simulation winners into live market controls.
  MarketStrategyOverride buildMarketStrategy(SimulationResult simulation) {
    if (simulation.agentResults.isEmpty) {
      return const MarketStrategyOverride();
    }
    final top = simulation.agentResults.first;
    final roi = top.finalRoi.clamp(-1.0, 3.0);
    final bidRange = top.optimalBidRange;
    final bidCenter = ((bidRange.minUsd + bidRange.maxUsd) / 2).clamp(0.01, 1.0);

    return MarketStrategyOverride(
      rewardMultiplier: (1.0 + roi * 0.2).clamp(0.8, 1.5),
      globalBidMultiplier: (0.8 + bidCenter).clamp(0.6, 1.8),
      marketPressureMultiplier: (1.0 + roi.abs() * 0.08).clamp(0.8, 1.4),
      volatilityDamping: roi > 0.5 ? 0.85 : 1.0,
    );
  }
}

final class SimulationEngine {
  SimulationEngine({
    math.Random? random,
  }) : _rng = random ?? math.Random(42);

  final math.Random _rng;

  SimulationResult run({
    required int runs,
    required int timestepsPerRun,
    required List<VirtualUser> virtualUsers,
    required List<SimulatedAgent> agents,
  }) {
    var currentAgents = List<SimulatedAgent>.of(agents);
    for (var run = 0; run < runs; run++) {
      for (var t = 0; t < timestepsPerRun; t++) {
        final market = _marketStateForStep(step: t, users: virtualUsers, agents: currentAgents);
        final decisions = <SimDecision>[
          for (final agent in currentAgents)
            if (agent.budgetRemainingUsd > 0)
              agent.decide(market: market, users: virtualUsers, rng: _rng),
        ];
        final outcomes = _resolveMarket(
          decisions: decisions,
          users: virtualUsers,
          market: market,
        );
        for (final outcome in outcomes) {
          final agent = currentAgents.firstWhere((a) => a.id == outcome.agentId);
          agent.learn(outcome);
        }
      }
      currentAgents = _evolveAgents(currentAgents);
    }

    final results = currentAgents
        .map(
          (agent) => AgentSimulationResult(
            agentId: agent.id,
            strategyType: agent.type,
            roiCurve: List<double>.unmodifiable(agent.roiCurve),
            bestSegments: List<String>.unmodifiable(agent.bestSegments()),
            optimalBidRange: agent.optimalBidRange(),
            failurePatterns: List<String>.unmodifiable(_compressFailures(agent.failures)),
            finalRoi: agent.roi,
          ),
        )
        .toList()
      ..sort((a, b) => b.finalRoi.compareTo(a.finalRoi));

    return SimulationResult(
      runs: runs,
      timestepsPerRun: timestepsPerRun,
      agentResults: List<AgentSimulationResult>.unmodifiable(results),
      evolvedStrategies: <String, StrategyGenome>{
        for (final agent in currentAgents) agent.id: agent.genome,
      },
    );
  }

  VirtualMarketState _marketStateForStep({
    required int step,
    required List<VirtualUser> users,
    required List<SimulatedAgent> agents,
  }) {
    final activeAgents = agents.where((a) => a.budgetRemainingUsd > 0).length;
    final demandDensity = (0.8 + activeAgents / math.max(1, agents.length)).clamp(0.2, 2.5);
    final avgBid = agents
            .where((a) => a.bidHistory.isNotEmpty)
            .map((a) => a.bidHistory.last)
            .fold<double>(0.0, (sum, bid) => sum + bid) /
        math.max(1, agents.where((a) => a.bidHistory.isNotEmpty).length);
    final hour = step % 24;
    final peak = (hour >= 18 && hour <= 23) ? 1.35 : (hour <= 5 ? 0.75 : 1.0);
    final trustMean = users.fold<double>(0.0, (s, u) => s + u.trustScore) / math.max(1, users.length);
    final competitionIntensity =
        (demandDensity * (0.7 + avgBid) * (1.1 - trustMean * 0.2)).clamp(0.1, 3.0).toDouble();

    return VirtualMarketState(
      demandDensity: demandDensity.toDouble(),
      priceDistribution: (0.08 + avgBid * 0.7).clamp(0.03, 0.9).toDouble(),
      timeOfDayEffects: peak.toDouble(),
      competitionIntensity: competitionIntensity,
      timestep: step,
    );
  }

  List<SimOutcome> _resolveMarket({
    required List<SimDecision> decisions,
    required List<VirtualUser> users,
    required VirtualMarketState market,
  }) {
    final byUser = <String, List<SimDecision>>{};
    for (final d in decisions) {
      byUser.putIfAbsent(d.targetUserId, () => <SimDecision>[]).add(d);
    }

    final outcomes = <SimOutcome>[];
    for (final entry in byUser.entries) {
      final user = users.firstWhere((u) => u.id == entry.key);
      final contenders = entry.value..sort((a, b) => b.bidUsd.compareTo(a.bidUsd));
      final winner = contenders.first;
      final secondBid = contenders.length > 1 ? contenders[1].bidUsd : winner.bidUsd * 0.65;
      final clearing = math.min(winner.bidUsd, secondBid + 0.01);

      final conversionChance = (user.conversionProbability *
              user.attentionProfile *
              (1.0 + winner.rewardLevel * user.rewardSensitivity * 0.15) *
              (1.0 - user.fatigueCurve * 0.25) *
              (1.0 - market.competitionIntensity * 0.04))
          .clamp(0.0, 1.0)
          .toDouble();
      final converted = _rng.nextDouble() < conversionChance;
      final revenue = converted ? clearing * (2.0 + user.trustScore * 1.8) : 0.0;

      outcomes.add(
        SimOutcome(
          agentId: winner.agentId,
          userId: user.id,
          costUsd: clearing,
          revenueUsd: revenue,
          conversion: converted,
          segment: user.segment,
        ),
      );

      // Losing bids still pay a small exploration tax in competitive markets.
      for (final loser in contenders.skip(1)) {
        outcomes.add(
          SimOutcome(
            agentId: loser.agentId,
            userId: user.id,
            costUsd: loser.bidUsd * 0.08 * market.competitionIntensity.clamp(0.2, 1.0),
            revenueUsd: 0.0,
            conversion: false,
            segment: user.segment,
          ),
        );
      }
    }
    return outcomes;
  }

  List<SimulatedAgent> _evolveAgents(List<SimulatedAgent> agents) {
    if (agents.length < 3) return agents;
    final ranked = List<SimulatedAgent>.of(agents)..sort((a, b) => b.roi.compareTo(a.roi));
    final survivors = ranked.take((ranked.length * 0.6).ceil()).toList();
    final worst = ranked.skip(survivors.length).toList();

    // Bad strategies die: replace with mutated variants of top performers.
    final replacements = <SimulatedAgent>[];
    for (var i = 0; i < worst.length; i++) {
      final parent = survivors[i % survivors.length];
      replacements.add(
        SimulatedAgent(
          id: worst[i].id,
          type: worst[i].type,
          genome: parent.genome.mutate(_rng),
          initialBudgetUsd: worst[i].initialBudgetUsd,
        ),
      );
    }

    final next = <SimulatedAgent>[...survivors, ...replacements];
    for (final agent in next) {
      agent.budgetRemainingUsd = agent.initialBudgetUsd;
    }
    return next;
  }

  List<String> _compressFailures(List<String> failures) {
    if (failures.isEmpty) return const <String>[];
    final freq = <String, int>{};
    for (final failure in failures) {
      freq[failure] = (freq[failure] ?? 0) + 1;
    }
    final sorted = freq.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return sorted.take(5).map((e) => '${e.key}:${e.value}').toList();
  }
}

enum BlackSwanScenarioType {
  perfectFakeAttention,
  rewardHyperinflationCascade,
  trustSystemInversion,
  hybridCollusionRing,
  walletDrainExploit,
  verificationGateFailure,
  economicGravityShift,
  platformIntegrationExploit,
}

final class ScenarioInjection {
  const ScenarioInjection({
    required this.botAccuracy,
    required this.collusionLevel,
    required this.rewardPressure,
    required this.walletTimingExposure,
    required this.verificationFragility,
    required this.platformSpoofingRisk,
  });

  final double botAccuracy; // 0..1
  final double collusionLevel; // 0..1
  final double rewardPressure; // 0..1
  final double walletTimingExposure; // 0..1
  final double verificationFragility; // 0..1
  final double platformSpoofingRisk; // 0..1
}

final class SystemHealth {
  const SystemHealth({
    required this.fraudLeakageRate,
    required this.trustScoreIntegrity,
    required this.rewardEfficiency,
    required this.walletLossRisk,
    required this.userBehaviorDrift,
    required this.trustScoreVariance,
    required this.conversionQuality,
  });

  final double fraudLeakageRate; // 0..1
  final double trustScoreIntegrity; // 0..1
  final double rewardEfficiency; // 0..1
  final double walletLossRisk; // 0..1
  final double userBehaviorDrift; // 0..1
  final double trustScoreVariance; // 0..1
  final double conversionQuality; // 0..1

  double get aggregateRisk {
    final integrityRisk = 1.0 - trustScoreIntegrity;
    final efficiencyRisk = 1.0 - rewardEfficiency;
    final conversionRisk = 1.0 - conversionQuality;
    return ((fraudLeakageRate * 0.28) +
            (walletLossRisk * 0.24) +
            (integrityRisk * 0.18) +
            (efficiencyRisk * 0.15) +
            (userBehaviorDrift * 0.10) +
            (conversionRisk * 0.05))
        .clamp(0.0, 1.0)
        .toDouble();
  }
}

final class CircuitBreakerState {
  const CircuitBreakerState({
    required this.rewardScalingFrozen,
    required this.payoutThrottleMultiplier,
    required this.maxWithdrawFraction,
    required this.requiresManualReview,
  });

  final bool rewardScalingFrozen;
  final double payoutThrottleMultiplier; // 0.2..1.0
  final double maxWithdrawFraction; // 0.05..1.0
  final bool requiresManualReview;
}

final class ScenarioImpact {
  const ScenarioImpact({
    required this.scenario,
    required this.riskDelta,
    required this.summary,
  });

  final BlackSwanScenarioType scenario;
  final double riskDelta;
  final String summary;
}

final class BlackSwanReport {
  const BlackSwanReport({
    required this.before,
    required this.after,
    required this.cycleImpacts,
    required this.circuitBreaker,
    required this.silentDegradationDetected,
  });

  final SystemHealth before;
  final SystemHealth after;
  final List<ScenarioImpact> cycleImpacts;
  final CircuitBreakerState circuitBreaker;
  final bool silentDegradationDetected;
}

final class BlackSwanSimulationLayer {
  BlackSwanSimulationLayer({
    math.Random? random,
  }) : _rng = random ?? math.Random(73);

  final math.Random _rng;

  BlackSwanReport simulateBlackSwan({
    required SystemHealth baseline,
    required ScenarioInjection injection,
    required int cycles,
    Set<BlackSwanScenarioType>? scenarios,
  }) {
    var health = baseline;
    final impacts = <ScenarioImpact>[];
    final activeScenarios = scenarios ?? BlackSwanScenarioType.values.toSet();

    for (var i = 0; i < cycles; i++) {
      for (final scenario in activeScenarios) {
        final attackPressure = _attackPressure(injection: injection, cycle: i);
        final next = _applyScenario(
          scenario: scenario,
          health: health,
          attackPressure: attackPressure,
          injection: injection,
        );
        if (next.aggregateRisk > health.aggregateRisk) {
          impacts.add(
            ScenarioImpact(
              scenario: scenario,
              riskDelta: next.aggregateRisk - health.aggregateRisk,
              summary: _summaryForScenario(scenario),
            ),
          );
        }
        health = next;
      }
    }

    final breaker = _computeCircuitBreaker(health);
    final silent = detectSilentDegradation(before: baseline, after: health);
    return BlackSwanReport(
      before: baseline,
      after: health,
      cycleImpacts: List<ScenarioImpact>.unmodifiable(impacts),
      circuitBreaker: breaker,
      silentDegradationDetected: silent,
    );
  }

  bool detectSilentDegradation({
    required SystemHealth before,
    required SystemHealth after,
  }) {
    final trustVarianceCollapsed = after.trustScoreVariance < before.trustScoreVariance * 0.65;
    final conversionCollapsed = after.conversionQuality < before.conversionQuality * 0.82;
    final fraudRising = after.fraudLeakageRate > before.fraudLeakageRate * 1.2;
    return trustVarianceCollapsed && conversionCollapsed && fraudRising;
  }

  double _attackPressure({
    required ScenarioInjection injection,
    required int cycle,
  }) {
    final cycleNoise = 0.9 + _rng.nextDouble() * 0.25;
    final progressive = 1.0 + (cycle * 0.015).clamp(0.0, 0.5);
    final injectionPower = (0.25 * injection.botAccuracy) +
        (0.25 * injection.collusionLevel) +
        (0.20 * injection.rewardPressure) +
        (0.15 * injection.walletTimingExposure) +
        (0.10 * injection.verificationFragility) +
        (0.05 * injection.platformSpoofingRisk);
    return (cycleNoise * progressive * (0.8 + injectionPower)).clamp(0.3, 2.4).toDouble();
  }

  SystemHealth _applyScenario({
    required BlackSwanScenarioType scenario,
    required SystemHealth health,
    required double attackPressure,
    required ScenarioInjection injection,
  }) {
    final multiplier = switch (scenario) {
      BlackSwanScenarioType.perfectFakeAttention => 1.25 + injection.botAccuracy * 1.2,
      BlackSwanScenarioType.rewardHyperinflationCascade => 1.0 + injection.rewardPressure * 1.35,
      BlackSwanScenarioType.trustSystemInversion => 1.0 + injection.botAccuracy * 0.7,
      BlackSwanScenarioType.hybridCollusionRing => 1.05 + injection.collusionLevel * 1.2,
      BlackSwanScenarioType.walletDrainExploit => 1.1 + injection.walletTimingExposure * 1.4,
      BlackSwanScenarioType.verificationGateFailure => 1.05 + injection.verificationFragility * 1.5,
      BlackSwanScenarioType.economicGravityShift => 1.0 + injection.rewardPressure * 1.0,
      BlackSwanScenarioType.platformIntegrationExploit => 1.0 + injection.platformSpoofingRisk * 1.2,
    };
    final pressure = (attackPressure * multiplier).clamp(0.3, 3.0);

    final fraudLeakDelta = switch (scenario) {
      BlackSwanScenarioType.perfectFakeAttention => 0.04 * pressure,
      BlackSwanScenarioType.rewardHyperinflationCascade => 0.02 * pressure,
      BlackSwanScenarioType.trustSystemInversion => 0.03 * pressure,
      BlackSwanScenarioType.hybridCollusionRing => 0.035 * pressure,
      BlackSwanScenarioType.walletDrainExploit => 0.02 * pressure,
      BlackSwanScenarioType.verificationGateFailure => 0.045 * pressure,
      BlackSwanScenarioType.economicGravityShift => 0.015 * pressure,
      BlackSwanScenarioType.platformIntegrationExploit => 0.03 * pressure,
    };

    final trustIntegrityDrop = switch (scenario) {
      BlackSwanScenarioType.perfectFakeAttention => 0.045 * pressure,
      BlackSwanScenarioType.rewardHyperinflationCascade => 0.02 * pressure,
      BlackSwanScenarioType.trustSystemInversion => 0.06 * pressure,
      BlackSwanScenarioType.hybridCollusionRing => 0.04 * pressure,
      BlackSwanScenarioType.walletDrainExploit => 0.015 * pressure,
      BlackSwanScenarioType.verificationGateFailure => 0.055 * pressure,
      BlackSwanScenarioType.economicGravityShift => 0.025 * pressure,
      BlackSwanScenarioType.platformIntegrationExploit => 0.035 * pressure,
    };

    final rewardEfficiencyDrop = switch (scenario) {
      BlackSwanScenarioType.perfectFakeAttention => 0.03 * pressure,
      BlackSwanScenarioType.rewardHyperinflationCascade => 0.075 * pressure,
      BlackSwanScenarioType.trustSystemInversion => 0.04 * pressure,
      BlackSwanScenarioType.hybridCollusionRing => 0.045 * pressure,
      BlackSwanScenarioType.walletDrainExploit => 0.02 * pressure,
      BlackSwanScenarioType.verificationGateFailure => 0.05 * pressure,
      BlackSwanScenarioType.economicGravityShift => 0.07 * pressure,
      BlackSwanScenarioType.platformIntegrationExploit => 0.04 * pressure,
    };

    final walletLossDelta = switch (scenario) {
      BlackSwanScenarioType.perfectFakeAttention => 0.03 * pressure,
      BlackSwanScenarioType.rewardHyperinflationCascade => 0.015 * pressure,
      BlackSwanScenarioType.trustSystemInversion => 0.02 * pressure,
      BlackSwanScenarioType.hybridCollusionRing => 0.03 * pressure,
      BlackSwanScenarioType.walletDrainExploit => 0.085 * pressure,
      BlackSwanScenarioType.verificationGateFailure => 0.05 * pressure,
      BlackSwanScenarioType.economicGravityShift => 0.01 * pressure,
      BlackSwanScenarioType.platformIntegrationExploit => 0.035 * pressure,
    };

    final behaviorDriftDelta = switch (scenario) {
      BlackSwanScenarioType.perfectFakeAttention => 0.02 * pressure,
      BlackSwanScenarioType.rewardHyperinflationCascade => 0.055 * pressure,
      BlackSwanScenarioType.trustSystemInversion => 0.025 * pressure,
      BlackSwanScenarioType.hybridCollusionRing => 0.03 * pressure,
      BlackSwanScenarioType.walletDrainExploit => 0.01 * pressure,
      BlackSwanScenarioType.verificationGateFailure => 0.025 * pressure,
      BlackSwanScenarioType.economicGravityShift => 0.07 * pressure,
      BlackSwanScenarioType.platformIntegrationExploit => 0.02 * pressure,
    };

    final trustVarianceDrop = switch (scenario) {
      BlackSwanScenarioType.perfectFakeAttention => 0.03 * pressure,
      BlackSwanScenarioType.rewardHyperinflationCascade => 0.02 * pressure,
      BlackSwanScenarioType.trustSystemInversion => 0.06 * pressure,
      BlackSwanScenarioType.hybridCollusionRing => 0.05 * pressure,
      BlackSwanScenarioType.walletDrainExploit => 0.015 * pressure,
      BlackSwanScenarioType.verificationGateFailure => 0.045 * pressure,
      BlackSwanScenarioType.economicGravityShift => 0.02 * pressure,
      BlackSwanScenarioType.platformIntegrationExploit => 0.03 * pressure,
    };

    final conversionQualityDrop = switch (scenario) {
      BlackSwanScenarioType.perfectFakeAttention => 0.04 * pressure,
      BlackSwanScenarioType.rewardHyperinflationCascade => 0.045 * pressure,
      BlackSwanScenarioType.trustSystemInversion => 0.05 * pressure,
      BlackSwanScenarioType.hybridCollusionRing => 0.05 * pressure,
      BlackSwanScenarioType.walletDrainExploit => 0.02 * pressure,
      BlackSwanScenarioType.verificationGateFailure => 0.05 * pressure,
      BlackSwanScenarioType.economicGravityShift => 0.055 * pressure,
      BlackSwanScenarioType.platformIntegrationExploit => 0.04 * pressure,
    };

    return SystemHealth(
      fraudLeakageRate: (health.fraudLeakageRate + fraudLeakDelta).clamp(0.0, 1.0).toDouble(),
      trustScoreIntegrity:
          (health.trustScoreIntegrity - trustIntegrityDrop).clamp(0.0, 1.0).toDouble(),
      rewardEfficiency:
          (health.rewardEfficiency - rewardEfficiencyDrop).clamp(0.0, 1.0).toDouble(),
      walletLossRisk: (health.walletLossRisk + walletLossDelta).clamp(0.0, 1.0).toDouble(),
      userBehaviorDrift:
          (health.userBehaviorDrift + behaviorDriftDelta).clamp(0.0, 1.0).toDouble(),
      trustScoreVariance:
          (health.trustScoreVariance - trustVarianceDrop).clamp(0.0, 1.0).toDouble(),
      conversionQuality:
          (health.conversionQuality - conversionQualityDrop).clamp(0.0, 1.0).toDouble(),
    );
  }

  CircuitBreakerState _computeCircuitBreaker(SystemHealth health) {
    final highFraud = health.fraudLeakageRate >= 0.18;
    final rewardInefficiency = health.rewardEfficiency <= 0.45;
    final highWalletRisk = health.walletLossRisk >= 0.25;
    final freezeRewards = highFraud || rewardInefficiency;
    final payoutThrottle = highFraud
        ? 0.35
        : (highWalletRisk ? 0.55 : (health.aggregateRisk > 0.45 ? 0.75 : 1.0));
    final withdrawFraction = highWalletRisk
        ? 0.12
        : (highFraud ? 0.18 : (health.aggregateRisk > 0.5 ? 0.35 : 1.0));

    return CircuitBreakerState(
      rewardScalingFrozen: freezeRewards,
      payoutThrottleMultiplier: payoutThrottle,
      maxWithdrawFraction: withdrawFraction,
      requiresManualReview: health.aggregateRisk > 0.55 || highWalletRisk,
    );
  }

  String _summaryForScenario(BlackSwanScenarioType scenario) {
    return switch (scenario) {
      BlackSwanScenarioType.perfectFakeAttention =>
        'Synthetic gaze passes verification and mints real value.',
      BlackSwanScenarioType.rewardHyperinflationCascade =>
        'Bidding pressure causes reward baseline runaway and ROI collapse.',
      BlackSwanScenarioType.trustSystemInversion =>
        'Long-game attackers build trust then exploit high limits.',
      BlackSwanScenarioType.hybridCollusionRing =>
        'Real users and bot clusters blend into organic traffic.',
      BlackSwanScenarioType.walletDrainExploit =>
        'Timing mismatch drains available balances before revocation.',
      BlackSwanScenarioType.verificationGateFailure =>
        'Partial verification is treated as a full approval path.',
      BlackSwanScenarioType.economicGravityShift =>
        'Reward farming displaces authentic attention behavior.',
      BlackSwanScenarioType.platformIntegrationExploit =>
        'Spoofed external engagement corrupts internal quality signals.',
    };
  }
}
