import 'dart:math' as math;

enum DefenseActionType {
  adjustRewardRate,
  increaseVerificationThresholds,
  delayOrSplitPayouts,
  triggerAdditionalGates,
  reduceTrustScores,
  isolateClusters,
  reweightExternalSignals,
  freezeShadowBanThrottle,
  injectFriction,
}

final class DefenseState {
  const DefenseState({
    required this.userBehaviorVectors,
    required this.trustScores,
    required this.anomalyScores,
    required this.rewardFlowMetrics,
    required this.withdrawalVelocity,
    required this.conversionPatterns,
    required this.attentionVerificationSignals,
    required this.gazeEntropy,
    required this.sessionConsistency,
    required this.crossPlatformSignals,
    required this.networkGraphRisk,
    required this.systemLoad,
    required this.liquidityState,
  });

  final Map<String, double> userBehaviorVectors;
  final Map<String, double> trustScores;
  final Map<String, double> anomalyScores;
  final Map<String, double> rewardFlowMetrics;
  final double withdrawalVelocity;
  final double conversionPatterns;
  final double attentionVerificationSignals;
  final double gazeEntropy;
  final double sessionConsistency;
  final double crossPlatformSignals;
  final double networkGraphRisk;
  final double systemLoad;
  final double liquidityState;

  double get systemIntegrityScore {
    final trust = _averageMap(trustScores);
    final anomaly = _averageMap(anomalyScores);
    final rewardFlow = _averageMap(rewardFlowMetrics);
    final behavior = _averageMap(userBehaviorVectors);
    final defensiveSignal = ((attentionVerificationSignals * 0.20) +
            (sessionConsistency * 0.15) +
            (crossPlatformSignals * 0.12) +
            (rewardFlow * 0.10) +
            (behavior * 0.08) +
            (liquidityState * 0.15) +
            ((1.0 - withdrawalVelocity) * 0.10) +
            ((1.0 - networkGraphRisk) * 0.10))
        .clamp(0.0, 1.0)
        .toDouble();
    final anomalyPenalty = (anomaly * 0.35) + (systemLoad * 0.10);
    return (defensiveSignal + (trust * 0.15) - anomalyPenalty)
        .clamp(0.0, 1.0)
        .toDouble();
  }

  DefenseState copyWith({
    Map<String, double>? userBehaviorVectors,
    Map<String, double>? trustScores,
    Map<String, double>? anomalyScores,
    Map<String, double>? rewardFlowMetrics,
    double? withdrawalVelocity,
    double? conversionPatterns,
    double? attentionVerificationSignals,
    double? gazeEntropy,
    double? sessionConsistency,
    double? crossPlatformSignals,
    double? networkGraphRisk,
    double? systemLoad,
    double? liquidityState,
  }) {
    return DefenseState(
      userBehaviorVectors: userBehaviorVectors ?? this.userBehaviorVectors,
      trustScores: trustScores ?? this.trustScores,
      anomalyScores: anomalyScores ?? this.anomalyScores,
      rewardFlowMetrics: rewardFlowMetrics ?? this.rewardFlowMetrics,
      withdrawalVelocity: withdrawalVelocity ?? this.withdrawalVelocity,
      conversionPatterns: conversionPatterns ?? this.conversionPatterns,
      attentionVerificationSignals:
          attentionVerificationSignals ?? this.attentionVerificationSignals,
      gazeEntropy: gazeEntropy ?? this.gazeEntropy,
      sessionConsistency: sessionConsistency ?? this.sessionConsistency,
      crossPlatformSignals: crossPlatformSignals ?? this.crossPlatformSignals,
      networkGraphRisk: networkGraphRisk ?? this.networkGraphRisk,
      systemLoad: systemLoad ?? this.systemLoad,
      liquidityState: liquidityState ?? this.liquidityState,
    );
  }
}

final class DefenseAction {
  const DefenseAction({
    required this.type,
    required this.intensity,
    this.targetKey,
  });

  final DefenseActionType type;
  final double intensity; // continuous action magnitude 0..1
  final String? targetKey;
}

final class DefenseReward {
  const DefenseReward({
    required this.systemIntegrityScore,
    required this.fraudDetectionRate,
    required this.falsePositivePenalty,
    required this.userExperienceDegradation,
    required this.liquidityLoss,
    required this.rewardExtractionByAttackers,
  });

