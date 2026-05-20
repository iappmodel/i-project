import 'dart:math' as math;

enum ControlActionType {
  slowRewards,
  freezeWallets,
  increaseVerification,
  reduceVisibility,
  isolateCluster,
  delayPayouts,
  capWithdrawals,
  freezeRewardScaling,
}

final class SystemSignalState {
  const SystemSignalState({
    required this.behaviorDeviation,
    required this.economicDeviation,
    required this.graphAnomaly,
    required this.temporalIrregularity,
    required this.rewardInflation,
    required this.payoutSpike,
    required this.fraudLeakageRate,
    required this.clusterAnomalyById,
    required this.systemRisk,
  });

  final double behaviorDeviation; // 0..1
  final double economicDeviation; // 0..1
  final double graphAnomaly; // 0..1
  final double temporalIrregularity; // 0..1
  final double rewardInflation; // 0..1
  final double payoutSpike; // 0..1
  final double fraudLeakageRate; // 0..1
  final Map<String, double> clusterAnomalyById; // clusterId -> 0..1
  final double systemRisk; // 0..1
}

final class AnomalyVector {
  const AnomalyVector({
    required this.behavioralDeviation,
    required this.economicDeviation,
    required this.graphAnomaly,
    required this.temporalIrregularity,
    required this.overall,
  });

  final double behavioralDeviation;
  final double economicDeviation;
  final double graphAnomaly;
  final double temporalIrregularity;
  final double overall;
}

final class ControlAction {
  const ControlAction({
    required this.type,
    required this.magnitude,
    required this.reason,
    this.targetClusterId,
  });

  final ControlActionType type;
  final double magnitude; // normalized intensity 0..1
  final String reason;
  final String? targetClusterId;
}

final class PolicyFeedback {
  const PolicyFeedback({
    required this.financialLossDelta,
    required this.userExperienceDelta,
    required this.falsePositiveDelta,
  });

  final double financialLossDelta;
  final double userExperienceDelta;
  final double falsePositiveDelta;
}

typedef PolicyCondition = bool Function(SystemSignalState state, AnomalyVector anomaly);
typedef PolicyActionFactory = List<ControlAction> Function(
  SystemSignalState state,
  AnomalyVector anomaly,
);

final class AdaptivePolicy {
  AdaptivePolicy({
    required this.id,
    required this.condition,
    required this.actionFactory,
    this.confidence = 0.5,
    this.decayRate = 0.02,
  });

  final String id;
  final PolicyCondition condition;
  final PolicyActionFactory actionFactory;
  double confidence;
  final double decayRate;

  bool evaluate(SystemSignalState state, AnomalyVector anomaly) =>
      condition(state, anomaly);

  List<ControlAction> buildActions(SystemSignalState state, AnomalyVector anomaly) =>
      actionFactory(state, anomaly);
}

final class AutonomousPolicyEngine {
  AutonomousPolicyEngine({
    List<AdaptivePolicy>? policies,
  }) : _policies = policies ?? _defaultPolicies();

  final List<AdaptivePolicy> _policies;

  List<AdaptivePolicy> get policies => List<AdaptivePolicy>.unmodifiable(_policies);

  List<ControlAction> decide({
    required SystemSignalState state,
    required AnomalyVector anomaly,
  }) {
    final actions = <ControlAction>[];
    for (final policy in _policies) {
      if (!policy.evaluate(state, anomaly)) continue;
      final weightedActions = policy
          .buildActions(state, anomaly)
          .map(
            (action) => ControlAction(
              type: action.type,
              magnitude: (action.magnitude * (0.6 + policy.confidence * 0.8))
                  .clamp(0.0, 1.0)
                  .toDouble(),
              reason: '${action.reason} [policy:${policy.id}]',
              targetClusterId: action.targetClusterId,
            ),
          )
          .toList();
      actions.addAll(weightedActions);
    }
    return _mergeActions(actions);
  }

  void learn({
    required List<String> triggeredPolicyIds,
    required PolicyFeedback feedback,
  }) {
    for (final policy in _policies) {
      final fired = triggeredPolicyIds.contains(policy.id);
      if (!fired) {
        policy.confidence = (policy.confidence - policy.decayRate).clamp(0.05, 0.99);
        continue;
      }
      final improvementScore = _improvementScore(feedback);
      final step = improvementScore >= 0 ? 0.06 : -0.08;
      policy.confidence = (policy.confidence + step).clamp(0.05, 0.99);
    }
  }

  double _improvementScore(PolicyFeedback feedback) {
    final loss = -feedback.financialLossDelta;
    final ux = feedback.userExperienceDelta;
    final fp = -feedback.falsePositiveDelta;
    return (loss * 0.55) + (ux * 0.20) + (fp * 0.25);
  }

