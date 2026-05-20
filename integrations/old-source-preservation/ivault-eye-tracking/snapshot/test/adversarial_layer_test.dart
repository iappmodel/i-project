import 'package:eye_tracking_app/adversarial_layer.dart';
import 'package:eye_tracking_app/policy_version.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AdversarialLayer', () {
    const layer = AdversarialLayer();

    test('detects reward inflation and attention farming manipulation', () {
      const snapshot = AgentBehaviorSnapshot(
        agentId: 'a1',
        campaignId: 'c1',
        rewardGrowthRate: 0.9,
        outcomeQualityScore: 0.3,
        conversionRate: 0.2,
        watchToEngagementRatio: 0.92,
        rewardThresholdConcentration: 0.4,
        trustScoreDelta: 0.1,
        competitorTargetPressure: 0.1,
        userBehavior: UserBehaviorVector(
          watchTimeDistributionScore: 0.9,
          interactionVariance: 0.2,
          rewardResponsePatternScore: 0.8,
          interactionEntropy: 0.2,
          deviceFingerprintRisk: 0.2,
          behavioralConsistency: 0.7,
        ),
      );

      final assessment = layer.detectManipulation(snapshot);
      expect(assessment.severity, greaterThan(0.35));
      expect(
        assessment.detectedAttacks,
        containsAll(<ManipulationAttackType>{
          ManipulationAttackType.rewardInflation,
          ManipulationAttackType.attentionFarming,
        }),
      );
    });

    test('detects collusion patterns across agents', () {
      const traces = <AgentMarketTrace>[
        AgentMarketTrace(
          agentId: 'x',
          segments: <String>{'s1', 's2'},
          bidPattern: <double>[0.4, 0.4, 0.41, 0.41],
          timingPattern: <double>[0.8, 0.8, 0.81, 0.81],
          rewardFlowToPeersScore: 0.86,
          botSimilarityScore: 0.9,
        ),
        AgentMarketTrace(
          agentId: 'y',
          segments: <String>{'s1', 's2'},
          bidPattern: <double>[0.4, 0.4, 0.41, 0.41],
          timingPattern: <double>[0.8, 0.8, 0.81, 0.81],
          rewardFlowToPeersScore: 0.84,
          botSimilarityScore: 0.91,
        ),
      ];

      final collusion = layer.detectCollusion(traces);
      expect(collusion.severity, greaterThan(0.35));
      expect(collusion.involvedAgents, containsAll(<String>{'x', 'y'}));
      expect(
        collusion.detectedAttacks,
        containsAll(<CollusionAttackType>{
          CollusionAttackType.priceFixing,
          CollusionAttackType.rewardCycling,
          CollusionAttackType.botRingCoordination,
        }),
      );
    });

    test('applies degrading penalties instead of binary ban', () {
      final decision = layer.runDefenseLoop(
        snapshot: const AgentBehaviorSnapshot(
          agentId: 'a2',
          campaignId: 'c2',
          rewardGrowthRate: 0.92,
          outcomeQualityScore: 0.18,
          conversionRate: 0.25,
          watchToEngagementRatio: 0.94,
          rewardThresholdConcentration: 0.9,
          trustScoreDelta: 0.72,
          competitorTargetPressure: 0.8,
          userBehavior: UserBehaviorVector(
            watchTimeDistributionScore: 0.97,
            interactionVariance: 0.1,
            rewardResponsePatternScore: 0.93,
            interactionEntropy: 0.1,
            deviceFingerprintRisk: 0.84,
            behavioralConsistency: 0.98,
          ),
        ),
        allAgentTraces: const <AgentMarketTrace>[
          AgentMarketTrace(
            agentId: 'a2',
            segments: <String>{'segA', 'segB'},
            bidPattern: <double>[0.45, 0.45, 0.45],
            timingPattern: <double>[0.9, 0.9, 0.9],
            rewardFlowToPeersScore: 0.88,
            botSimilarityScore: 0.92,
          ),
          AgentMarketTrace(
            agentId: 'a3',
            segments: <String>{'segA', 'segB'},
            bidPattern: <double>[0.45, 0.45, 0.45],
            timingPattern: <double>[0.9, 0.9, 0.9],
            rewardFlowToPeersScore: 0.86,
            botSimilarityScore: 0.9,
          ),
        ],
        avgRewardLevel: 0.92,
        avgOutcomeQuality: 0.24,
        avgEngagementQuality: 0.2,
        activePolicyVersionId: kBootstrapPolicyVersionId,
      );

      expect(decision.flagged, isTrue);
      expect(decision.policyVersionId, kBootstrapPolicyVersionId);
      expect(decision.penalty.reachMultiplier, lessThan(1.0));
      expect(decision.penalty.reachMultiplier, greaterThan(0.0));
      expect(decision.penalty.costMultiplier, greaterThan(1.0));
      expect(decision.penalty.conversionPriorityMultiplier, lessThan(1.0));
      expect(decision.penalty.reasonCodes, isNotEmpty);
    });

    test('builds simulation set with honest and adversarial profiles', () {
      final profiles = layer.buildAdversarialSimulationSet(
        campaignId: 'c3',
        baseSegment: 'gaming',
      );
      expect(profiles, hasLength(4));
      expect(
        profiles.map((profile) => profile.type),
        containsAll(<AgentSimulationType>{
          AgentSimulationType.honest,
          AgentSimulationType.manipulative,
          AgentSimulationType.colluding,
          AgentSimulationType.bot,
        }),
      );
    });
  });
}