  final double systemIntegrityScore;
  final double fraudDetectionRate;
  final double falsePositivePenalty;
  final double userExperienceDegradation;
  final double liquidityLoss;
  final double rewardExtractionByAttackers;

  double get total =>
      systemIntegrityScore +
      fraudDetectionRate -
      falsePositivePenalty -
      userExperienceDegradation -
      liquidityLoss -
      rewardExtractionByAttackers;
}

final class GlobalPolicyConstraints {
  const GlobalPolicyConstraints({
    required this.maxFrozenUserRatio,
    required this.minimumRewardFloor,
    required this.allowImmediateVerifiedFreeze,
    required this.maxFrictionInjection,
  });

  final double maxFrozenUserRatio;
  final double minimumRewardFloor;
  final bool allowImmediateVerifiedFreeze;
  final double maxFrictionInjection;
}

final class GlobalPolicyDecision {
  const GlobalPolicyDecision({
    required this.minVerificationThreshold,
    required this.maxRewardRateReduction,
    required this.maxPayoutThrottle,
    required this.constraints,
  });

  final double minVerificationThreshold;
  final double maxRewardRateReduction;
  final double maxPayoutThrottle;
  final GlobalPolicyConstraints constraints;
}

final class LocalPolicyContext {
  const LocalPolicyContext({
    required this.userId,
    required this.userTrustScore,
    required this.userAnomalyScore,
    required this.userBehaviorScore,
    required this.globalPolicy,
  });

  final String userId;
  final double userTrustScore;
  final double userAnomalyScore;
  final double userBehaviorScore;
  final GlobalPolicyDecision globalPolicy;
}

final class LocalPolicyDecision {
  const LocalPolicyDecision({
    required this.actions,
  });

  final List<DefenseAction> actions;
}

final class TransitionOutcome {
  const TransitionOutcome({
    required this.previousState,
    required this.action,
    required this.nextState,
    required this.reward,
    required this.actionApplied,
  });

  final DefenseState previousState;
  final DefenseAction action;
  final DefenseState nextState;
  final DefenseReward reward;
  final bool actionApplied;
}

final class AdversarialPressure {
  const AdversarialPressure({
    required this.attackIntensity,
    required this.humanLikeFraudPressure,
    required this.collusionPressure,
    required this.extractionPressure,
  });

  final double attackIntensity;
  final double humanLikeFraudPressure;
  final double collusionPressure;
  final double extractionPressure;

  static const none = AdversarialPressure(
    attackIntensity: 0.0,
    humanLikeFraudPressure: 0.0,
    collusionPressure: 0.0,
    extractionPressure: 0.0,
  );
}

final class ShadowDefenseEnvironment {
  const ShadowDefenseEnvironment({
    required this.constraints,
  });

  final GlobalPolicyConstraints constraints;

  TransitionOutcome step({
    required DefenseState state,
    required DefenseAction action,
    required AdversarialPressure adversarialPressure,
  }) {
    final constrainedAction = _constrainAction(action, state);
    final actionApplied = constrainedAction != null;
    final effectiveAction = constrainedAction ?? action;

    final actedState = actionApplied ? _applyAction(state, effectiveAction) : state;
    final attackedState = _applyAdversarialPressure(actedState, adversarialPressure);
    final reward = _computeReward(
      previous: state,
      action: effectiveAction,
      next: attackedState,
      pressure: adversarialPressure,
      actionApplied: actionApplied,
    );

    return TransitionOutcome(
      previousState: state,
      action: effectiveAction,
      nextState: attackedState,
      reward: reward,
      actionApplied: actionApplied,
    );
  }

  DefenseAction? _constrainAction(DefenseAction action, DefenseState state) {
    final intensity = action.intensity.clamp(0.0, 1.0).toDouble();

    if (action.type == DefenseActionType.injectFriction &&
        intensity > constraints.maxFrictionInjection) {
      return null;
    }
    if (action.type == DefenseActionType.adjustRewardRate &&
        state.rewardFlowMetrics.values.any(
          (metric) => metric - (intensity * 0.4) < constraints.minimumRewardFloor,
        )) {
      return null;
    }
    if (!constraints.allowImmediateVerifiedFreeze &&
        action.type == DefenseActionType.freezeShadowBanThrottle &&
        intensity > constraints.maxFrozenUserRatio) {
      return null;
    }
    return DefenseAction(
      type: action.type,
      intensity: intensity,
      targetKey: action.targetKey,
    );
  }

