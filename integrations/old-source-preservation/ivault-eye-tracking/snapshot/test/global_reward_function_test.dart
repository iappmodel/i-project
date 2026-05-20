import 'package:eye_tracking_app/global_reward_function.dart';
import 'package:flutter_test/flutter_test.dart';

GlobalRewardLedgerSnapshot _snapshot({
  FraudDetectionCounts? fraud,
  double totalFraudPayoutUsd = 0,
  double totalRewardPoolUsd = 10000,
  List<double>? trustDeltas,
  int validSessions = 80,
  int totalSessions = 100,
  int validWithdrawals = 95,
  int totalWithdrawals = 100,
  double spoofRate = 0.01,
  int legitBlocked = 2,
  int totalLegit = 200,
  double avgVerifySec = 2.5,
  double baselineVerifySec = 2.5,
  double blockedFunds = 10,
  double totalLegitFunds = 5000,
}) {
  return GlobalRewardLedgerSnapshot(
    fraud: fraud ??
        const FraudDetectionCounts(
          fraudulentSessionsStoppedBeforePayout: 85,
          totalFraudulentSessions: 100,
          highRiskUsersBlocked: 18,
          highRiskUsersTotal: 20,
          repeatAttackers: 5,
          totalAttackers: 25,
        ),
    totalFraudPayoutUsd: totalFraudPayoutUsd,
    totalRewardPoolUsd: totalRewardPoolUsd,
    trustScoreDeltas24h: trustDeltas ?? const [0.01, -0.02, 0.015, 0.0, 0.005],
    validSessionsCompleted: validSessions,
    totalSessions: totalSessions,
    validWithdrawalsCompleted: validWithdrawals,
    totalValidWithdrawals: totalWithdrawals,
    spoofSuccessRate: spoofRate,
    legitimateUsersBlockedOrThrottled: legitBlocked,
    totalLegitimateUsers: totalLegit,
    avgVerificationTimeSeconds: avgVerifySec,
    baselineVerificationSeconds: baselineVerifySec,
    blockedLegitimateFundsUsd: blockedFunds,
    totalLegitimateFundsUsd: totalLegitFunds,
  );
}

