import 'dart:math' as math;

enum AgentGoalType { conversion, attention, reach }

enum CampaignAgentArchetype {
  performance,
  awareness,
  retargeting,
  premium,
}

final class AgentGoal {
  const AgentGoal({
    required this.type,
    required this.targetCostUsd,
    required this.targetVolume,
    this.constraints = const <String, double>{},
  });

  final AgentGoalType type;
  final double targetCostUsd;
  final int targetVolume;
  final Map<String, double> constraints;
}

final class AgentSafetyConstraints {
  const AgentSafetyConstraints({
    required this.maxBidUsd,
    required this.dailyBudgetCapUsd,
    required this.targetCostCeilingUsd,
    this.frequencyCapPerUser = 3,
    this.userFatigueLimit = 0.9,
    this.killSwitchRoiThreshold = 0.15,
  });

  final double maxBidUsd;
  final double dailyBudgetCapUsd;
  final double targetCostCeilingUsd;
  final int frequencyCapPerUser;
  final double userFatigueLimit;
  final double killSwitchRoiThreshold;
}

final class AgentBudgetController {
  const AgentBudgetController({
    required this.totalBudgetUsd,
    required this.remainingBudgetUsd,
    required this.spendRatePerSecondUsd,
    required this.pacingStrategy,
  });

  final double totalBudgetUsd;
  final double remainingBudgetUsd;
  final double spendRatePerSecondUsd;
  final String pacingStrategy;
}

final class AgentStrategy {
  const AgentStrategy({
    required this.bidPolicy,
    required this.creativePreference,
    required this.explorationRate,
    this.audienceSelection = const <String>{},
  });

  final String bidPolicy;
  final Set<String> audienceSelection;
  final String creativePreference;
  final double explorationRate; // 0..1
}

final class SegmentPerformance {
  const SegmentPerformance({
    required this.segmentId,
    required this.impressions,
    required this.conversions,
    required this.spendUsd,
    required this.revenueUsd,
  });

  final String segmentId;
  final int impressions;
  final int conversions;
  final double spendUsd;
  final double revenueUsd;

  double get conversionRate =>
      impressions == 0 ? 0.0 : conversions / impressions;
  double get roi => spendUsd <= 0 ? 0.0 : (revenueUsd - spendUsd) / spendUsd;
}

final class CampaignAgentMemory {
  const CampaignAgentMemory({
    this.segmentPerformance = const <String, SegmentPerformance>{},
    this.winningPatterns = const <String>{},
    this.lastUpdatedAt,
  });

  final Map<String, SegmentPerformance> segmentPerformance;
  final Set<String> winningPatterns;
  final DateTime? lastUpdatedAt;
}

final class AgentObservation {
  const AgentObservation({
    required this.marketPriceUsd,
    required this.marketDemandPressure,
    required this.userId,
    required this.segmentId,
    required this.predictedOutcomeValueUsd,
    required this.successProbability,
    required this.userFatigue,
    required this.currentRoi,
  });

  final double marketPriceUsd;
  final double marketDemandPressure;
  final String userId;
  final String segmentId;
  final double predictedOutcomeValueUsd;
  final double successProbability;
  final double userFatigue;
  final double currentRoi;
}

final class AgentDecision {
  const AgentDecision({
    required this.bidPriceUsd,
    required this.targetUserId,
    required this.targetSegmentId,
    required this.show,
    required this.reason,
    required this.nextBudgetState,
  });

  final double bidPriceUsd;
  final String targetUserId;
  final String targetSegmentId;
  final bool show;
  final String reason;
  final AgentBudgetController nextBudgetState;
}

final class CampaignAgentConfig {
  const CampaignAgentConfig({
    required this.id,
    required this.goal,
    required this.initialBudget,
    required this.strategy,
    required this.safety,
    this.archetype = CampaignAgentArchetype.performance,
    this.decisionInterval = const Duration(seconds: 1),
  });

  final String id;
  final AgentGoal goal;
  final AgentBudgetController initialBudget;
  final AgentStrategy strategy;
  final AgentSafetyConstraints safety;
  final CampaignAgentArchetype archetype;
  final Duration decisionInterval;
}

final class CampaignAgent {
  CampaignAgent({
    required this.config,
    CampaignAgentMemory memory = const CampaignAgentMemory(),
  }) : _memory = memory,
       _budget = config.initialBudget;

  final CampaignAgentConfig config;
  CampaignAgentMemory _memory;
  AgentBudgetController _budget;
  DateTime? _lastDecisionAt;