  DefenseState _applyAction(DefenseState state, DefenseAction action) {
    final i = action.intensity;
    switch (action.type) {
      case DefenseActionType.adjustRewardRate:
        return state.copyWith(
          rewardFlowMetrics: _shiftMap(state.rewardFlowMetrics, delta: -(i * 0.08)),
          liquidityState: (state.liquidityState + (i * 0.03))
              .clamp(0.0, 1.0)
              .toDouble(),
        );
      case DefenseActionType.increaseVerificationThresholds:
        return state.copyWith(
          attentionVerificationSignals:
              (state.attentionVerificationSignals + (i * 0.12))
                  .clamp(0.0, 1.0)
                  .toDouble(),
          anomalyScores: _shiftMap(state.anomalyScores, delta: -(i * 0.04)),
          conversionPatterns: (state.conversionPatterns - (i * 0.04))
              .clamp(0.0, 1.0)
              .toDouble(),
        );
      case DefenseActionType.delayOrSplitPayouts:
        return state.copyWith(
          withdrawalVelocity: (state.withdrawalVelocity - (i * 0.10))
              .clamp(0.0, 1.0)
              .toDouble(),
          liquidityState: (state.liquidityState + (i * 0.08))
              .clamp(0.0, 1.0)
              .toDouble(),
        );
      case DefenseActionType.triggerAdditionalGates:
        return state.copyWith(
          attentionVerificationSignals:
              (state.attentionVerificationSignals + (i * 0.10))
                  .clamp(0.0, 1.0)
                  .toDouble(),
          trustScores: _shiftMap(state.trustScores, delta: -(i * 0.01)),
        );
      case DefenseActionType.reduceTrustScores:
        return state.copyWith(
          trustScores: _shiftMap(state.trustScores, delta: -(i * 0.07)),
          anomalyScores: _shiftMap(state.anomalyScores, delta: -(i * 0.02)),
        );
      case DefenseActionType.isolateClusters:
        return state.copyWith(
          networkGraphRisk: (state.networkGraphRisk - (i * 0.16))
              .clamp(0.0, 1.0)
              .toDouble(),
          crossPlatformSignals: (state.crossPlatformSignals + (i * 0.03))
              .clamp(0.0, 1.0)
              .toDouble(),
        );
      case DefenseActionType.reweightExternalSignals:
        return state.copyWith(
          crossPlatformSignals: (state.crossPlatformSignals + (i * 0.14))
              .clamp(0.0, 1.0)
              .toDouble(),
          anomalyScores: _shiftMap(state.anomalyScores, delta: -(i * 0.03)),
        );
      case DefenseActionType.freezeShadowBanThrottle:
        return state.copyWith(
          anomalyScores: _shiftMap(state.anomalyScores, delta: -(i * 0.06)),
          rewardFlowMetrics: _shiftMap(state.rewardFlowMetrics, delta: -(i * 0.03)),
          conversionPatterns: (state.conversionPatterns - (i * 0.08))
              .clamp(0.0, 1.0)
              .toDouble(),
        );
      case DefenseActionType.injectFriction:
        return state.copyWith(
          attentionVerificationSignals:
              (state.attentionVerificationSignals + (i * 0.05))
                  .clamp(0.0, 1.0)
                  .toDouble(),
          conversionPatterns: (state.conversionPatterns - (i * 0.10))
              .clamp(0.0, 1.0)
              .toDouble(),
        );
    }
  }

