import 'package:eye_tracking_app/autonomous_control_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AutonomousControlEngine', () {
    test('runs closed-loop response under attack pressure', () {
      final engine = AutonomousControlEngine();
      const state = SystemSignalState(
        behaviorDeviation: 0.90,
        economicDeviation: 0.85,
        graphAnomaly: 0.88,
        temporalIrregularity: 0.78,
        rewardInflation: 0.82,
        payoutSpike: 0.79,
        fraudLeakageRate: 0.09,
        systemRisk: 0.84,
        clusterAnomalyById: <String, double>{
          'cluster-a': 0.92,
          'cluster-b': 0.51,
        },
      );

      final snapshot = engine.process(state);

      expect(snapshot.anomaly.overall, greaterThan(0.80));
      expect(
        snapshot.triggeredPolicyIds,
        containsAll(<String>[
          'fraud-pressure',
          'collusion-cluster',
          'wallet-risk',
          'economic-circuit-breaker',
        ]),
      );
      expect(snapshot.execution.rewardRateMultiplier, lessThan(0.90));
      expect(snapshot.execution.payoutDelayMultiplier, greaterThan(1.4));
      expect(snapshot.execution.verificationDepthMultiplier, greaterThan(1.2));
      expect(snapshot.execution.rewardScalingFrozen, isTrue);
      expect(snapshot.execution.isolatedClusterIds, contains('cluster-a'));
      expect(snapshot.execution.globalVisibilityMultiplier, lessThan(1.0));
    });

    test('keeps mild state mostly user-safe', () {
      final engine = AutonomousControlEngine();
      const state = SystemSignalState(
        behaviorDeviation: 0.15,
        economicDeviation: 0.20,
        graphAnomaly: 0.12,
        temporalIrregularity: 0.18,
        rewardInflation: 0.20,
        payoutSpike: 0.15,
        fraudLeakageRate: 0.01,
        systemRisk: 0.18,
        clusterAnomalyById: <String, double>{},
      );

      final snapshot = engine.process(state);

      expect(snapshot.actions, isEmpty);
      expect(snapshot.execution.rewardRateMultiplier, 1.0);
      expect(snapshot.execution.payoutDelayMultiplier, 1.0);
      expect(snapshot.execution.withdrawalCapMultiplier, 1.0);
      expect(snapshot.execution.rewardScalingFrozen, isFalse);
    });

    test('policy confidence increases on good outcomes and decays otherwise', () {
      final policyEngine = AutonomousPolicyEngine();
      final control = AutonomousControlEngine(policyEngine: policyEngine);

      final fraudPolicy = policyEngine.policies.firstWhere(
        (policy) => policy.id == 'fraud-pressure',
      );
      final initial = fraudPolicy.confidence;

      control.learn(
        triggeredPolicyIds: const <String>['fraud-pressure'],
        feedback: const PolicyFeedback(
          financialLossDelta: -0.20,
          userExperienceDelta: 0.05,
          falsePositiveDelta: -0.10,
        ),
      );

      final boosted = fraudPolicy.confidence;
      expect(boosted, greaterThan(initial));

      control.learn(
        triggeredPolicyIds: const <String>[],
        feedback: const PolicyFeedback(
          financialLossDelta: 0.0,
          userExperienceDelta: 0.0,
          falsePositiveDelta: 0.0,
        ),
      );

      expect(fraudPolicy.confidence, lessThan(boosted));
    });
  });
}
