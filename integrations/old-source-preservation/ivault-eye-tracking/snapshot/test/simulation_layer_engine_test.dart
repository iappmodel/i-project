import 'package:eye_tracking_app/simulation_layer_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  List<VirtualUser> buildUsers() {
    return const <VirtualUser>[
      VirtualUser(
        id: 'u1',
        segment: 'high_value',
        attentionProfile: 0.85,
        conversionProbability: 0.62,
        fatigueCurve: 0.25,
        trustScore: 0.82,
        rewardSensitivity: 0.68,
      ),
      VirtualUser(
        id: 'u2',
        segment: 'growth',
        attentionProfile: 0.72,
        conversionProbability: 0.45,
        fatigueCurve: 0.30,
        trustScore: 0.65,
        rewardSensitivity: 0.75,
      ),
      VirtualUser(
        id: 'u3',
        segment: 'filler',
        attentionProfile: 0.55,
        conversionProbability: 0.18,
        fatigueCurve: 0.50,
        trustScore: 0.40,
        rewardSensitivity: 0.80,
      ),
      VirtualUser(
        id: 'u4',
        segment: 'retarget',
        attentionProfile: 0.90,
        conversionProbability: 0.71,
        fatigueCurve: 0.20,
        trustScore: 0.88,
        rewardSensitivity: 0.60,
      ),
    ];
  }

  List<SimulatedAgent> buildAgents() {
    return <SimulatedAgent>[
      SimulatedAgent(
        id: 'agent-core',
        type: StrategyType.yourAgent,
        genome: const StrategyGenome(
          bidBias: 0.55,
          targetSelectivity: 0.70,
          timingSensitivity: 0.60,
          rewardShaping: 0.58,
        ),
        initialBudgetUsd: 40,
      ),
      SimulatedAgent(
        id: 'agent-aggro',
        type: StrategyType.aggressive,
        genome: const StrategyGenome(
          bidBias: 0.88,
          targetSelectivity: 0.52,
          timingSensitivity: 0.42,
          rewardShaping: 0.45,
        ),
        initialBudgetUsd: 40,
      ),
      SimulatedAgent(
        id: 'agent-conservative',
        type: StrategyType.conservative,
        genome: const StrategyGenome(
          bidBias: 0.20,
          targetSelectivity: 0.64,
          timingSensitivity: 0.67,
          rewardShaping: 0.30,
        ),
        initialBudgetUsd: 40,
      ),
      SimulatedAgent(
        id: 'agent-sniper',
        type: StrategyType.sniper,
        genome: const StrategyGenome(
          bidBias: 0.46,
          targetSelectivity: 0.92,
          timingSensitivity: 0.83,
          rewardShaping: 0.52,
        ),
        initialBudgetUsd: 40,
      ),
      SimulatedAgent(
        id: 'agent-flood',
        type: StrategyType.flooder,
        genome: const StrategyGenome(
          bidBias: 0.35,
          targetSelectivity: 0.25,
          timingSensitivity: 0.50,
          rewardShaping: 0.40,
        ),
        initialBudgetUsd: 40,
      ),
    ];
  }

  test('runs simulation and returns per-agent strategy intelligence', () {
    final engine = SimulationEngine();
    final result = engine.run(
      runs: 3,
      timestepsPerRun: 80,
      virtualUsers: buildUsers(),
      agents: buildAgents(),
    );

    expect(result.agentResults, isNotEmpty);
    for (final agentResult in result.agentResults) {
      expect(agentResult.roiCurve, isNotEmpty);
      expect(agentResult.optimalBidRange.minUsd, greaterThanOrEqualTo(0));
      expect(
        agentResult.optimalBidRange.maxUsd,
        greaterThanOrEqualTo(agentResult.optimalBidRange.minUsd),
      );
      expect(agentResult.bestSegments.length, lessThanOrEqualTo(3));
    }
  });

  test('evolution step keeps agents and mutates low performers', () {
    final engine = SimulationEngine();
    final before = buildAgents();
    final originalGenome = <String, StrategyGenome>{
      for (final agent in before) agent.id: agent.genome,
    };

    final result = engine.run(
      runs: 2,
      timestepsPerRun: 60,
      virtualUsers: buildUsers(),
      agents: before,
    );

    expect(result.evolvedStrategies.keys, hasLength(before.length));
    final changed = result.evolvedStrategies.entries
        .where((entry) {
          final original = originalGenome[entry.key]!;
          final next = entry.value;
          return original.bidBias != next.bidBias ||
              original.targetSelectivity != next.targetSelectivity ||
              original.timingSensitivity != next.timingSensitivity ||
              original.rewardShaping != next.rewardShaping;
        })
        .length;
    expect(changed, greaterThan(0));
  });

  test('black swan simulation increases systemic risk under harsh injection', () {
    final layer = BlackSwanSimulationLayer();
    const baseline = SystemHealth(
      fraudLeakageRate: 0.04,
      trustScoreIntegrity: 0.90,
      rewardEfficiency: 0.88,
      walletLossRisk: 0.03,
      userBehaviorDrift: 0.08,
      trustScoreVariance: 0.70,
      conversionQuality: 0.84,
    );
    const injection = ScenarioInjection(
      botAccuracy: 0.95,
      collusionLevel: 0.90,
      rewardPressure: 0.92,
      walletTimingExposure: 0.85,
      verificationFragility: 0.88,
      platformSpoofingRisk: 0.75,
    );

    final report = layer.simulateBlackSwan(
      baseline: baseline,
      injection: injection,
      cycles: 4,
    );

    expect(report.after.aggregateRisk, greaterThan(report.before.aggregateRisk));
    expect(report.after.fraudLeakageRate, greaterThan(report.before.fraudLeakageRate));
    expect(report.after.trustScoreIntegrity, lessThan(report.before.trustScoreIntegrity));
    expect(report.cycleImpacts, isNotEmpty);
  });

  test('black swan layer triggers circuit breakers and silent degradation', () {
    final layer = BlackSwanSimulationLayer();
    const baseline = SystemHealth(
      fraudLeakageRate: 0.05,
      trustScoreIntegrity: 0.92,
      rewardEfficiency: 0.87,
      walletLossRisk: 0.02,
      userBehaviorDrift: 0.06,
      trustScoreVariance: 0.78,
      conversionQuality: 0.86,
    );
    const injection = ScenarioInjection(
      botAccuracy: 0.98,
      collusionLevel: 0.95,
      rewardPressure: 0.95,
      walletTimingExposure: 0.95,
      verificationFragility: 0.90,
      platformSpoofingRisk: 0.85,
    );

    final report = layer.simulateBlackSwan(
      baseline: baseline,
      injection: injection,
      cycles: 6,
    );

    expect(report.circuitBreaker.rewardScalingFrozen, isTrue);
    expect(report.circuitBreaker.payoutThrottleMultiplier, lessThan(1.0));
    expect(report.circuitBreaker.maxWithdrawFraction, lessThan(1.0));
    expect(report.silentDegradationDetected, isTrue);
  });
}