  DefenseState _applyAdversarialPressure(
    DefenseState state,
    AdversarialPressure pressure,
  ) {
    final attack = pressure.attackIntensity.clamp(0.0, 1.0);
    final humanLike = pressure.humanLikeFraudPressure.clamp(0.0, 1.0);
    final collusion = pressure.collusionPressure.clamp(0.0, 1.0);
    final extraction = pressure.extractionPressure.clamp(0.0, 1.0);

    final anomalyDelta = (attack * 0.08) + (humanLike * 0.05);
    final trustDelta = -((attack * 0.05) + (collusion * 0.03));
    final liquidityDelta = -((extraction * 0.08) + (attack * 0.03));

    return state.copyWith(
      anomalyScores: _shiftMap(state.anomalyScores, delta: anomalyDelta),
      trustScores: _shiftMap(state.trustScores, delta: trustDelta),
      rewardFlowMetrics: _shiftMap(state.rewardFlowMetrics, delta: extraction * 0.04),
      networkGraphRisk: (state.networkGraphRisk + (collusion * 0.10))
          .clamp(0.0, 1.0)
          .toDouble(),
      withdrawalVelocity: (state.withdrawalVelocity + (extraction * 0.12))
          .clamp(0.0, 1.0)
          .toDouble(),
      systemLoad: (state.systemLoad + (attack * 0.06)).clamp(0.0, 1.0).toDouble(),
      liquidityState: (state.liquidityState + liquidityDelta)
          .clamp(0.0, 1.0)
          .toDouble(),
    );
  }

  DefenseReward _computeReward({
    required DefenseState previous,
    required DefenseAction action,
    required DefenseState next,
    required AdversarialPressure pressure,
    required bool actionApplied,
  }) {
    final attack = pressure.attackIntensity.clamp(0.0, 1.0);
    final extraction = pressure.extractionPressure.clamp(0.0, 1.0);
    final anomalyBefore = _averageMap(previous.anomalyScores);
    final anomalyAfter = _averageMap(next.anomalyScores);

    final systemIntegrity = next.systemIntegrityScore;
    final fraudDetectionRate = (anomalyBefore - anomalyAfter + (attack * 0.3))
        .clamp(0.0, 1.0)
        .toDouble();
    final falsePositivePenalty = action.type == DefenseActionType.injectFriction
        ? (action.intensity * 0.35)
        : (action.intensity * 0.12);
    final userExperienceDegradation = ((1.0 - next.conversionPatterns) * 0.5) +
        (action.type == DefenseActionType.freezeShadowBanThrottle
            ? action.intensity * 0.2
            : 0.0);
    final liquidityLoss =
        ((1.0 - next.liquidityState) * 0.6) + (next.withdrawalVelocity * 0.25);
    final rewardExtractionByAttackers = ((extraction * 0.5) +
            (_averageMap(next.rewardFlowMetrics) * 0.25) +
            (next.networkGraphRisk * 0.15) -
            (next.attentionVerificationSignals * 0.2))
        .clamp(0.0, 1.0)
        .toDouble();
    final inactionPenalty = actionApplied ? 0.0 : 0.2;

    return DefenseReward(
      systemIntegrityScore: systemIntegrity,
      fraudDetectionRate: fraudDetectionRate,
      falsePositivePenalty: (falsePositivePenalty + inactionPenalty)
          .clamp(0.0, 1.0)
          .toDouble(),
      userExperienceDegradation: userExperienceDegradation.clamp(0.0, 1.0).toDouble(),
      liquidityLoss: liquidityLoss.clamp(0.0, 1.0).toDouble(),
      rewardExtractionByAttackers: rewardExtractionByAttackers,
    );
  }
}

final class GlobalPolicyController {
  const GlobalPolicyController();

  GlobalPolicyDecision evaluate(DefenseState state) {
    final risk =
        (_averageMap(state.anomalyScores) + state.networkGraphRisk + state.systemLoad) /
            3.0;
    final minVerificationThreshold =
        (0.40 + (risk * 0.45)).clamp(0.35, 0.95).toDouble();
    final maxRewardRateReduction =
        (0.15 + ((1.0 - state.liquidityState) * 0.45)).clamp(0.10, 0.75).toDouble();
    final maxPayoutThrottle =
        (0.25 + ((1.0 - state.liquidityState) * 0.55)).clamp(0.20, 0.95).toDouble();

    return GlobalPolicyDecision(
      minVerificationThreshold: minVerificationThreshold,
      maxRewardRateReduction: maxRewardRateReduction,
      maxPayoutThrottle: maxPayoutThrottle,
      constraints: GlobalPolicyConstraints(
        maxFrozenUserRatio: (0.04 + (risk * 0.10)).clamp(0.03, 0.20).toDouble(),
        minimumRewardFloor: 0.03,
        allowImmediateVerifiedFreeze: false,
        maxFrictionInjection: (0.20 + ((1.0 - state.sessionConsistency) * 0.25))
            .clamp(0.20, 0.50)
            .toDouble(),
      ),
    );
  }
}

