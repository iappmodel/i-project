import 'package:eye_tracking_app/adversarial_reward_loop_simulation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('RewardLoopRedTeamSimulator', () {
    test('falsePositiveDynamicPenalty is linear then quadratic past 3%', () {
      expect(RewardLoopRedTeamSimulator.falsePositiveDynamicPenalty(0.02), closeTo(0.02, 1e-9));
      expect(RewardLoopRedTeamSimulator.falsePositiveDynamicPenalty(0.03), closeTo(0.03, 1e-9));
      final at5 = RewardLoopRedTeamSimulator.falsePositiveDynamicPenalty(0.05);
      expect(at5, closeTo(0.03 + (0.02 * 0.02 * 20), 1e-9));
      expect(at5, greaterThan(0.03));
    });

    test('ValueLot.mergeConversionLots carries max risk across parents', () {
      final t = DateTime.utc(2026, 1, 1);
      final low = ValueLot(
        lotId: 'a',
        origin: ValueLotOrigin.watch,
        amount: 10,
        riskScoreAtOrigin: 0.2,
        currentRiskScore: 0.2,
        unlockTime: t,
        lineage: const ['x'],
      );
      final high = ValueLot(
        lotId: 'b',
        origin: ValueLotOrigin.campaign,
        amount: 5,
        riskScoreAtOrigin: 0.75,
        currentRiskScore: 0.8,
        unlockTime: t,
        lineage: const ['y'],
      );
      final merged = ValueLot.mergeConversionLots(
        newLotId: 'm',
        parentLots: [low, high],
        unlockTime: t.add(const Duration(days: 1)),
      );
      expect(merged.amount, 15);
      expect(merged.currentRiskScore, 0.8);
      expect(merged.riskScoreAtOrigin, 0.8);
      expect(merged.origin, ValueLotOrigin.conversion);
    });

    test('computeRTotal matches weighted spec (section 15)', () {
      const c = RewardLoopComponents(
        rFraudDetection: 0.8,
        rEconomicProtection: 0.8,
        rVerificationIntegrity: 0.7,
        rUserLegitimacyFlow: 0.7,
        rTrustScoreStability: 0.6,
        falsePositiveRate: 0.02,
        liquidityBlockRate: 0.01,
        frictionCost: 0.05,
        policyVolatility: 0.02,
      );
      final pFp = RewardLoopRedTeamSimulator.falsePositiveDynamicPenalty(c.falsePositiveRate);
      final manual = 0.25 * 0.8 +
          0.20 * 0.8 +
          0.15 * 0.7 +
          0.15 * 0.7 +
          0.10 * 0.6 -
          0.15 * pFp -
          0.07 * 0.01 -
          0.05 * 0.05 -
          0.03 * 0.02;
      expect(RewardLoopRedTeamSimulator.computeRTotal(c), closeTo(manual, 1e-9));
    });

    test('baselineHealthySystemState passes matrix and deploy gate', () {
      final s = baselineHealthySystemState();
      final sim = RewardLoopRedTeamSimulator.deterministic(1);
      final rows = sim.evaluateMatrix(s);
      expect(rows, hasLength(10));
      for (final r in rows) {
        expect(r.passed, isTrue, reason: '${r.agentId} ${r.primaryMetricName}=${r.primaryMetricValue}');
      }

      const components = RewardLoopComponents(
        rFraudDetection: 0.75,
        rEconomicProtection: 0.72,
        rVerificationIntegrity: 0.7,
        rUserLegitimacyFlow: 0.68,
        rTrustScoreStability: 0.65,
        falsePositiveRate: 0.035,
        liquidityBlockRate: 0.01,
        frictionCost: 0.04,
        policyVolatility: 0.02,
      );
      final report = sim.runFullReport(
        state: s,
        components: components,
        fraudPayoutLoss: 0.004,
        trustScoreStdDev: 0.04,
        campaignBudgetDrain: 0.02,
      );
      expect(report.deployPolicyAllowed, isTrue);
      expect(report.deployBlockReasons, isEmpty);
    });

    test('defend prefers freezeValueLot on high collusion without account freeze by default', () {
      final s = baselineHealthySystemState().copyWith(
        repeatedPairScore: 0.95,
        circularValueFlow: 0.9,
        synchronizedTiming: 0.92,
        sharedDeviceCount: 10,
        completionQuality: 0.2,
      );
      final sim = RewardLoopRedTeamSimulator();
      final obs = sim.observeState(s);
      final defense = sim.defend(s, obs);
      expect(defense.action, DefenseAction.freezeValueLot);
      expect(defense.accountFrozen, isFalse);
      expect(defense.frozenLotIds, isNotEmpty);
    });
  });

  group('defaultRedTeamAgents', () {
    test('exposes ten structured adversarial profiles', () {
      final agents = defaultRedTeamAgents();
      expect(agents, hasLength(10));
      final ids = agents.map((a) => a.id).toSet();
      expect(ids.length, 10);
      for (final a in agents) {
        expect(a.objective, isNotEmpty);
        expect(a.attackSurface, isNotEmpty);
        final obs = a.observe(baselineHealthySystemState());
        expect(obs.riskScore, inInclusiveRange(0.0, 1.0));
        a.receiveOutcome(
          const DefenseOutcome(
            action: DefenseAction.allow,
            blockedValueUsd: 0,
            falsePositive: false,
            frozenLotIds: <String>[],
            accountFrozen: false,
          ),
        );
      }
    });
  });
}

extension on SystemState {
  SystemState copyWith({
    double? repeatedPairScore,
    double? circularValueFlow,
    double? synchronizedTiming,
    double? sharedDeviceCount,
    double? completionQuality,
  }) {
    return SystemState(
      userTrustScore: userTrustScore,
      accountAgeDays: accountAgeDays,
      deviceEntropy: deviceEntropy,
      platformConnections: platformConnections,
      priorWithdrawals: priorWithdrawals,
      attentionScore: attentionScore,
      gazeConsistency: gazeConsistency,
      blinkNaturalness: blinkNaturalness,
      completionRate: completionRate,
      interactionRate: interactionRate,
      availableBalance: availableBalance,
      pendingBalance: pendingBalance,
      valueLots: valueLots,
      withdrawalVelocity: withdrawalVelocity,
      conversionVelocity: conversionVelocity,
      campaignId: campaignId,
      rewardPerCompletion: rewardPerCompletion,
      remainingBudget: remainingBudget,
      completionQuality: completionQuality ?? this.completionQuality,
      sharedDeviceCount: sharedDeviceCount ?? this.sharedDeviceCount,
      repeatedPairScore: repeatedPairScore ?? this.repeatedPairScore,
      circularValueFlow: circularValueFlow ?? this.circularValueFlow,
      synchronizedTiming: synchronizedTiming ?? this.synchronizedTiming,
      behaviorDistributionEntropy: behaviorDistributionEntropy,
      fraudConfidence: fraudConfidence,
      downstreamValueScore: downstreamValueScore,
      uniquenessScore: uniquenessScore,
      anomalyScore: anomalyScore,
      gazeInconsistency: gazeInconsistency,
      velocityAnomaly: velocityAnomaly,
      networkRisk: networkRisk,
      platformSignalNoise: platformSignalNoise,
    );
  }
}