void main() {
  group('FraudDetectionCounts', () {
    test('early_detection_rate matches formula', () {
      const c = FraudDetectionCounts(
        fraudulentSessionsStoppedBeforePayout: 17,
        totalFraudulentSessions: 20,
        highRiskUsersBlocked: 0,
        highRiskUsersTotal: 0,
        repeatAttackers: 0,
        totalAttackers: 0,
      );
      expect(c.earlyDetectionRate, closeTo(0.85, 1e-9));
    });

    test('vacuous denominators are optimistic neutral', () {
      const c = FraudDetectionCounts(
        fraudulentSessionsStoppedBeforePayout: 0,
        totalFraudulentSessions: 0,
        highRiskUsersBlocked: 0,
        highRiskUsersTotal: 0,
        repeatAttackers: 0,
        totalAttackers: 0,
      );
      expect(c.earlyDetectionRate, 1.0);
      expect(c.highRiskBlockRate, 1.0);
      expect(c.repeatAttackPrevention, 1.0);
      expect(c.rFraudDetection, 1.0);
    });
  });

  group('rEconomicProtection', () {
    test('1% fraud loss → R = 0.99', () {
      expect(
        rEconomicProtection(totalFraudPayoutUsd: 100, totalRewardPoolUsd: 10000),
        closeTo(0.99, 1e-9),
      );
    });
  });

  group('computeGlobalReward', () {
    test('all-positive ceiling with zero penalties → rTotal = 0.90', () {
      final b = computeGlobalReward(
        _snapshot(
          fraud: const FraudDetectionCounts(
            fraudulentSessionsStoppedBeforePayout: 1,
            totalFraudulentSessions: 1,
            highRiskUsersBlocked: 1,
            highRiskUsersTotal: 1,
            repeatAttackers: 0,
            totalAttackers: 1,
          ),
          totalFraudPayoutUsd: 0,
          trustDeltas: const [0.0, 0.0],
          validSessions: 1,
          totalSessions: 1,
          validWithdrawals: 1,
          totalWithdrawals: 1,
          spoofRate: 0.0,
          legitBlocked: 0,
          totalLegit: 100,
          avgVerifySec: 2.5,
          baselineVerifySec: 2.5,
          blockedFunds: 0,
          totalLegitFunds: 1000,
        ),
      );
      expect(b.rFraudDetection, 1.0);
      expect(b.rEconomicProtection, 1.0);
      expect(b.rTrustStability, 1.0);
      expect(b.rUserLegitimacyFlow, 1.0);
      expect(b.rVerificationIntegrity, 1.0);
      expect(b.pFalsePositive, 0.0);
      expect(b.pFrictionCost, 0.0);
      expect(b.pLiquidityBlock, 0.0);
      expect(b.rTotal, closeTo(0.90, 1e-9));
      expect(b.rTotalNormalizedByPositiveWeights, closeTo(1.0, 1e-9));
    });

    test('penalties reduce total by weighted penalty sum', () {
      final perfectFraud = const FraudDetectionCounts(
        fraudulentSessionsStoppedBeforePayout: 1,
        totalFraudulentSessions: 1,
        highRiskUsersBlocked: 1,
        highRiskUsersTotal: 1,
        repeatAttackers: 0,
        totalAttackers: 1,
      );
      final baseline = computeGlobalReward(
        _snapshot(
          fraud: perfectFraud,
          totalFraudPayoutUsd: 0,
          trustDeltas: const [0.0, 0.0, 0.0],
          validSessions: 1,
          totalSessions: 1,
          validWithdrawals: 1,
          totalWithdrawals: 1,
          spoofRate: 0.0,
          legitBlocked: 0,
          totalLegit: 100,
          avgVerifySec: 2.5,
          baselineVerifySec: 2.5,
          blockedFunds: 0,
          totalLegitFunds: 1000,
        ),
      );
      expect(baseline.rTotal, closeTo(0.90, 1e-9));

      final penalized = computeGlobalReward(
        _snapshot(
          fraud: perfectFraud,
          totalFraudPayoutUsd: 0,
          trustDeltas: const [0.0, 0.0, 0.0],
          validSessions: 1,
          totalSessions: 1,
          validWithdrawals: 1,
          totalWithdrawals: 1,
          spoofRate: 0.0,
          legitBlocked: 30,
          totalLegit: 100,
          avgVerifySec: 10,
          baselineVerifySec: 2.5,
          blockedFunds: 200,
          totalLegitFunds: 5000,
        ),
      );
      expect(penalized.pFalsePositive, 0.3);
      expect(penalized.pFrictionCost, 1.0);
      expect(penalized.pLiquidityBlock, 0.04);
      const expectedPen = 0.10 * 0.3 + 0.05 * 1.0 + 0.05 * 0.04;
      expect(penalized.rTotal, closeTo(baseline.rTotal - expectedPen, 1e-9));
    });
  });

  group('PlatformRiskSignals', () {
    test('risk_score uses spec weights', () {
      const s = PlatformRiskSignals(
        anomalyScore: 1,
        gazeInconsistency: 0,
        velocityAnomaly: 0,
        networkRisk: 0,
        deviceEntropy: 0,
        platformSignalNoise: 0,
      );
      expect(s.riskScore, 0.25);
    });
  });

  group('riskActionBand', () {
    test('threshold boundaries', () {
      expect(riskActionBand(0.29), RiskActionBand.normal);
      expect(riskActionBand(0.3), RiskActionBand.softFriction);
      expect(riskActionBand(0.599), RiskActionBand.softFriction);
      expect(riskActionBand(0.6), RiskActionBand.strongVerification);
      expect(riskActionBand(0.799), RiskActionBand.strongVerification);
      expect(riskActionBand(0.8), RiskActionBand.restrictOrDelay);
      expect(riskActionBand(0.899), RiskActionBand.restrictOrDelay);
      expect(riskActionBand(0.9), RiskActionBand.isolateOrFreeze);
    });
  });

  group('PolicyGuardrails', () {
    test('detects violations', () {
      const g = PolicyGuardrails();
      final v = g.evaluate(
        observedBlockRate: 0.11,
        observedRewardReduction: 0.3,
        withdrawDelayHours: 72,
        frictionMultiplierVsBaseline: 2.5,
      );
      expect(v.length, 4);
    });
  });

  group('shouldRevertPolicyForRewardDrop', () {
    test('triggers on >20% drop from peak in window', () {
      final t0 = DateTime.utc(2026, 4, 25, 12, 0);
      final hist = <GlobalRewardMonitorEntry>[
        GlobalRewardMonitorEntry(at: t0, rTotal: 0.50),
        GlobalRewardMonitorEntry(at: t0.add(const Duration(minutes: 5)), rTotal: 0.60),
      ];
      final latest = GlobalRewardMonitorEntry(
        at: t0.add(const Duration(minutes: 8)),
        rTotal: 0.47,
      );
      expect(
        shouldRevertPolicyForRewardDrop(
          history: hist,
          latest: latest,
          dropFraction: 0.20,
        ),
        isTrue,
      );
    });

    test('no revert when shallow dip', () {
      final t0 = DateTime.utc(2026, 4, 25, 12, 0);
      final hist = <GlobalRewardMonitorEntry>[
        GlobalRewardMonitorEntry(at: t0, rTotal: 0.50),
      ];
      final latest = GlobalRewardMonitorEntry(
        at: t0.add(const Duration(minutes: 5)),
        rTotal: 0.48,
      );
      expect(
        shouldRevertPolicyForRewardDrop(history: hist, latest: latest),
        isFalse,
      );
    });
  });

  group('normalizeLinear', () {
    test('clamps', () {
      expect(normalizeLinear(5, 0, 10), 0.5);
      expect(normalizeLinear(-1, 0, 10), 0.0);
      expect(normalizeLinear(11, 0, 10), 1.0);
    });
  });
}