final class LocalPolicyController {
  const LocalPolicyController();

  LocalPolicyDecision evaluate(LocalPolicyContext context) {
    final actions = <DefenseAction>[];
    if (context.userAnomalyScore > context.globalPolicy.minVerificationThreshold) {
      actions.add(
        DefenseAction(
          type: DefenseActionType.triggerAdditionalGates,
          intensity: context.userAnomalyScore,
          targetKey: context.userId,
        ),
      );
    }
    if (context.userTrustScore < 0.4) {
      actions.add(
        DefenseAction(
          type: DefenseActionType.delayOrSplitPayouts,
          intensity: (1.0 - context.userTrustScore)
              .clamp(0.0, context.globalPolicy.maxPayoutThrottle)
              .toDouble(),
          targetKey: context.userId,
        ),
      );
    }
    if (context.userBehaviorScore < 0.3 && context.userAnomalyScore > 0.6) {
      actions.add(
        DefenseAction(
          type: DefenseActionType.injectFriction,
          intensity: (0.35 + (context.userAnomalyScore * 0.35))
              .clamp(0.0, context.globalPolicy.constraints.maxFrictionInjection)
              .toDouble(),
          targetKey: context.userId,
        ),
      );
    }
    return LocalPolicyDecision(actions: actions);
  }
}

final class RlPolicyEngine {
  RlPolicyEngine({
    required this.environment,
    GlobalPolicyController? globalPolicy,
    LocalPolicyController? localPolicy,
    math.Random? random,
    this.learningRate = 0.08,
    this.discountFactor = 0.92,
  }) : globalPolicy = globalPolicy ?? const GlobalPolicyController(),
       localPolicy = localPolicy ?? const LocalPolicyController(),
       _random = random ?? math.Random(7) {
    for (final actionType in DefenseActionType.values) {
      _actionWeights[actionType] = 0.0;
    }
  }

  final ShadowDefenseEnvironment environment;
  final GlobalPolicyController globalPolicy;
  final LocalPolicyController localPolicy;
  final math.Random _random;
  final double learningRate;
  final double discountFactor;
  final Map<DefenseActionType, double> _actionWeights =
      <DefenseActionType, double>{};

  Map<DefenseActionType, double> get actionWeights =>
      Map<DefenseActionType, double>.unmodifiable(_actionWeights);

  DefenseAction selectAction({
    required DefenseState state,
    required double confidence,
  }) {
    final risk = _riskScore(state);
    final explore = confidence < 0.6 && _random.nextDouble() < 0.35;
    if (explore) {
      final randomAction =
          DefenseActionType.values[_random.nextInt(DefenseActionType.values.length)];
      return DefenseAction(type: randomAction, intensity: (0.15 + (risk * 0.6)).clamp(0.0, 1.0));
    }

    var bestType = DefenseActionType.adjustRewardRate;
    var bestScore = -double.infinity;
    for (final entry in _actionWeights.entries) {
      final compatibility = _actionCompatibility(entry.key, state);
      final score = entry.value + compatibility;
      if (score > bestScore) {
        bestScore = score;
        bestType = entry.key;
      }
    }

    return DefenseAction(
      type: bestType,
      intensity: (0.2 + (risk * 0.7)).clamp(0.0, 1.0).toDouble(),
    );
  }

  TransitionOutcome trainStep({
    required DefenseState state,
    required AdversarialPressure pressure,
    required double confidence,
  }) {
    final globalDecision = globalPolicy.evaluate(state);
    final selected = selectAction(state: state, confidence: confidence);
    final constrained = _applyGlobalConstraints(selected, globalDecision);
    final transition = environment.step(
      state: state,
      action: constrained,
      adversarialPressure: pressure,
    );
    _updatePolicy(transition: transition);
    return transition;
  }

  List<TransitionOutcome> trainLoop({
    required DefenseState initialState,
    required List<AdversarialPressure> pressureSchedule,
    required double confidence,
  }) {
    var current = initialState;
    final outcomes = <TransitionOutcome>[];
    for (final pressure in pressureSchedule) {
      final transition = trainStep(
        state: current,
        pressure: pressure,
        confidence: confidence,
      );
      outcomes.add(transition);
      current = transition.nextState;
    }
    return outcomes;
  }

