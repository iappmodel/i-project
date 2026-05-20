import 'package:eye_tracking_app/attention_verification_result.dart';
import 'package:eye_tracking_app/economy/issue_reward_transaction.dart';
import 'package:eye_tracking_app/policy_version.dart';
import 'package:eye_tracking_app/reward_issuance_engine.dart';
import 'package:eye_tracking_app/reward_engine.dart';
import 'package:flutter_test/flutter_test.dart';

AttentionVerificationResult _seal() {
  return AttentionVerificationResult(
    sessionId: 'sess-ir',
    userId: 'u-ir',
    campaignId: 'c-ir',
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
    campaignId: 'c-ir',
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
    idempotencyKey: 'idem-issue-reward',
  );
}

void main() {
  group('IssueRewardTransactionPlanner', () {
    test('approved path plans wallet rows, reservation, and ledger', () {
      final ids = IssueRewardStableIds.generate();
      final seal = _seal();
      final planner = IssueRewardTransactionPlanner();
      final tx = planner.plan(
        IssueRewardTransactionInput(
          verificationId: '00000000-0000-4000-8000-000000000099',
          issuanceRequest: _request(seal),
          walletId: 'w-ir',
          budgetAccount: const IssueRewardBudgetAccountRead(
            campaignId: 'c-ir',
            currencyWire: 'USD',
            fundedMinor: 20000,
            reservedMinor: 0,
            spentMinor: 0,
          ),
          ids: ids,
        ),
      );

      expect(tx.isSuccess, isTrue);
      expect(tx.planError, isNull);
      expect(tx.budgetReservation, isNotNull);
      expect(tx.walletValueLots, hasLength(1));
      expect(tx.walletLedgerEntries.length, 2);
      expect(tx.balancePatches, hasLength(1));
      expect(tx.systemEvents.length, greaterThanOrEqualTo(6));
      expect(tx.rewardDecision.decision, 'approved');
    });

    test('engine rejection plans no wallet or reservation', () {
      final ids = IssueRewardStableIds.generate(systemEventCount: 4);
      final seal = _seal().copyWith(verified: false);
      final planner = IssueRewardTransactionPlanner();
      final tx = planner.plan(
        IssueRewardTransactionInput(
          verificationId: '00000000-0000-4000-8000-000000000088',
          issuanceRequest: _request(seal),
          walletId: 'w-ir',
          budgetAccount: const IssueRewardBudgetAccountRead(
            campaignId: 'c-ir',
            currencyWire: 'USD',
            fundedMinor: 20000,
            reservedMinor: 0,
            spentMinor: 0,
          ),
          ids: ids,
        ),
      );

      expect(tx.isSuccess, isTrue);
      expect(tx.budgetReservation, isNull);
      expect(tx.walletValueLots, isEmpty);
      expect(tx.rewardDecision.decision, 'rejected');
      expect(tx.systemEvents.length, 2);
    });

    test('budget account shortfall sets planError and ineligible candidate', () {
      final ids = IssueRewardStableIds.generate(systemEventCount: 4);
      final seal = _seal();
      final planner = IssueRewardTransactionPlanner();
      final tx = planner.plan(
        IssueRewardTransactionInput(
          verificationId: '00000000-0000-4000-8000-000000000077',
          issuanceRequest: _request(seal),
          walletId: 'w-ir',
          budgetAccount: const IssueRewardBudgetAccountRead(
            campaignId: 'c-ir',
            currencyWire: 'USD',
            fundedMinor: 1,
            reservedMinor: 0,
            spentMinor: 0,
          ),
          ids: ids,
        ),
      );

      expect(tx.isSuccess, isFalse);
      expect(tx.planError, 'campaign_budget_insufficient_available');
      expect(tx.rewardCandidate.eligibilityStatus, 'ineligible');
      expect(tx.walletValueLots, isEmpty);
    });
  });

  group('IssueRewardMemoryStore', () {
    test('second apply with same ids fails fast without mutating store', () {
      final store = IssueRewardMemoryStore();
      final ids = IssueRewardStableIds.generate();
      final seal = _seal();
      final planner = IssueRewardTransactionPlanner();
      final tx = planner.plan(
        IssueRewardTransactionInput(
          verificationId: '00000000-0000-4000-8000-000000000066',
          issuanceRequest: _request(seal),
          walletId: 'w-ir',
          budgetAccount: const IssueRewardBudgetAccountRead(
            campaignId: 'c-ir',
            currencyWire: 'USD',
            fundedMinor: 50000,
            reservedMinor: 0,
            spentMinor: 0,
          ),
          ids: ids,
        ),
      );

      store.applyPlanned(
        tx,
        const IssueRewardBudgetAccountRead(
          campaignId: 'c-ir',
          currencyWire: 'USD',
          fundedMinor: 50000,
          reservedMinor: 0,
          spentMinor: 0,
        ),
      );
      expect(store.rewardCandidates.length, 1);

      expect(
        () => store.applyPlanned(
          tx,
          const IssueRewardBudgetAccountRead(
            campaignId: 'c-ir',
            currencyWire: 'USD',
            fundedMinor: 50000,
            reservedMinor: 0,
            spentMinor: 0,
          ),
        ),
        throwsStateError,
      );
      expect(store.rewardCandidates.length, 1);
    });
  });
}
