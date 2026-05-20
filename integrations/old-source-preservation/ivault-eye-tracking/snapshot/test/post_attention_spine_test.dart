import 'package:eye_tracking_app/attention_verification_result.dart';
import 'package:eye_tracking_app/canonical/build_spec_v01.dart';
import 'package:eye_tracking_app/economy/post_attention_spine.dart';
import 'package:eye_tracking_app/policy_version.dart';
import 'package:eye_tracking_app/reward_issuance_engine.dart';
import 'package:eye_tracking_app/reward_engine.dart';
import 'package:eye_tracking_app/wallet_ledger_engine.dart';
import 'package:flutter_test/flutter_test.dart';

AttentionVerificationResult _seal() {
  return AttentionVerificationResult(
    sessionId: 'sess-spine',
    userId: 'u-spine',
    campaignId: 'c-spine',
    contentId: 'content-1',
    verified: true,
    attentionScore: 0.9,
    qualityScore: 0.88,
    fraudRisk: 0.1,
    watchedMs: 8000,
    verifiedMs: 5000,
    requiredMs: 2000,
    gazeValidRatio: 0.9,
    facePresentRatio: 0.95,
    blinkNaturalnessScore: 0.8,
    interactionScore: 0.7,
    failureReason: null,
    createdAt: '2026-04-25T12:00:00.000Z',
  );
}

CampaignBudgetState _budget({double remaining = 100, double reserved = 100}) {
  return CampaignBudgetState(
    campaignId: 'c-spine',
    brandId: 'b1',
    totalBudgetUsd: 200,
    rewardPerActionUsd: 5,
    targetActions: 40,
    minTrustScore: 0,
    remainingBudgetUsd: remaining,
    reservedUsd: reserved,
    spentUsd: 0,
  );
}

RewardIssuanceRequest _request(AttentionVerificationResult seal) {
  return RewardIssuanceRequest(
    userId: seal.userId,
    campaignId: seal.campaignId!,
    attentionSessionId: seal.sessionId,
    attention: seal,
    rules: const CampaignRewardRules(rewardCurrency: RewardCurrency.usd),
    budget: _budget(),
    trustScore: 90,
    fraudSignals: const FraudSignals(noFraudFlags: true),
    duplicateClaim: const DuplicateClaimResult(isDuplicate: false),
    dailyLimits: const DailyLimitState(earnedTodayUsd: 0, dailyCapUsd: 500),
    eligibility: const IssuanceEligibility(
      geoEligible: true,
      deviceEligible: true,
      sessionEligible: true,
    ),
    now: DateTime.utc(2026, 4, 25, 12),
    activePolicyVersionId: kBootstrapPolicyVersionId,
    requireLockedCampaignBudgetReserve: false,
  );
}

void main() {
  group('PostAttentionEconomySpine', () {
    test('duplicate idempotency key skips wallet mutation', () {
      final ledger = WalletLedgerEngine();
      final spine = PostAttentionEconomySpine();
      final seal = _seal();
      final req = _request(seal);
      const key = 'idem-1';

      final r1 = spine.run(
        issuanceRequest: req,
        ledger: ledger,
        walletId: 'w1',
        correlationId: 'corr-1',
        idempotencyKey: key,
      );
      expect(r1.duplicateSkipped, false);
      expect(r1.decisionApproved, true);
      expect(ledger.balanceForWallet('w1').pendingUsd, greaterThan(0));

      final r2 = spine.run(
        issuanceRequest: req,
        ledger: ledger,
        walletId: 'w1',
        correlationId: 'corr-2',
        idempotencyKey: key,
      );
      expect(r2.duplicateSkipped, true);
    });

    test('rejection emits attentionVerificationFailed and does not mint', () {
      final ledger = WalletLedgerEngine();
      final spine = PostAttentionEconomySpine();
      final bad = _seal().copyWith(verified: false, failureReason: 'low_quality');
      final r = spine.run(
        issuanceRequest: _request(bad),
        ledger: ledger,
        walletId: 'w2',
        correlationId: 'corr-3',
      );
      expect(r.decisionApproved, false);
      expect(
        r.events.any(
          (e) => e.eventType == CanonicalEventTypesV01.attentionVerificationFailed,
        ),
        true,
      );
      expect(ledger.balanceForWallet('w2').totalUsd, 0.0);
    });
  });
}
