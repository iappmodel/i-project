import 'package:eye_tracking_app/attention_verification_result.dart';
import 'package:eye_tracking_app/policy_version.dart';
import 'package:eye_tracking_app/reward_engine.dart';
import 'package:eye_tracking_app/reward_issuance_engine.dart';
import 'package:flutter_test/flutter_test.dart';

AttentionVerificationResult _okAttention() {
  return AttentionVerificationResult(
    sessionId: 'sess1',
    userId: 'u1',
    campaignId: 'c1',
    contentId: 'content1',
    verified: true,
    attentionScore: 0.8,
    qualityScore: 0.85,
    fraudRisk: 0.2,
    watchedMs: 6000,
    verifiedMs: 5000,
    requiredMs: 3000,
    gazeValidRatio: 0.9,
    facePresentRatio: 0.95,
    blinkNaturalnessScore: 0.8,
    interactionScore: 0.7,
    failureReason: null,
    createdAt: '2026-04-25T12:00:00.000Z',
  );
}

CampaignBudgetState _budget({
  double remaining = 50,
  double reserved = 50,
  double minTrust = 0,
  double spent = 0,
}) {
  return CampaignBudgetState(
    campaignId: 'c1',
    brandId: 'b1',
    totalBudgetUsd: 100,
    rewardPerActionUsd: 2,
    targetActions: 50,
    minTrustScore: minTrust,
    remainingBudgetUsd: remaining,
    reservedUsd: reserved,
    spentUsd: spent,
  );
}