  static List<ControlAction> _mergeActions(List<ControlAction> actions) {
    if (actions.isEmpty) return actions;
    final merged = <String, ControlAction>{};
    for (final action in actions) {
      final key = '${action.type.name}:${action.targetClusterId ?? 'global'}';
      final existing = merged[key];
      if (existing == null) {
        merged[key] = action;
      } else {
        merged[key] = ControlAction(
          type: action.type,
          targetClusterId: action.targetClusterId,
          magnitude: math.max(existing.magnitude, action.magnitude),
          reason: '${existing.reason}; ${action.reason}',
        );
      }
    }
    return merged.values.toList();
  }

  static List<AdaptivePolicy> _defaultPolicies() {
    return <AdaptivePolicy>[
      AdaptivePolicy(
        id: 'fraud-pressure',
        confidence: 0.72,
        decayRate: 0.02,
        condition: (state, anomaly) =>
            state.fraudLeakageRate > 0.05 || anomaly.overall > 0.78,
        actionFactory: (state, anomaly) => <ControlAction>[
          const ControlAction(
            type: ControlActionType.slowRewards,
            magnitude: 0.20,
            reason: 'reduce attacker profitability',
          ),
          const ControlAction(
            type: ControlActionType.increaseVerification,
            magnitude: 0.35,
            reason: 'increase invisible friction',
          ),
          const ControlAction(
            type: ControlActionType.delayPayouts,
            magnitude: 0.50,
            reason: 'extend pending windows',
          ),
        ],
      ),
      AdaptivePolicy(
        id: 'collusion-cluster',
        confidence: 0.68,
        decayRate: 0.02,
        condition: (state, anomaly) =>
            anomaly.graphAnomaly > 0.70 && state.clusterAnomalyById.isNotEmpty,
        actionFactory: (state, anomaly) {
          final suspicious = _highestRiskCluster(state.clusterAnomalyById);
          if (suspicious == null) return const <ControlAction>[];
          return <ControlAction>[
            ControlAction(
              type: ControlActionType.isolateCluster,
              targetClusterId: suspicious.$1,
              magnitude: suspicious.$2.clamp(0.0, 1.0).toDouble(),
              reason: 'localized containment',
            ),
            ControlAction(
              type: ControlActionType.reduceVisibility,
              targetClusterId: suspicious.$1,
              magnitude: (0.30 + suspicious.$2 * 0.5).clamp(0.0, 1.0).toDouble(),
              reason: 'de-rank suspicious graph neighborhood',
            ),
          ];
        },
      ),
      AdaptivePolicy(
        id: 'wallet-risk',
        confidence: 0.64,
        decayRate: 0.015,
        condition: (state, anomaly) =>
            state.payoutSpike > 0.65 || state.systemRisk > 0.75,
        actionFactory: (state, anomaly) => <ControlAction>[
          const ControlAction(
            type: ControlActionType.freezeWallets,
            magnitude: 0.40,
            reason: 'freeze highest-risk wallets only',
          ),
          const ControlAction(
            type: ControlActionType.capWithdrawals,
            magnitude: 0.50,
            reason: 'limit withdrawal velocity',
          ),
          const ControlAction(
            type: ControlActionType.delayPayouts,
            magnitude: 0.65,
            reason: 'throttle payout rails',
          ),
        ],
      ),
      AdaptivePolicy(
        id: 'economic-circuit-breaker',
        confidence: 0.70,
        decayRate: 0.01,
        condition: (state, anomaly) =>
            state.rewardInflation > 0.70 || state.payoutSpike > 0.75,
        actionFactory: (state, anomaly) => <ControlAction>[
          const ControlAction(
            type: ControlActionType.freezeRewardScaling,
            magnitude: 1.0,
            reason: 'halt inflation cascade',
          ),
          const ControlAction(
            type: ControlActionType.delayPayouts,
            magnitude: 0.80,
            reason: 'shock absorption through pending balances',
          ),
        ],
      ),
    ];
  }

  static (String, double)? _highestRiskCluster(Map<String, double> byCluster) {
    if (byCluster.isEmpty) return null;
    final sorted = byCluster.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return (sorted.first.key, sorted.first.value);
  }
}

final class ExecutionState {
  const ExecutionState({
    this.rewardRateMultiplier = 1.0,
    this.payoutDelayMultiplier = 1.0,
    this.withdrawalCapMultiplier = 1.0,
    this.verificationDepthMultiplier = 1.0,
    this.rewardScalingFrozen = false,
    this.globalVisibilityMultiplier = 1.0,
    this.frozenClusterIds = const <String>{},
    this.isolatedClusterIds = const <String>{},
  });

  final double rewardRateMultiplier;
  final double payoutDelayMultiplier;
  final double withdrawalCapMultiplier;
  final double verificationDepthMultiplier;
  final bool rewardScalingFrozen;
  final double globalVisibilityMultiplier;
  final Set<String> frozenClusterIds;
  final Set<String> isolatedClusterIds;
}

