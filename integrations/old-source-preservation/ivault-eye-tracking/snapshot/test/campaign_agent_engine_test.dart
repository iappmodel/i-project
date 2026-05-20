import 'package:eye_tracking_app/campaign_agent_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('CampaignAgent', () {
    CampaignAgentConfig buildConfig({
      String id = 'agent-1',
      CampaignAgentArchetype archetype = CampaignAgentArchetype.performance,
      double explorationRate = 0.2,
      Duration decisionInterval = const Duration(seconds: 1),
    }) {
      return CampaignAgentConfig(
        id: id,
        archetype: archetype,
        goal: const AgentGoal(
          type: AgentGoalType.conversion,
          targetCostUsd: 1.2,
          targetVolume: 100,
        ),
        initialBudget: const AgentBudgetController(
          totalBudgetUsd: 1000,
          remainingBudgetUsd: 1000,
          spendRatePerSecondUsd: 2.0,
          pacingStrategy: 'balanced',
        ),
        strategy: AgentStrategy(
          bidPolicy: 'value_based',
          creativePreference: 'best_performing',
          explorationRate: explorationRate,
          audienceSelection: const <String>{'high_value', 'retarget'},
        ),
        safety: const AgentSafetyConstraints(
          maxBidUsd: 5.0,
          dailyBudgetCapUsd: 1000,
          targetCostCeilingUsd: 4.0,
          killSwitchRoiThreshold: 0.1,
        ),
        decisionInterval: decisionInterval,
      );
    }

    AgentObservation buildObservation({
      double expectedValue = 12.0,
      double successProbability = 0.5,
      double currentRoi = 0.35,
      double userFatigue = 0.2,
      String segmentId = 'high_value',
    }) {
      return AgentObservation(
        marketPriceUsd: 1.5,
        marketDemandPressure: 1.1,
        userId: 'user-1',
        segmentId: segmentId,
        predictedOutcomeValueUsd: expectedValue,
        successProbability: successProbability,
        userFatigue: userFatigue,
        currentRoi: currentRoi,
      );
    }

    test('makes value-based bid decisions under safety caps', () {
      final agent = CampaignAgent(config: buildConfig());

      final decision = agent.decide(
        buildObservation(),
        now: DateTime(2026, 4, 25, 10, 0, 0),
      );

      expect(decision.show, isTrue);
      expect(decision.bidPriceUsd, greaterThan(0));
      expect(decision.bidPriceUsd, lessThanOrEqualTo(4.0));
      expect(agent.budget.remainingBudgetUsd, lessThan(1000));
    });

    test('pauses when roi falls below kill switch threshold', () {
      final agent = CampaignAgent(config: buildConfig());
      final now = DateTime(2026, 4, 25, 10, 0, 0);

      final first = agent.decide(
        buildObservation(currentRoi: 0.05),
        now: now,
      );
      final second = agent.decide(
        buildObservation(currentRoi: 0.8),
        now: now.add(const Duration(seconds: 2)),
      );

      expect(first.show, isFalse);
      expect(first.reason, 'kill_switch_roi_guard');
      expect(agent.isPausedByKillSwitch, isTrue);
      expect(second.show, isFalse);
      expect(second.reason, 'kill_switch_active');
    });

    test('enforces loop interval between decisions', () {
      final agent = CampaignAgent(
        config: buildConfig(decisionInterval: const Duration(seconds: 3)),
      );
      final now = DateTime(2026, 4, 25, 10, 0, 0);

      final first = agent.decide(buildObservation(), now: now);
      final fastFollow = agent.decide(
        buildObservation(),
        now: now.add(const Duration(seconds: 1)),
      );

      expect(first.show, isTrue);
      expect(fastFollow.show, isFalse);
      expect(fastFollow.reason, 'loop_interval_not_elapsed');
    });

    test('learns winning patterns from segment outcomes', () {
      final agent = CampaignAgent(config: buildConfig(explorationRate: 0.0));
      final now = DateTime(2026, 4, 25, 10, 0, 0);

      agent.updateSegmentOutcome(
        segmentId: 'retarget',
        converted: true,
        spendUsd: 2.0,
        revenueUsd: 4.0,
        impressions: 10,
        now: now,
      );

      expect(agent.memory.segmentPerformance['retarget'], isNotNull);
      expect(agent.memory.winningPatterns, contains('retarget'));
    });
  });

  group('CampaignAgentEngine', () {
    test('creates and ticks multiple autonomous agents', () {
      final engine = CampaignAgentEngine();
      final configA = CampaignAgentConfig(
        id: 'a',
        goal: const AgentGoal(
          type: AgentGoalType.attention,
          targetCostUsd: 0.5,
          targetVolume: 1000,
        ),
        initialBudget: const AgentBudgetController(
          totalBudgetUsd: 100,
          remainingBudgetUsd: 100,
          spendRatePerSecondUsd: 1.0,
          pacingStrategy: 'accelerated',
        ),
        strategy: const AgentStrategy(
          bidPolicy: 'attention',
          creativePreference: 'dynamic',
          explorationRate: 0.2,
        ),
        safety: const AgentSafetyConstraints(
          maxBidUsd: 2.0,
          dailyBudgetCapUsd: 100.0,
          targetCostCeilingUsd: 1.2,
        ),
      );
      final configB = CampaignAgentConfig(
        id: 'b',
        goal: const AgentGoal(
          type: AgentGoalType.reach,
          targetCostUsd: 0.2,
          targetVolume: 5000,
        ),
        initialBudget: const AgentBudgetController(
          totalBudgetUsd: 200,
          remainingBudgetUsd: 200,
          spendRatePerSecondUsd: 1.2,
          pacingStrategy: 'broad',
        ),
        strategy: const AgentStrategy(
          bidPolicy: 'reach',
          creativePreference: 'broad',
          explorationRate: 0.1,
        ),
        safety: const AgentSafetyConstraints(
          maxBidUsd: 1.0,
          dailyBudgetCapUsd: 200.0,
          targetCostCeilingUsd: 0.8,
        ),
      );
      engine.createAgent(configA);
      engine.createAgent(configB);

      final decisions = engine.runMarketTick(
        observations: const <AgentObservation>[
          AgentObservation(
            marketPriceUsd: 0.8,
            marketDemandPressure: 1.0,
            userId: 'u1',
            segmentId: 'growth',
            predictedOutcomeValueUsd: 4.0,
            successProbability: 0.45,
            userFatigue: 0.3,
            currentRoi: 0.3,
          ),
        ],
        now: DateTime(2026, 4, 25, 10, 0, 0),
      );

      expect(decisions, hasLength(2));
      expect(decisions.every((decision) => decision.targetUserId == 'u1'), isTrue);
    });
  });
}