  CampaignAgentMemory get memory => _memory;
  AgentBudgetController get budget => _budget;

  bool get isExhausted => _budget.remainingBudgetUsd <= 0.0;
  bool get isPausedByKillSwitch => _pausedByKillSwitch;
  bool _pausedByKillSwitch = false;

  AgentDecision decide(AgentObservation input, {DateTime? now}) {
    final tickAt = now ?? DateTime.now();
    if (_lastDecisionAt != null &&
        tickAt.difference(_lastDecisionAt!) < _safeDecisionInterval) {
      return _skipDecision(input, reason: 'loop_interval_not_elapsed');
    }
    _lastDecisionAt = tickAt;

    if (_pausedByKillSwitch) {
      return _skipDecision(input, reason: 'kill_switch_active');
    }

    if (isExhausted) {
      return _skipDecision(input, reason: 'budget_exhausted');
    }

    if (input.currentRoi < config.safety.killSwitchRoiThreshold) {
      _pausedByKillSwitch = true;
      return _skipDecision(input, reason: 'kill_switch_roi_guard');
    }

    if (input.userFatigue > config.safety.userFatigueLimit) {
      return _skipDecision(input, reason: 'user_fatigue_guard');
    }

    final expectedValue = input.predictedOutcomeValueUsd;
    final probability = input.successProbability.clamp(0.0, 1.0);
    final marginFactor = _marginFactor(input);
    final rawBid = expectedValue * probability * marginFactor;
    final boundedBid = _boundBid(rawBid);

    if (boundedBid <= 0) {
      return _skipDecision(input, reason: 'non_positive_bid');
    }

    final exploration =
        _shouldExplore(segmentId: input.segmentId, now: tickAt);
    final adjustedBid = exploration ? boundedBid * 0.92 : boundedBid;

    if (adjustedBid > _budget.remainingBudgetUsd) {
      return _skipDecision(input, reason: 'insufficient_remaining_budget');
    }

    final nextBudget = _consumeBudget(adjustedBid);
    _budget = nextBudget;
    _learnFromExposure(
      segmentId: input.segmentId,
      bidPriceUsd: adjustedBid,
      expectedValueUsd: expectedValue,
      successProbability: probability,
      now: tickAt,
    );

    return AgentDecision(
      bidPriceUsd: adjustedBid,
      targetUserId: input.userId,
      targetSegmentId: input.segmentId,
      show: true,
      reason: exploration ? 'exploration_bid' : 'optimized_bid',
      nextBudgetState: nextBudget,
    );
  }

  void updateSegmentOutcome({
    required String segmentId,
    required bool converted,
    required double spendUsd,
    required double revenueUsd,
    required int impressions,
    DateTime? now,
  }) {
    final previous = _memory.segmentPerformance[segmentId];
    final next = SegmentPerformance(
      segmentId: segmentId,
      impressions: (previous?.impressions ?? 0) + math.max(1, impressions),
      conversions: (previous?.conversions ?? 0) + (converted ? 1 : 0),
      spendUsd: (previous?.spendUsd ?? 0.0) + spendUsd,
      revenueUsd: (previous?.revenueUsd ?? 0.0) + revenueUsd,
    );

    final nextPatterns = Set<String>.of(_memory.winningPatterns);
    if (next.roi > 0.25 && next.conversionRate > 0.05) {
      nextPatterns.add(segmentId);
    }

    final nextMap = <String, SegmentPerformance>{
      ..._memory.segmentPerformance,
      segmentId: next,
    };

    _memory = CampaignAgentMemory(
      segmentPerformance: nextMap,
      winningPatterns: nextPatterns,
      lastUpdatedAt: now ?? DateTime.now(),
    );
  }

  Duration get _safeDecisionInterval {
    final seconds = config.decisionInterval.inSeconds.clamp(1, 5);
    return Duration(seconds: seconds);
  }

  AgentDecision _skipDecision(
    AgentObservation input, {
    required String reason,
  }) {
    return AgentDecision(
      bidPriceUsd: 0.0,
      targetUserId: input.userId,
      targetSegmentId: input.segmentId,
      show: false,
      reason: reason,
      nextBudgetState: _budget,
    );
  }