final class AutonomousControlSnapshot {
  const AutonomousControlSnapshot({
    required this.anomaly,
    required this.actions,
    required this.execution,
    required this.triggeredPolicyIds,
  });

  final AnomalyVector anomaly;
  final List<ControlAction> actions;
  final ExecutionState execution;
  final List<String> triggeredPolicyIds;
}

final class AutonomousControlEngine {
  AutonomousControlEngine({
    AutonomousPolicyEngine? policyEngine,
  }) : _policyEngine = policyEngine ?? AutonomousPolicyEngine();

  final AutonomousPolicyEngine _policyEngine;

  AutonomousPolicyEngine get policyEngine => _policyEngine;

  AutonomousControlSnapshot process(SystemSignalState state) {
    final anomaly = computeAnomaly(state);
    final triggeredPolicies = _policyEngine.policies
        .where((policy) => policy.evaluate(state, anomaly))
        .map((policy) => policy.id)
        .toList();
    final actions = _policyEngine.decide(state: state, anomaly: anomaly);
    final execution = execute(actions);
    return AutonomousControlSnapshot(
      anomaly: anomaly,
      actions: actions,
      execution: execution,
      triggeredPolicyIds: triggeredPolicies,
    );
  }

  void learn({
    required List<String> triggeredPolicyIds,
    required PolicyFeedback feedback,
  }) {
    _policyEngine.learn(
      triggeredPolicyIds: triggeredPolicyIds,
      feedback: feedback,
    );
  }

  static AnomalyVector computeAnomaly(SystemSignalState state) {
    final behavior = state.behaviorDeviation.clamp(0.0, 1.0).toDouble();
    final economic = state.economicDeviation.clamp(0.0, 1.0).toDouble();
    final graph = state.graphAnomaly.clamp(0.0, 1.0).toDouble();
    final temporal = state.temporalIrregularity.clamp(0.0, 1.0).toDouble();
    final weighted = (behavior * 0.30) +
        (economic * 0.30) +
        (graph * 0.25) +
        (temporal * 0.15);
    return AnomalyVector(
      behavioralDeviation: behavior,
      economicDeviation: economic,
      graphAnomaly: graph,
      temporalIrregularity: temporal,
      overall: weighted.clamp(0.0, 1.0).toDouble(),
    );
  }

  static ExecutionState execute(List<ControlAction> actions) {
    var rewardRateMultiplier = 1.0;
    var payoutDelayMultiplier = 1.0;
    var withdrawalCapMultiplier = 1.0;
    var verificationDepthMultiplier = 1.0;
    var rewardScalingFrozen = false;
    var globalVisibilityMultiplier = 1.0;
    final frozenClusters = <String>{};
    final isolatedClusters = <String>{};

    for (final action in actions) {
      switch (action.type) {
        case ControlActionType.slowRewards:
          rewardRateMultiplier *= (1.0 - action.magnitude.clamp(0.0, 0.9));
        case ControlActionType.freezeWallets:
          if (action.targetClusterId != null) {
            frozenClusters.add(action.targetClusterId!);
          }
          withdrawalCapMultiplier *= (1.0 - action.magnitude.clamp(0.0, 0.95));
        case ControlActionType.increaseVerification:
          verificationDepthMultiplier *= (1.0 + action.magnitude.clamp(0.0, 2.0));
        case ControlActionType.reduceVisibility:
          globalVisibilityMultiplier *= (1.0 - action.magnitude.clamp(0.0, 0.8));
        case ControlActionType.isolateCluster:
          if (action.targetClusterId != null) {
            isolatedClusters.add(action.targetClusterId!);
          }
        case ControlActionType.delayPayouts:
          payoutDelayMultiplier *= (1.0 + action.magnitude.clamp(0.0, 3.0));
        case ControlActionType.capWithdrawals:
          withdrawalCapMultiplier *= (1.0 - action.magnitude.clamp(0.0, 0.95));
        case ControlActionType.freezeRewardScaling:
          rewardScalingFrozen = true;
      }
    }

    return ExecutionState(
      rewardRateMultiplier: rewardRateMultiplier.clamp(0.05, 1.0).toDouble(),
      payoutDelayMultiplier: payoutDelayMultiplier.clamp(1.0, 8.0).toDouble(),
      withdrawalCapMultiplier: withdrawalCapMultiplier.clamp(0.02, 1.0).toDouble(),
      verificationDepthMultiplier:
          verificationDepthMultiplier.clamp(1.0, 4.0).toDouble(),
      rewardScalingFrozen: rewardScalingFrozen,
      globalVisibilityMultiplier:
          globalVisibilityMultiplier.clamp(0.10, 1.0).toDouble(),
      frozenClusterIds: frozenClusters,
      isolatedClusterIds: isolatedClusters,
    );
  }
}
