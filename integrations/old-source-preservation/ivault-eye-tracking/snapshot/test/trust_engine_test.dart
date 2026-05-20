import 'dart:math' as math;

import 'package:eye_tracking_app/policy_version.dart';
import 'package:eye_tracking_app/trust_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('TrustEngine', () {
    const engine = TrustEngine();

    TrustSignalInput baseSignals({
      double behavior = 0.84,
      double attention = 0.9,
      double device = 0.86,
      double economic = 0.72,
      double network = 0.78,
    }) {
      return TrustSignalInput(
        behaviorScore: behavior,
        attentionScore: attention,
        deviceScore: device,
        economicScore: economic,
        networkScore: network,
      );
    }

    test('computes trust score, tier, and multiplier for healthy behavior', () {
      final now = DateTime(2026, 4, 25, 1, 0);
      final result = engine.computeProfile(
        userId: 'u1',
        signals: baseSignals(),
        now: now,
      );

      expect(result.trustScore, greaterThan(65));
      expect(result.trustTier, inInclusiveRange(3, 5));
      expect(result.trustMultiplier, inInclusiveRange(1.2, 2.0));
    });

    test('hard fraud flags force trust score to zero and freeze rewards', () {
      final now = DateTime(2026, 4, 25, 1, 0);
      final profile = engine.computeProfile(
        userId: 'u1',
        signals: baseSignals(),
        now: now,
      );
      final flagged = engine.applyFraudFlags(
        current: profile,
        flags: const TrustFlags(
          scriptedBehavior: true,
        ),
        now: now.add(const Duration(seconds: 1)),
      );

      expect(flagged.trustScore, 0);
      expect(flagged.trustTier, 0);
      expect(flagged.rewardFrozen, true);
    });

    test('soft fraud flags apply penalties without hard freeze', () {
      final now = DateTime(2026, 4, 25, 1, 0);
      final profile = engine.computeProfile(
        userId: 'u1',
        signals: baseSignals(),
        now: now,
      );
      final flagged = engine.applyFraudFlags(
        current: profile,
        flags: const TrustFlags(
          abnormalTiming: true,
          identicalSessions: true,
        ),
        now: now.add(const Duration(seconds: 1)),
      );

      expect(flagged.trustScore, lessThan(profile.trustScore));
      expect(flagged.rewardFrozen, false);
    });

    test('applies real-time event deltas', () {
      final t0 = DateTime(2026, 4, 25, 0, 0);
      final initial = engine.computeProfile(
        userId: 'u1',
        signals: baseSignals(
          behavior: 0.5,
          attention: 0.5,
          device: 0.5,
          economic: 0.5,
          network: 0.5,
        ),
        now: t0,
      );
      final next = engine.applyRealtimeEvent(
        current: initial,
        eventType: TrustEventType.tabSwitchDetected,
        now: t0.add(const Duration(seconds: 1)),
      );
      expect(next.trustScore, closeTo(initial.trustScore - 1.2, 0.0001));
    });

    test('applies 0.98 daily decay', () {
      final t0 = DateTime(2026, 4, 25, 0, 0);
      final current = engine.computeProfile(
        userId: 'u1',
        signals: baseSignals(
          behavior: 1,
          attention: 1,
          device: 1,
          economic: 1,
          network: 1,
        ),
        now: t0,
      );

      final decayed = engine.applyDailyDecay(
        current: current,
        inactiveDays: 10,
        now: t0.add(const Duration(days: 10)),
      );

      final expected = 100 * math.pow(0.98, 10);
      expect(decayed.trustScore, closeTo(expected.toDouble(), 0.001));
      expect(decayed.trustScore, lessThan(current.trustScore));
      expect(decayed.lastUpdated, isNot(current.lastUpdated));
    });

    test('maps multipliers exactly by tier', () {
      expect(engine.trustMultiplierForTier(0), 0.2);
      expect(engine.trustMultiplierForTier(1), 0.5);
      expect(engine.trustMultiplierForTier(2), 1.0);
      expect(engine.trustMultiplierForTier(3), 1.2);
      expect(engine.trustMultiplierForTier(4), 1.5);
      expect(engine.trustMultiplierForTier(5), 2.0);
    });

    test('withdrawal gate blocks low trust and soft flags', () {
      final profile = engine.computeProfile(
        userId: 'u1',
        signals: baseSignals(
          behavior: 0.35,
          attention: 0.4,
          device: 0.4,
          economic: 0.3,
          network: 0.3,
        ),
        now: DateTime(2026, 4, 25),
      );
      final decision = engine.evaluateWithdrawalGate(
        profile: profile,
        flags: const TrustFlags(abnormalTiming: true),
        verificationChecksPass: true,
        activePolicyVersionId: kBootstrapPolicyVersionId,
      );
      expect(decision.allowed, false);
      expect(decision.requireAdditionalVerification, true);
      expect(decision.policyVersionId, kBootstrapPolicyVersionId);
    });
  });

  group('TrustScoreSnapshot (2.5)', () {
    const engine = TrustEngine();

    TrustScoreInputs healthyInputs({
      Duration accountAge = const Duration(days: 120),
      double attention = 0.9,
      TrustFlags flags = const TrustFlags(),
    }) {
      return TrustScoreInputs(
        userId: 'u_snap',
        accountAge: accountAge,
        verifiedAttentionQuality: attention,
        rewardClaimHistoryScore: 0.92,
        fraudFlags: flags,
        deviceConsistency: 0.88,
        behaviorConsistency: 0.87,
        chargebackClawbackCount: 0,
        withdrawalHistoryScore: 0.9,
        campaignAbuseIndicatorCount: 0,
        identityVerificationLevel: 4,
      );
    }

    test('produces high trust with strong signals and aged account', () {
      final snap = engine.computeTrustScoreSnapshot(
        inputs: healthyInputs(),
        now: DateTime.utc(2026, 4, 25, 12),
        activePolicyVersionId: kBootstrapPolicyVersionId,
      );
      expect(snap.score, greaterThanOrEqualTo(800));
      expect(snap.policyVersionId, kBootstrapPolicyVersionId);
      expect(snap.level, TrustScoreLevel.highTrust);
      expect(snap.levelWire, 'high_trust');
      expect(snap.campaignAccessTier, 5);
      expect(snap.payoutDelayHours, 12);
      expect(snap.dailyEarnLimit, 2500);
      expect(snap.positiveSignals, isNotEmpty);
      expect(snap.riskFlags, isEmpty);
    });

    test('new account maps to new level with tighter limits', () {
      final snap = engine.computeTrustScoreSnapshot(
        inputs: healthyInputs(accountAge: const Duration(days: 5)),
        now: DateTime.utc(2026, 4, 25),
        activePolicyVersionId: kBootstrapPolicyVersionId,
      );
      expect(snap.level, TrustScoreLevel.newUser);
      expect(snap.levelWire, 'new');
      expect(snap.payoutDelayHours, 72);
      expect(snap.campaignAccessTier, 1);
    });

    test('hard fraud flags yield restricted with zero earn', () {
      final snap = engine.computeTrustScoreSnapshot(
        inputs: healthyInputs(
          flags: const TrustFlags(scriptedBehavior: true),
        ),
        now: DateTime.utc(2026, 4, 25),
        activePolicyVersionId: kBootstrapPolicyVersionId,
      );
      expect(snap.level, TrustScoreLevel.restricted);
      expect(snap.score, 0);
      expect(snap.dailyEarnLimit, 0);
      expect(snap.dailyWithdrawalLimit, 0);
      expect(snap.riskFlags, contains('hard_fraud_signal'));
      expect(snap.riskFlags, contains('scripted_behavior'));
    });

    test('severe chargeback pattern forces restricted', () {
      final snap = engine.computeTrustScoreSnapshot(
        inputs: TrustScoreInputs(
          userId: 'u_risk',
          accountAge: const Duration(days: 400),
          verifiedAttentionQuality: 0.35,
          rewardClaimHistoryScore: 0.3,
          fraudFlags: const TrustFlags(),
          deviceConsistency: 0.35,
          behaviorConsistency: 0.35,
          chargebackClawbackCount: 4,
          withdrawalHistoryScore: 0.25,
          campaignAbuseIndicatorCount: 0,
          identityVerificationLevel: 0,
        ),
        now: DateTime.utc(2026, 4, 25),
        activePolicyVersionId: kBootstrapPolicyVersionId,
      );
      expect(snap.level, TrustScoreLevel.restricted);
      expect(snap.score, 0);
    });

    test('JSON roundtrip preserves canonical fields', () {
      final snap = engine.computeTrustScoreSnapshot(
        inputs: healthyInputs(),
        now: DateTime.utc(2026, 4, 25, 15, 30),
        activePolicyVersionId: kBootstrapPolicyVersionId,
      );
      final decoded = TrustScoreSnapshot.fromJson(snap.toJson());
      expect(decoded.userId, snap.userId);
      expect(decoded.score, snap.score);
      expect(decoded.levelWire, snap.levelWire);
      expect(decoded.payoutDelayHours, snap.payoutDelayHours);
      expect(decoded.dailyEarnLimit, snap.dailyEarnLimit);
      expect(decoded.dailyWithdrawalLimit, snap.dailyWithdrawalLimit);
      expect(decoded.campaignAccessTier, snap.campaignAccessTier);
      expect(decoded.riskFlags, snap.riskFlags);
      expect(decoded.positiveSignals, snap.positiveSignals);
      expect(decoded.updatedAt, snap.updatedAt);
      expect(decoded.policyVersionId, snap.policyVersionId);
    });
  });
}