  List<DefenseAction> evaluateLocalPolicies(DefenseState state) {
    final globalDecision = globalPolicy.evaluate(state);
    final actions = <DefenseAction>[];
    for (final entry in state.trustScores.entries) {
      final userId = entry.key;
      final userTrust = entry.value;
      final local = localPolicy.evaluate(
        LocalPolicyContext(
          userId: userId,
          userTrustScore: userTrust,
          userAnomalyScore: state.anomalyScores[userId] ?? 0.0,
          userBehaviorScore: state.userBehaviorVectors[userId] ?? 0.0,
          globalPolicy: globalDecision,
        ),
      );
      actions.addAll(local.actions);
    }
    return actions;
  }

  void _updatePolicy({
    required TransitionOutcome transition,
  }) {
    final tdTarget = transition.reward.total +
        (discountFactor * transition.nextState.systemIntegrityScore);
    final currentWeight = _actionWeights[transition.action.type] ?? 0.0;
    final tdError = tdTarget - currentWeight;
    _actionWeights[transition.action.type] =
        (currentWeight + (learningRate * tdError)).clamp(-5.0, 5.0).toDouble();
  }

  DefenseAction _applyGlobalConstraints(
    DefenseAction action,
    GlobalPolicyDecision decision,
  ) {
    switch (action.type) {
      case DefenseActionType.adjustRewardRate:
        return DefenseAction(
          type: action.type,
          intensity: action.intensity.clamp(0.0, decision.maxRewardRateReduction).toDouble(),
          targetKey: action.targetKey,
        );
      case DefenseActionType.delayOrSplitPayouts:
        return DefenseAction(
          type: action.type,
          intensity: action.intensity.clamp(0.0, decision.maxPayoutThrottle).toDouble(),
          targetKey: action.targetKey,
        );
      case DefenseActionType.injectFriction:
        return DefenseAction(
          type: action.type,
          intensity: action.intensity
              .clamp(0.0, decision.constraints.maxFrictionInjection)
              .toDouble(),
          targetKey: action.targetKey,
        );
      case DefenseActionType.freezeShadowBanThrottle:
        return DefenseAction(
          type: action.type,
          intensity: action.intensity
              .clamp(0.0, decision.constraints.maxFrozenUserRatio)
              .toDouble(),
          targetKey: action.targetKey,
        );
      case DefenseActionType.increaseVerificationThresholds:
      case DefenseActionType.triggerAdditionalGates:
      case DefenseActionType.reduceTrustScores:
      case DefenseActionType.isolateClusters:
      case DefenseActionType.reweightExternalSignals:
        return action;
    }
  }

  double _riskScore(DefenseState state) {
    return ((_averageMap(state.anomalyScores) * 0.35) +
            (state.networkGraphRisk * 0.2) +
            (state.withdrawalVelocity * 0.2) +
            ((1.0 - state.liquidityState) * 0.15) +
            (state.systemLoad * 0.1))
        .clamp(0.0, 1.0)
        .toDouble();
  }

  double _actionCompatibility(DefenseActionType type, DefenseState state) {
    final risk = _riskScore(state);
    switch (type) {
      case DefenseActionType.increaseVerificationThresholds:
      case DefenseActionType.triggerAdditionalGates:
        return risk * 0.6;
      case DefenseActionType.delayOrSplitPayouts:
      case DefenseActionType.adjustRewardRate:
        return ((1.0 - state.liquidityState) * 0.6) + (risk * 0.2);
      case DefenseActionType.isolateClusters:
      case DefenseActionType.reweightExternalSignals:
        return (state.networkGraphRisk * 0.7) + (risk * 0.1);
      case DefenseActionType.reduceTrustScores:
      case DefenseActionType.freezeShadowBanThrottle:
      case DefenseActionType.injectFriction:
        return (risk * 0.3) - (state.conversionPatterns * 0.2);
    }
  }
}

Map<String, double> _shiftMap(
  Map<String, double> source, {
  required double delta,
}) {
  final result = <String, double>{};
  for (final entry in source.entries) {
    result[entry.key] = (entry.value + delta).clamp(0.0, 1.0).toDouble();
  }
  return result;
}

double _averageMap(Map<String, double> source) {
  if (source.isEmpty) return 0.0;
  final total = source.values.fold<double>(0.0, (sum, value) => sum + value);
  return (total / source.length).clamp(0.0, 1.0).toDouble();
}
