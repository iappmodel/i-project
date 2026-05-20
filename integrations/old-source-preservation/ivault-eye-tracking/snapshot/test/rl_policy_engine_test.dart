import 'package:eye_tracking_app/rl_policy_engine.dart';
import 'package:flutter_test/flutter_test.dart';

DefenseState _seedState() {
  return const DefenseState(
    userBehaviorVectors: <String, double>{
      'u1': 0.72,
      'u2': 0.34,
      'u3': 0.58,
    },
    trustScores: <String, double>{
      'u1': 0.8,
      'u2': 0.32,
      'u3': 0.52,
    },
    anomalyScores: <String, double>{
      'u1': 0.2,
      'u2': 0.74,
      'u3': 0.48,
    },
    rewardFlowMetrics: <String, double>{
      'u1': 0.44,
      'u2': 0.63,
      'u3': 0.51,
    },
    withdrawalVelocity: 0.66,
    conversionPatterns: 0.62,
    attentionVerificationSignals: 0.48,
    gazeEntropy: 0.41,
    sessionConsistency: 0.6,
    crossPlatformSignals: 0.45,
    networkGraphRisk: 0.58,
    systemLoad: 0.5,
    liquidityState: 0.46,
  );
}

void main() {
  group('RlPolicyEngine', () {
    test('rejects unsafe action when it violates constraints', () {
      final env = ShadowDefenseEnvironment(
        constraints: const GlobalPolicyConstraints(
          maxFrozenUserRatio: 0.08,
          minimumRewardFloor: 0.03,
          allowImmediateVerifiedFreeze: false,
          maxFrictionInjection: 0.30,
        ),
      );

      final result = env.step(
        state: _seedState(),
        action: const DefenseAction(
          type: DefenseActionType.freezeShadowBanThrottle,
          intensity: 0.4,
        ),
        adversarialPressure: AdversarialPressure.none,
      );

      expect(result.actionApplied, isFalse);
      expect(result.reward.falsePositivePenalty, greaterThan(0.19));
    });

    test('global policy tightens constraints under higher risk', () {
      const controller = GlobalPolicyController();
      final risky = _seedState();
      final safer = risky.copyWith(
        anomalyScores: const <String, double>{'u1': 0.1, 'u2': 0.15, 'u3': 0.2},
        networkGraphRisk: 0.2,
        systemLoad: 0.2,
      );

      final riskyDecision = controller.evaluate(risky);
      final saferDecision = controller.evaluate(safer);

      expect(
        riskyDecision.minVerificationThreshold,
        greaterThan(saferDecision.minVerificationThreshold),
      );
      expect(
        riskyDecision.constraints.maxFrozenUserRatio,
        greaterThan(saferDecision.constraints.maxFrozenUserRatio),
      );
    });

    test('local policy generates user-targeted gates for risky users', () {
      const local = LocalPolicyController();
      final global = const GlobalPolicyController().evaluate(_seedState());
      final decision = local.evaluate(
        LocalPolicyContext(
          userId: 'u2',
          userTrustScore: 0.25,
          userAnomalyScore: 0.8,
          userBehaviorScore: 0.2,
          globalPolicy: global,
        ),
      );

      expect(decision.actions, isNotEmpty);
      expect(
        decision.actions.map((a) => a.type),
        containsAll(<DefenseActionType>[
          DefenseActionType.triggerAdditionalGates,
          DefenseActionType.delayOrSplitPayouts,
          DefenseActionType.injectFriction,
        ]),
      );
    });

    test('training loop updates policy weights toward defensive actions', () {
      final env = ShadowDefenseEnvironment(
        constraints: const GlobalPolicyConstraints(
          maxFrozenUserRatio: 0.1,
          minimumRewardFloor: 0.03,
          allowImmediateVerifiedFreeze: false,
          maxFrictionInjection: 0.4,
        ),
      );
      final engine = RlPolicyEngine(environment: env);
      final initialWeights = engine.actionWeights;

      final outcomes = engine.trainLoop(
        initialState: _seedState(),
        confidence: 0.7,
        pressureSchedule: List<AdversarialPressure>.filled(
          14,
          const AdversarialPressure(
            attackIntensity: 0.85,
            humanLikeFraudPressure: 0.7,
            collusionPressure: 0.75,
            extractionPressure: 0.8,
          ),
        ),
      );

      expect(outcomes, hasLength(14));
      final updatedWeights = engine.actionWeights;
      final totalBefore = initialWeights.values.fold<double>(0.0, (s, v) => s + v);
      final totalAfter = updatedWeights.values.fold<double>(0.0, (s, v) => s + v);
      expect(totalAfter, greaterThan(totalBefore));
    });
  });
}