  double _marginFactor(AgentObservation input) {
    final pressure = input.marketDemandPressure.clamp(0.5, 2.0);
    final archetypeFactor = switch (config.archetype) {
      CampaignAgentArchetype.performance => 1.08,
      CampaignAgentArchetype.awareness => 0.85,
      CampaignAgentArchetype.retargeting => 1.15,
      CampaignAgentArchetype.premium => 1.05,
    };
    return (pressure * archetypeFactor).clamp(0.4, 2.2).toDouble();
  }

  double _boundBid(double bidUsd) {
    final cappedBySafety = bidUsd.clamp(0.0, config.safety.maxBidUsd).toDouble();
    final cappedByTargetCost = math.min(
      cappedBySafety,
      config.safety.targetCostCeilingUsd,
    );
    return math.min(cappedByTargetCost, _budget.remainingBudgetUsd);
  }

  bool _shouldExplore({required String segmentId, required DateTime now}) {
    final explorationRate = config.strategy.explorationRate.clamp(0.0, 1.0);
    if (explorationRate <= 0) return false;
    final hasWinner = _memory.winningPatterns.contains(segmentId);
    if (hasWinner) return false;
    final bucket = now.millisecondsSinceEpoch % 100;
    return bucket < (explorationRate * 100.0).round();
  }

  AgentBudgetController _consumeBudget(double spendUsd) {
    final nextRemaining = (_budget.remainingBudgetUsd - spendUsd)
        .clamp(0.0, _budget.totalBudgetUsd)
        .toDouble();
    final nextRate = _adaptiveSpendRate(
      previousRate: _budget.spendRatePerSecondUsd,
      spendUsd: spendUsd,
    );
    return AgentBudgetController(
      totalBudgetUsd: _budget.totalBudgetUsd,
      remainingBudgetUsd: math.min(nextRemaining, config.safety.dailyBudgetCapUsd),
      spendRatePerSecondUsd: nextRate,
      pacingStrategy: _budget.pacingStrategy,
    );
  }

  double _adaptiveSpendRate({
    required double previousRate,
    required double spendUsd,
  }) {
    final boosted = previousRate * 0.85 + spendUsd * 0.15;
    return boosted.clamp(0.0001, config.safety.maxBidUsd).toDouble();
  }

  void _learnFromExposure({
    required String segmentId,
    required double bidPriceUsd,
    required double expectedValueUsd,
    required double successProbability,
    required DateTime now,
  }) {
    final previous = _memory.segmentPerformance[segmentId];
    final estimatedRevenue = expectedValueUsd * successProbability;
    final updated = SegmentPerformance(
      segmentId: segmentId,
      impressions: (previous?.impressions ?? 0) + 1,
      conversions: (previous?.conversions ?? 0) +
          (estimatedRevenue > bidPriceUsd ? 1 : 0),
      spendUsd: (previous?.spendUsd ?? 0.0) + bidPriceUsd,
      revenueUsd: (previous?.revenueUsd ?? 0.0) + estimatedRevenue,
    );

    final nextPatterns = Set<String>.of(_memory.winningPatterns);
    if (updated.roi > 0.2) {
      nextPatterns.add(segmentId);
    }

    _memory = CampaignAgentMemory(
      segmentPerformance: <String, SegmentPerformance>{
        ..._memory.segmentPerformance,
        segmentId: updated,
      },
      winningPatterns: nextPatterns,
      lastUpdatedAt: now,
    );
  }
}

final class CampaignAgentEngine {
  CampaignAgentEngine();

  final Map<String, CampaignAgent> _agents = <String, CampaignAgent>{};

  CampaignAgent createAgent(CampaignAgentConfig config) {
    final agent = CampaignAgent(config: config);
    _agents[config.id] = agent;
    return agent;
  }

  CampaignAgent? agentById(String id) => _agents[id];

  List<CampaignAgent> get agents =>
      List<CampaignAgent>.unmodifiable(_agents.values);

  AgentDecision? decideForAgent({
    required String agentId,
    required AgentObservation observation,
    DateTime? now,
  }) {
    final agent = _agents[agentId];
    if (agent == null) return null;
    return agent.decide(observation, now: now);
  }

  List<AgentDecision> runMarketTick({
    required List<AgentObservation> observations,
    DateTime? now,
  }) {
    if (observations.isEmpty || _agents.isEmpty) return const <AgentDecision>[];
    final tickAt = now ?? DateTime.now();
    final decisions = <AgentDecision>[];
    final agentsList = _agents.values.toList();
    for (var i = 0; i < agentsList.length; i++) {
      final observation = observations[i % observations.length];
      decisions.add(agentsList[i].decide(observation, now: tickAt));
    }
    return decisions;
  }
}
