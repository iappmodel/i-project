import 'package:eye_tracking_app/attention_verification_result.dart';
import 'package:eye_tracking_app/reward_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('RewardEngine', () {
    test('creates pending reward and reserves campaign budget', () {
      final engine = RewardEngine();
      final campaign = CampaignBudget(
        id: 'c1',
        brandId: 'brand-a',
        totalBudgetUsd: 100,
        rewardPerActionUsd: 2,
        targetActions: 50,
      );
      engine.registerCampaign(campaign);
      final now = DateTime(2026, 4, 25, 0, 0);

      final reward = engine.createPendingReward(
        userId: 'u1',
        campaignId: 'c1',
        baseRewardUsd: 2,
        attentionScore: 0.75,
        now: now,
        trustScore: 60,
      );

      final wallet = engine.walletForUser('u1');
      expect(reward.pendingAmountUsd, 1.89);
      expect(wallet.pendingUsd, 1.89);
      expect(wallet.rCoins, 1.89);
      expect(wallet.availableUsd, 0.0);
      expect(campaign.reservedUsd, 1.89);
      expect(campaign.spentUsd, 0.0);
      expect(campaign.remainingBudgetUsd, 98.11);
    });

    test('Rule 3: validateReward cannot approve without campaign reserve', () {
      final engine = RewardEngine(attentionThreshold: 0.6);
      final campaign = CampaignBudget(
        id: 'c1',
        brandId: 'brand-a',
        totalBudgetUsd: 100,
        rewardPerActionUsd: 1,
        targetActions: 100,
      );
      engine.registerCampaign(campaign);
      final now = DateTime(2026, 4, 25, 0, 0);
      final reward = engine.createPendingReward(
        userId: 'u1',
        campaignId: 'c1',
        baseRewardUsd: 1,
        attentionScore: 0.8,
        now: now,
        trustScore: 25,
      );
      // Simulate missing / insufficient lock (must not approve spend).
      campaign.reservedUsd = 0;

      expect(
        () => engine.validateReward(
          rewardId: reward.id,
          input: RewardValidationInput(
            attentionPass: true,
            completionPass: true,
            fraudSignals: const FraudSignals(noFraudFlags: true),
            now: now.add(const Duration(hours: 80)),
          ),
        ),
        throwsStateError,
      );
    });

    test('holds reward before unlock and approves after all gates pass', () {
      final engine = RewardEngine(attentionThreshold: 0.6);
      final campaign = CampaignBudget(
        id: 'c1',
        brandId: 'brand-a',
        totalBudgetUsd: 100,
        rewardPerActionUsd: 1,
        targetActions: 100,
      );
      engine.registerCampaign(campaign);
      final now = DateTime(2026, 4, 25, 0, 0);
      final reward = engine.createPendingReward(
        userId: 'u1',
        campaignId: 'c1',
        baseRewardUsd: 1,
        attentionScore: 0.8,
        now: now,
        trustScore: 25,
      );

      final hold = engine.validateReward(
        rewardId: reward.id,
        input: RewardValidationInput(
          attentionPass: true,
          completionPass: true,
          fraudSignals: const FraudSignals(noFraudFlags: true),
          now: now.add(const Duration(hours: 2)),
        ),
      );
      expect(hold, RewardValidationResult.hold);

      final approved = engine.validateReward(
        rewardId: reward.id,
        input: RewardValidationInput(
          attentionPass: true,
          completionPass: true,
          fraudSignals: const FraudSignals(noFraudFlags: true),
          now: now.add(const Duration(hours: 80)),
        ),
      );
      expect(approved, RewardValidationResult.approved);

      final wallet = engine.walletForUser('u1');
      expect(wallet.pendingUsd, 0.0);
      expect(wallet.availableUsd, closeTo(0.126, 0.0001));
      expect(wallet.iCoins, closeTo(0.126, 0.0001));
      expect(campaign.reservedUsd, 0.0);
      expect(campaign.spentUsd, closeTo(0.42, 0.0001));
      final creatorWallet = engine.walletForUser('creator:c1');
      expect(creatorWallet.availableUsd, closeTo(0.252, 0.0001));
      expect(engine.platformTreasuryUsd, closeTo(0.042, 0.0001));
    });

    test('rejects reward on integrity failure and restores campaign budget', () {
      final engine = RewardEngine();
      final campaign = CampaignBudget(
        id: 'c1',
        brandId: 'brand-a',
        totalBudgetUsd: 20,
        rewardPerActionUsd: 1,
        targetActions: 20,
      );
      engine.registerCampaign(campaign);
      final now = DateTime(2026, 4, 25, 0, 0);
      final reward = engine.createPendingReward(
        userId: 'u1',
        campaignId: 'c1',
        baseRewardUsd: 2,
        attentionScore: 0.9,
        trustScore: 95,
        now: now,
      );

      final rejected = engine.validateReward(
        rewardId: reward.id,
        input: RewardValidationInput(
          attentionPass: true,
          completionPass: true,
          fraudSignals: const FraudSignals(
            noFraudFlags: false,
            hasReplayPattern: true,
          ),
          now: now.add(const Duration(hours: 8)),
        ),
      );
      expect(rejected, RewardValidationResult.rejected);

      final wallet = engine.walletForUser('u1');
      expect(wallet.pendingUsd, 0.0);
      expect(wallet.availableUsd, 0.0);
      expect(campaign.spentUsd, 0.0);
      expect(campaign.reservedUsd, 0.0);
      expect(campaign.remainingBudgetUsd, 20.0);
    });

    test('supports 1:1 usd to iCoin conversion and gated withdrawals', () {
      final engine = RewardEngine(
        minimumWithdrawUsd: 5.0,
        withdrawDelay: const Duration(hours: 24),
        trustThresholdForWithdraw: 0.6,
      );
      final campaign = CampaignBudget(
        id: 'c1',
        brandId: 'brand-a',
        totalBudgetUsd: 50,
        rewardPerActionUsd: 1,
        targetActions: 50,
      );
      engine.registerCampaign(campaign);
      final now = DateTime(2026, 4, 25, 0, 0);
      final reward = engine.createPendingReward(
        userId: 'u1',
        campaignId: 'c1',
        baseRewardUsd: 10,
        attentionScore: 1.0,
        trustScore: 95,
        now: now,
      );
      engine.validateReward(
        rewardId: reward.id,
        input: RewardValidationInput(
          attentionPass: true,
          completionPass: true,
          fraudSignals: const FraudSignals(noFraudFlags: true),
          now: now.add(const Duration(hours: 6)),
        ),
      );

      final converted = engine.convertAvailableUsdToICoins(
        userId: 'u1',
        usdAmount: 1.0,
      );
      expect(converted, 1.0);

      final walletAfterConvert = engine.walletForUser('u1');
      expect(walletAfterConvert.iCoins, closeTo(7.3, 0.0001));
      expect(walletAfterConvert.availableUsd, closeTo(5.3, 0.0001));

      final withdraw = engine.requestWithdraw(
        userId: 'u1',
        usdAmount: 5.0,
        trustScore: 80,
        hasFraudFlags: false,
        now: now.add(const Duration(hours: 8)),
      );
      expect(
        engine.completeWithdraw(
          withdrawId: withdraw.id,
          now: now.add(const Duration(hours: 10)),
        ),
        false,
      );
      expect(engine.rewardEventById(reward.id)?.status, RewardStatus.available);
      final split = engine.rewardSplitById(reward.id);
      expect(split?.viewerAmount, closeTo(6.3, 0.0001));
      expect(split?.creatorAmount, closeTo(12.6, 0.0001));
      expect(split?.platformAmount, closeTo(2.1, 0.0001));
      expect(
        engine.completeWithdraw(
          withdrawId: withdraw.id,
          now: now.add(const Duration(hours: 40)),
        ),
        true,
      );
    });

    test('calculates trust score from weighted behavioral components', () {
      final engine = RewardEngine();
      final trust = engine.updateTrustFromSession(
        userId: 'u1',
        now: DateTime(2026, 4, 25, 0, 0),
        signal: const SessionTrustSignal(
          sessionDurationSeconds: 600,
          interactionDiversity: 0.9,
          campaignCompletionRate: 0.8,
          navigationEntropy: 0.8,
          loopRepetitionRatio: 0.1,
          timingVariance: 0.8,
          avgAttentionScore: 0.85,
          consistencyScore: 0.8,
          accountAgeDays: 120,
          deviceStabilityScore: 0.95,
          externalSignalScore: 0.5,
        ),
      );

      expect(trust.trustScore, greaterThan(70));
      expect(trust.tier, TrustTier.tier4Trusted);
    });

    test('applies fast penalties and gradual recovery', () {
      final engine = RewardEngine();
      engine.updateTrustFromSession(
        userId: 'u1',
        now: DateTime(2026, 4, 25, 0, 0),
        signal: const SessionTrustSignal(
          sessionDurationSeconds: 600,
          interactionDiversity: 0.95,
          campaignCompletionRate: 0.9,
          navigationEntropy: 0.9,
          loopRepetitionRatio: 0.05,
          timingVariance: 0.9,
          avgAttentionScore: 0.9,
          consistencyScore: 0.9,
          accountAgeDays: 300,
          deviceStabilityScore: 0.95,
          externalSignalScore: 0.9,
        ),
      );

      final afterPenalty = engine.applyPenalty(
        userId: 'u1',
        severity: TrustPenaltySeverity.critical,
        reason: 'spoof_detected',
        now: DateTime(2026, 4, 25, 1, 0),
      );
      expect(afterPenalty.trustScore, lessThan(70));

      final recovered = engine.recoverTrust(
        userId: 'u1',
        cleanBehaviorQuality: 0.9,
        now: DateTime(2026, 4, 27, 1, 0),
      );
      expect(recovered.trustScore, greaterThan(afterPenalty.trustScore - 0.1));
    });

    test('enforces campaign trust threshold and tier-based earning caps', () {
      final engine = RewardEngine(baseDailyEarningCapUsd: 18);
      final campaign = CampaignBudget(
        id: 'premium',
        brandId: 'brand-z',
        totalBudgetUsd: 200,
        rewardPerActionUsd: 10,
        targetActions: 20,
        minTrustScore: 60,
      );
      engine.registerCampaign(campaign);
      final now = DateTime(2026, 4, 25, 0, 0);

      expect(
        () => engine.createPendingReward(
          userId: 'u1',
          campaignId: 'premium',
          baseRewardUsd: 5,
          attentionScore: 1.0,
          trustScore: 30,
          now: now,
        ),
        throwsStateError,
      );

      for (var i = 0; i < 3; i++) {
        engine.createPendingReward(
          userId: 'u1',
          campaignId: 'premium',
          baseRewardUsd: 5,
          attentionScore: 1.0,
          trustScore: 95,
          now: now.add(Duration(minutes: i)),
        );
      }
      expect(
        () => engine.createPendingReward(
          userId: 'u1',
          campaignId: 'premium',
          baseRewardUsd: 15,
          attentionScore: 1.0,
          trustScore: 95,
          now: now.add(const Duration(minutes: 5)),
        ),
        throwsStateError,
      );
    });

    test('computes trust state using weighted formula and tier multipliers', () {
      final engine = RewardEngine();
      final state = engine.computeTrustState(
        features: const TrustFeatures(
          attentionIntegrity: 0.9,
          avgAttentionScore: 0.88,
          fraudEvents: 0.05,
          anomalyScore: 0.08,
          sessionConsistency: 0.86,
          behavioralEntropy: 0.2,
          conversionRate: 0.7,
          withdrawalHistory: 0.8,
          accountAge: 0.9,
          externalVerifications: 0.9,
        ),
      );

      expect(state.score, greaterThan(75));
      expect(state.tier, 4);
      expect(state.multiplier, 1.5);
      expect(state.flags.restricted, false);
    });

    test('blocks high-value campaigns for low trust users', () {
      final engine = RewardEngine();
      engine.registerCampaign(
        CampaignBudget(
          id: 'high-value',
          brandId: 'brand',
          totalBudgetUsd: 100,
          rewardPerActionUsd: 8,
          targetActions: 10,
        ),
      );

      expect(
        () => engine.createPendingReward(
          userId: 'u1',
          campaignId: 'high-value',
          baseRewardUsd: 8,
          attentionScore: 1.0,
          now: DateTime(2026, 4, 25, 0, 0),
          trustScore: 35,
        ),
        throwsStateError,
      );
    });

    test('createPendingRewardFromVerification rejects unverified sessions', () {
      final engine = RewardEngine();
      engine.registerCampaign(
        CampaignBudget(
          id: 'c1',
          brandId: 'brand-a',
          totalBudgetUsd: 50,
          rewardPerActionUsd: 1,
          targetActions: 50,
        ),
      );
      final bad = AttentionVerificationResult(
        sessionId: 's',
        userId: 'u1',
        campaignId: 'c1',
        contentId: 'x',
        verified: false,
        attentionScore: 0.2,
        qualityScore: 0.3,
        fraudRisk: 0.8,
        watchedMs: 100,
        verifiedMs: 100,
        requiredMs: 3000,
        gazeValidRatio: 0.2,
        facePresentRatio: 0.3,
        blinkNaturalnessScore: 0.1,
        interactionScore: 0.1,
        failureReason: 'reject_low_attention',
        createdAt: DateTime.utc(2026).toIso8601String(),
      );
      expect(
        () => engine.createPendingRewardFromVerification(
          verification: bad,
          campaignId: 'c1',
          baseRewardUsd: 1,
          now: DateTime(2026, 4, 25),
        ),
        throwsStateError,
      );
    });

    test('createPendingRewardFromVerification succeeds when verified', () {
      final engine = RewardEngine();
      engine.registerCampaign(
        CampaignBudget(
          id: 'c1',
          brandId: 'brand-a',
          totalBudgetUsd: 50,
          rewardPerActionUsd: 1,
          targetActions: 50,
        ),
      );
      final now = DateTime(2026, 4, 25, 0, 0);
      final ok = AttentionVerificationResult(
        sessionId: 's',
        userId: 'u1',
        campaignId: 'c1',
        contentId: 'content-a',
        verified: true,
        attentionScore: 0.85,
        qualityScore: 0.9,
        fraudRisk: 0.15,
        watchedMs: 8000,
        verifiedMs: 5000,
        requiredMs: 3000,
        gazeValidRatio: 0.92,
        facePresentRatio: 0.98,
        blinkNaturalnessScore: 0.75,
        interactionScore: 0.65,
        createdAt: now.toIso8601String(),
      );
      final reward = engine.createPendingRewardFromVerification(
        verification: ok,
        campaignId: 'c1',
        baseRewardUsd: 1,
        now: now,
        trustScore: 70,
      );
      expect(reward.userId, 'u1');
      expect(reward.contentId, 'content-a');
      expect(reward.attentionScore, 0.85);
      expect(reward.confidence, 0.9);
    });

    test('validateRewardFromAttention uses canonical 0–1 scores', () {
      final engine = RewardEngine();
      final campaign = CampaignBudget(
        id: 'c1',
        brandId: 'brand-a',
        totalBudgetUsd: 50,
        rewardPerActionUsd: 2,
        targetActions: 25,
      );
      engine.registerCampaign(campaign);
      final now = DateTime(2026, 4, 25, 0, 0);
      final reward = engine.createPendingReward(
        userId: 'u1',
        campaignId: 'c1',
        baseRewardUsd: 2,
        attentionScore: 0.8,
        now: now,
        trustScore: 60,
      );
      final attention = AttentionVerificationResult(
        sessionId: 's',
        userId: 'u1',
        campaignId: 'c1',
        contentId: reward.contentId,
        verified: true,
        attentionScore: 0.72,
        qualityScore: 0.8,
        fraudRisk: 0.4,
        watchedMs: 5000,
        verifiedMs: 3500,
        requiredMs: 3000,
        gazeValidRatio: 0.9,
        facePresentRatio: 0.95,
        blinkNaturalnessScore: 0.7,
        interactionScore: 0.6,
        createdAt: now.toIso8601String(),
      );
      final result = engine.validateRewardFromAttention(
        rewardId: reward.id,
        attention: attention,
        fraudSignals: const FraudSignals(noFraudFlags: true),
        completionPass: true,
        now: now.add(const Duration(hours: 2)),
      );
      expect(result, RewardValidationResult.hold);
    });

    test('marks conversion gate for extra verification below threshold', () {
      final engine = RewardEngine();
      final gate = engine.evaluateConversionGate(
        trustScore: 48,
        threshold: 55,
        hasFraudFlags: false,
        activePolicyVersionId: 'policy-test-v1',
      );

      expect(gate.allowed, true);
      expect(gate.requireAdditionalVerification, true);
      expect(gate.reason, 'trust_below_threshold');
      expect(gate.policyVersionId, 'policy-test-v1');
    });

    test('applies campaign and supply multipliers with reward splits', () {
      final engine = RewardEngine();
      final campaign = CampaignBudget(
        id: 'c2',
        brandId: 'brand-b',
        totalBudgetUsd: 200,
        rewardPerActionUsd: 2,
        targetActions: 100,
        expectedValidViews: 100,
        valueTier: CampaignValueTier.high,
      );
      engine.registerCampaign(campaign);
      final base = engine.calculateBaseReward(campaign);
      final reward = engine.calculateRewardAmount(
        baseRewardUsd: base,
        verifiedAttention: 0.9,
        trustScore: 92,
        campaign: campaign,
        supplyPressure: SupplyPressure.high,
      );
      final split = engine.splitReward(reward);

      expect(base, 2.0);
      expect(reward, closeTo(3.744, 0.0001));
      expect(split.viewer, closeTo(1.1232, 0.0001));
      expect(split.creator, closeTo(2.2464, 0.0001));
      expect(split.platform, closeTo(0.3744, 0.0001));
    });
  });
}