void main() {
  group('RewardIssuanceEngine', () {
    test('rejects on duplicate claim without lots or ledger', () {
      final engine = RewardIssuanceEngine();
      final out = engine.decide(
        RewardIssuanceRequest(
          userId: 'u1',
          campaignId: 'c1',
          attentionSessionId: 'sess1',
          attention: _okAttention(),
          rules: const CampaignRewardRules(rewardCurrency: RewardCurrency.usd),
          budget: _budget(),
          trustScore: 70,
          fraudSignals: const FraudSignals(noFraudFlags: true),
          duplicateClaim: const DuplicateClaimResult(
            isDuplicate: true,
            reason: 'session_already_rewarded',
          ),
          dailyLimits: const DailyLimitState(earnedTodayUsd: 0, dailyCapUsd: 50),
          eligibility: const IssuanceEligibility(
            geoEligible: true,
            deviceEligible: true,
            sessionEligible: true,
          ),
          now: DateTime.utc(2026, 4, 25),
          activePolicyVersionId: kBootstrapPolicyVersionId,
          decisionId: 'rid-dup',
          requireLockedCampaignBudgetReserve: false,
        ),
      );
      expect(out.decision.approved, false);
      expect(out.decision.status, RewardIssuanceStatus.rejected);
      expect(out.decision.rejectionReason, 'session_already_rewarded');
      expect(out.valueLots, isEmpty);
      expect(out.ledgerEntries, isEmpty);
    });

    test('rejects when geo ineligible', () {
      final engine = RewardIssuanceEngine();
      final out = engine.decide(
        RewardIssuanceRequest(
          userId: 'u1',
          campaignId: 'c1',
          attentionSessionId: 'sess1',
          attention: _okAttention(),
          rules: const CampaignRewardRules(rewardCurrency: RewardCurrency.usd),
          budget: _budget(),
          trustScore: 70,
          fraudSignals: const FraudSignals(noFraudFlags: true),
          duplicateClaim: const DuplicateClaimResult(isDuplicate: false),
          dailyLimits: const DailyLimitState(earnedTodayUsd: 0, dailyCapUsd: 50),
          eligibility: const IssuanceEligibility(
            geoEligible: false,
            deviceEligible: true,
            sessionEligible: true,
          ),
          now: DateTime.utc(2026, 4, 25),
          activePolicyVersionId: kBootstrapPolicyVersionId,
          requireLockedCampaignBudgetReserve: false,
        ),
      );
      expect(out.decision.approved, false);
      expect(out.decision.rejectionReason, 'eligibility_failed');
    });

    test('rejects when daily cap exceeded', () {
      final engine = RewardIssuanceEngine();
      final out = engine.decide(
        RewardIssuanceRequest(
          userId: 'u1',
          campaignId: 'c1',
          attentionSessionId: 'sess1',
          attention: _okAttention(),
          rules: const CampaignRewardRules(rewardCurrency: RewardCurrency.usd),
          budget: _budget(remaining: 100),
          trustScore: 95,
          fraudSignals: const FraudSignals(noFraudFlags: true),
          duplicateClaim: const DuplicateClaimResult(isDuplicate: false),
          dailyLimits: const DailyLimitState(
            earnedTodayUsd: 49.99,
            dailyCapUsd: 50,
          ),
          eligibility: const IssuanceEligibility(
            geoEligible: true,
            deviceEligible: true,
            sessionEligible: true,
          ),
          now: DateTime.utc(2026, 4, 25),
          activePolicyVersionId: kBootstrapPolicyVersionId,
          requireLockedCampaignBudgetReserve: false,
        ),
      );
      expect(out.decision.approved, false);
      expect(out.decision.rejectionReason, 'daily_earning_cap');
    });

    test('approves high trust: available + value lot + ledger entries', () {
      final engine = RewardIssuanceEngine();
      final out = engine.decide(
        RewardIssuanceRequest(
          userId: 'u1',
          campaignId: 'c1',
          attentionSessionId: 'sess1',
          attention: _okAttention(),
          rules: const CampaignRewardRules(
            rewardCurrency: RewardCurrency.iCoin,
          ),
          budget: _budget(remaining: 50, reserved: 50),
          trustScore: 95,
          fraudSignals: const FraudSignals(noFraudFlags: true),
          duplicateClaim: const DuplicateClaimResult(isDuplicate: false),
          dailyLimits: const DailyLimitState(earnedTodayUsd: 0, dailyCapUsd: 50),
          eligibility: const IssuanceEligibility(
            geoEligible: true,
            deviceEligible: true,
            sessionEligible: true,
          ),
          now: DateTime.utc(2026, 4, 25),
          activePolicyVersionId: kBootstrapPolicyVersionId,
          decisionId: 'rid-ok',
        ),
      );
      expect(out.decision.approved, true);
      expect(out.decision.status, RewardIssuanceStatus.available);
      expect(out.decision.rewardCurrency, RewardCurrency.iCoin);
      expect(out.decision.rewardAmount, greaterThan(0));
      expect(out.decision.holdReason, isNull);
      expect(out.valueLots, hasLength(1));
      expect(out.valueLots.single.status, ValueLotStatus.available);
      expect(out.ledgerEntries, hasLength(2));
      expect(
        out.ledgerEntries.map((e) => e.kind).toSet(),
        containsAll(<IssuanceLedgerKind>[
          IssuanceLedgerKind.campaignBudgetReserve,
          IssuanceLedgerKind.rewardAvailableCredit,
        ]),
      );
    });

    test('asyncSettlement yields pending status and pending credit', () {
      final engine = RewardIssuanceEngine();
      final out = engine.decide(
        RewardIssuanceRequest(
          userId: 'u1',
          campaignId: 'c1',
          attentionSessionId: 'sess1',
          attention: _okAttention(),
          rules: const CampaignRewardRules(
            rewardCurrency: RewardCurrency.usd,
            asyncSettlement: true,
          ),
          budget: _budget(remaining: 50, reserved: 50),
          trustScore: 95,
          fraudSignals: const FraudSignals(noFraudFlags: true),
          duplicateClaim: const DuplicateClaimResult(isDuplicate: false),
          dailyLimits: const DailyLimitState(earnedTodayUsd: 0, dailyCapUsd: 50),
          eligibility: const IssuanceEligibility(
            geoEligible: true,
            deviceEligible: true,
            sessionEligible: true,
          ),
          now: DateTime.utc(2026, 4, 25),
          activePolicyVersionId: kBootstrapPolicyVersionId,
        ),
      );
      expect(out.decision.status, RewardIssuanceStatus.pending);
      expect(
        out.ledgerEntries.any(
          (e) => e.kind == IssuanceLedgerKind.rewardPendingCredit,
        ),
        true,
      );
    });

    test('rejects on fraud signals', () {
      final engine = RewardIssuanceEngine();
      final out = engine.decide(
        RewardIssuanceRequest(
          userId: 'u1',
          campaignId: 'c1',
          attentionSessionId: 'sess1',
          attention: _okAttention(),
          rules: const CampaignRewardRules(rewardCurrency: RewardCurrency.usd),
          budget: _budget(),
          trustScore: 80,
          fraudSignals: const FraudSignals(
            noFraudFlags: true,
            hasSpoofPattern: true,
          ),
          duplicateClaim: const DuplicateClaimResult(isDuplicate: false),
          dailyLimits: const DailyLimitState(earnedTodayUsd: 0, dailyCapUsd: 50),
          eligibility: const IssuanceEligibility(
            geoEligible: true,
            deviceEligible: true,
            sessionEligible: true,
          ),
          now: DateTime.utc(2026, 4, 25),
          activePolicyVersionId: kBootstrapPolicyVersionId,
          requireLockedCampaignBudgetReserve: false,
        ),
      );
      expect(out.decision.rejectionReason, 'fraud_signals');
    });

    test('rejects when trust below campaign minTrustScore', () {
      final engine = RewardIssuanceEngine();
      final out = engine.decide(
        RewardIssuanceRequest(
          userId: 'u1',
          campaignId: 'c1',
          attentionSessionId: 'sess1',
          attention: _okAttention(),
          rules: const CampaignRewardRules(rewardCurrency: RewardCurrency.usd),
          budget: _budget(minTrust: 80),
          trustScore: 50,
          fraudSignals: const FraudSignals(noFraudFlags: true),
          duplicateClaim: const DuplicateClaimResult(isDuplicate: false),
          dailyLimits: const DailyLimitState(earnedTodayUsd: 0, dailyCapUsd: 50),
          eligibility: const IssuanceEligibility(
            geoEligible: true,
            deviceEligible: true,
            sessionEligible: true,
          ),
          now: DateTime.utc(2026, 4, 25),
          activePolicyVersionId: kBootstrapPolicyVersionId,
          requireLockedCampaignBudgetReserve: false,
        ),
      );
      expect(out.decision.rejectionReason, 'trust_below_campaign_minimum');
    });

    test('Rule 3: rejects when campaign budget is not locked (reservedUsd)', () {
      final engine = RewardIssuanceEngine();
      final out = engine.decide(
        RewardIssuanceRequest(
          userId: 'u1',
          campaignId: 'c1',
          attentionSessionId: 'sess1',
          attention: _okAttention(),
          rules: const CampaignRewardRules(rewardCurrency: RewardCurrency.usd),
          budget: _budget(remaining: 99, reserved: 0),
          trustScore: 95,
          fraudSignals: const FraudSignals(noFraudFlags: true),
          duplicateClaim: const DuplicateClaimResult(isDuplicate: false),
          dailyLimits: const DailyLimitState(earnedTodayUsd: 0, dailyCapUsd: 50),
          eligibility: const IssuanceEligibility(
            geoEligible: true,
            deviceEligible: true,
            sessionEligible: true,
          ),
          now: DateTime.utc(2026, 4, 25),
          activePolicyVersionId: kBootstrapPolicyVersionId,
        ),
      );
      expect(out.decision.approved, false);
      expect(out.decision.rejectionReason, 'no_campaign_budget_reserve');
      expect(out.valueLots, isEmpty);
    });

    test('low trust tier: held with unlock holdReason', () {
      final engine = RewardIssuanceEngine();
      final out = engine.decide(
        RewardIssuanceRequest(
          userId: 'u1',
          campaignId: 'c1',
          attentionSessionId: 'sess1',
          attention: _okAttention(),
          rules: const CampaignRewardRules(rewardCurrency: RewardCurrency.usd),
          budget: _budget(remaining: 50, reserved: 50, minTrust: 0),
          trustScore: 25,
          fraudSignals: const FraudSignals(noFraudFlags: true),
          duplicateClaim: const DuplicateClaimResult(isDuplicate: false),
          dailyLimits: const DailyLimitState(earnedTodayUsd: 0, dailyCapUsd: 50),
          eligibility: const IssuanceEligibility(
            geoEligible: true,
            deviceEligible: true,
            sessionEligible: true,
          ),
          now: DateTime.utc(2026, 4, 25),
          activePolicyVersionId: kBootstrapPolicyVersionId,
        ),
      );
      expect(out.decision.approved, true);
      expect(out.decision.status, RewardIssuanceStatus.held);
      expect(out.decision.holdReason, isNotNull);
      expect(out.decision.holdReason, contains('unlock_window'));
      expect(out.valueLots.single.status, ValueLotStatus.held);
      expect(
        out.ledgerEntries.any(
          (e) => e.kind == IssuanceLedgerKind.rewardPendingCredit,
        ),
        true,
      );
    });
  });
}
