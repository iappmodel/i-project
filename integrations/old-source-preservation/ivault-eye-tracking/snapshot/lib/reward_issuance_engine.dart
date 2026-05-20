import 'attention_verification_result.dart';
import 'reward_engine.dart';

/// Canonical reward currency (wire: USD | ICOIN | VCOIN | RCOIN).
enum RewardCurrency {
  usd,
  iCoin,
  vCoin,
  rCoin,
}

extension RewardCurrencyWire on RewardCurrency {
  String get wireName => switch (this) {
        RewardCurrency.usd => 'USD',
        RewardCurrency.iCoin => 'ICOIN',
        RewardCurrency.vCoin => 'VCOIN',
        RewardCurrency.rCoin => 'RCOIN',
      };
}

/// Issuance lifecycle for the decision record.
enum RewardIssuanceStatus {
  rejected,
  pending,
  available,
  held,
}

extension RewardIssuanceStatusWire on RewardIssuanceStatus {
  String get wireName => switch (this) {
        RewardIssuanceStatus.rejected => 'rejected',
        RewardIssuanceStatus.pending => 'pending',
        RewardIssuanceStatus.available => 'available',
        RewardIssuanceStatus.held => 'held',
      };
}

/// Canonical issuance decision (2.2 Reward Issuance Engine output).
final class RewardIssuanceDecision {
  const RewardIssuanceDecision({
    required this.decisionId,
    required this.userId,
    required this.campaignId,
    required this.attentionSessionId,
    required this.approved,
    required this.rewardAmount,
    required this.rewardCurrency,
    required this.status,
    this.holdReason,
    this.rejectionReason,
    required this.trustScoreAtIssuance,
    required this.fraudRiskAtIssuance,
    required this.createdAt,
    required this.policyVersionId,
  });

  final String decisionId;
  final String userId;
  final String campaignId;
  final String attentionSessionId;

  final bool approved;
  final double rewardAmount;
  final RewardCurrency rewardCurrency;

  final RewardIssuanceStatus status;
  final String? holdReason;
  final String? rejectionReason;

  final double trustScoreAtIssuance;
  final double fraudRiskAtIssuance;

  /// ISO-8601 string.
  final String createdAt;

  /// Rule 7 — id of the active governance policy when this decision was made.
  final String policyVersionId;
}

/// Immutable snapshot of campaign budget for issuance checks (no mutation).
final class CampaignBudgetState {
  const CampaignBudgetState({
    required this.campaignId,
    required this.brandId,
    required this.totalBudgetUsd,
    required this.rewardPerActionUsd,
    required this.targetActions,
    this.expectedValidViews = 0,
    this.valueTier = CampaignValueTier.standard,
    this.minTrustScore = 0.0,
    required this.remainingBudgetUsd,
    required this.reservedUsd,
    required this.spentUsd,
  });

  final String campaignId;
  final String brandId;
  final double totalBudgetUsd;
  final double rewardPerActionUsd;
  final int targetActions;
  final int expectedValidViews;
  final CampaignValueTier valueTier;
  final double minTrustScore;
  final double remainingBudgetUsd;
  final double reservedUsd;
  final double spentUsd;

  bool get isExhausted => remainingBudgetUsd <= 0;

  CampaignBudget toMutableCampaign() {
    final c = CampaignBudget(
      id: campaignId,
      brandId: brandId,
      totalBudgetUsd: totalBudgetUsd,
      rewardPerActionUsd: rewardPerActionUsd,
      targetActions: targetActions,
      expectedValidViews: expectedValidViews,
      valueTier: valueTier,
      minTrustScore: minTrustScore,
      remainingBudgetUsd: remainingBudgetUsd,
    );
    c.spentUsd = spentUsd;
    c.reservedUsd = reservedUsd;
    return c;
  }
}

/// Campaign-side reward rules (policy knobs for issuance).
final class CampaignRewardRules {
  const CampaignRewardRules({
    required this.rewardCurrency,
    this.minAttentionScore = 65.0,
    this.maxAttentionFraudScore = 60.0,
    this.completionPass = true,
    this.confidence = 1.0,
    this.completionQuality = 1.0,
    this.demandMultiplier = 1.0,
    this.supplyPressure = SupplyPressure.normal,
    this.asyncSettlement = false,
  });

  final RewardCurrency rewardCurrency;
  final double minAttentionScore;
  final double maxAttentionFraudScore;
  final bool completionPass;
  final double confidence;
  final double completionQuality;
  final double demandMultiplier;
  final SupplyPressure supplyPressure;
  final bool asyncSettlement;
}

/// Geo / device / session gates (all must be true to proceed).
final class IssuanceEligibility {
  const IssuanceEligibility({
    required this.geoEligible,
    required this.deviceEligible,
    required this.sessionEligible,
  });

  final bool geoEligible;
  final bool deviceEligible;
  final bool sessionEligible;

  bool get allEligible => geoEligible && deviceEligible && sessionEligible;
}

/// Result of duplicate-claim / idempotency checks.
final class DuplicateClaimResult {
  const DuplicateClaimResult({required this.isDuplicate, this.reason});

  final bool isDuplicate;
  final String? reason;
}

/// User + campaign daily earning window.
final class DailyLimitState {
  const DailyLimitState({
    required this.earnedTodayUsd,
    required this.dailyCapUsd,
  });

  final double earnedTodayUsd;
  final double dailyCapUsd;

  bool canAdd(double amountUsd) => earnedTodayUsd + amountUsd <= dailyCapUsd;
}

/// Side-effect plan: value lots + ledger lines (downstream applies to stores).
enum ValueLotStatus { pending, held, available }

final class ValueLot {
  const ValueLot({
    required this.lotId,
    required this.decisionId,
    required this.userId,
    required this.campaignId,
    required this.attentionSessionId,
    required this.amount,
    required this.currency,
    required this.status,
  });

  final String lotId;
  final String decisionId;
  final String userId;
  final String campaignId;
  final String attentionSessionId;
  final double amount;
  final RewardCurrency currency;
  final ValueLotStatus status;
}

enum IssuanceLedgerKind {
  rewardPendingCredit,
  rewardAvailableCredit,
  campaignBudgetReserve,
}

extension IssuanceLedgerKindWire on IssuanceLedgerKind {
  String get wireName => switch (this) {
        IssuanceLedgerKind.rewardPendingCredit => 'reward_pending_credit',
        IssuanceLedgerKind.rewardAvailableCredit => 'reward_available_credit',
        IssuanceLedgerKind.campaignBudgetReserve => 'campaign_budget_reserve',
      };
}

final class LedgerEntry {
  const LedgerEntry({
    required this.entryId,
    required this.decisionId,
    required this.kind,
    required this.accountKey,
    required this.amount,
    required this.currency,
    this.lotId,
    this.metadata,
  });

  final String entryId;
  final String decisionId;
  final IssuanceLedgerKind kind;
  /// e.g. `user:u1:pending_rewards` or `campaign:c1:reserved`
  final String accountKey;
  final double amount;
  final RewardCurrency currency;
  final String? lotId;
  final Map<String, String>? metadata;
}

final class RewardIssuanceOutcome {
  const RewardIssuanceOutcome({
    required this.decision,
    required this.valueLots,
    required this.ledgerEntries,
  });

  final RewardIssuanceDecision decision;
  final List<ValueLot> valueLots;
  final List<LedgerEntry> ledgerEntries;
}

/// Full input bundle for issuance (2.2).
final class RewardIssuanceRequest {
  const RewardIssuanceRequest({
    required this.userId,
    required this.campaignId,
    required this.attentionSessionId,
    required this.attention,
    required this.rules,
    required this.budget,
    required this.trustScore,
    required this.fraudSignals,
    required this.duplicateClaim,
    required this.dailyLimits,
    required this.eligibility,
    required this.now,
    required this.activePolicyVersionId,
    this.fraudRiskOverride,
    this.decisionId,
    this.idempotencyKey,
    /// Rule 3: require [CampaignBudgetState.reservedUsd] ≥ reward amount before
    /// any approved issuance (caller must lock budget, e.g. [CampaignBudgetReserveEngine.attemptReserve], first).
    this.requireLockedCampaignBudgetReserve = true,
    /// When set, the issuance [ValueLot] uses this id (aligns wallet + reserve).
    this.plannedValueLotId,
  });

  final String userId;
  final String campaignId;
  final String attentionSessionId;
  final AttentionVerificationResult attention;
  final CampaignRewardRules rules;
  final CampaignBudgetState budget;
  final double trustScore;
  final FraudSignals fraudSignals;
  final DuplicateClaimResult duplicateClaim;
  final DailyLimitState dailyLimits;
  final IssuanceEligibility eligibility;
  final DateTime now;

  /// Rule 7 — governance bundle in effect for this issuance attempt.
  final String activePolicyVersionId;

  /// Optional 0..1 override; otherwise derived from attention + signals.
  final double? fraudRiskOverride;

  /// Stable id when replaying the same logical decision (tests / idempotency).
  final String? decisionId;
  final String? idempotencyKey;

  /// When true, [decide] rejects with `no_campaign_budget_reserve` unless the
  /// budget snapshot already shows at least the computed reward amount in [CampaignBudgetState.reservedUsd].
  final bool requireLockedCampaignBudgetReserve;

  /// Optional stable lot id (e.g. from [CampaignBudgetReserveEngine.attemptReserve]).
  final String? plannedValueLotId;
}

/// Decides whether verified attention becomes value; emits lots + ledger only.
///
/// Does **not** mutate [Wallet] or [CampaignBudget] — integration applies
/// [RewardIssuanceOutcome.ledgerEntries] / [ValueLot] to persistence.
///
/// **Rule 8:** every rejection returns a [RewardIssuanceDecision] with non-null
/// [RewardIssuanceDecision.rejectionReason]; holds set [RewardIssuanceDecision.holdReason].
final class RewardIssuanceEngine {
  RewardIssuanceEngine({
    RewardEngine? calculator,
    this.minRewardUsd = 0.01,
    this.maxRewardUsd = 50.0,
  }) : _calc = calculator ?? RewardEngine();

  final RewardEngine _calc;
  final double minRewardUsd;
  final double maxRewardUsd;
  int _seq = 0;

  RewardIssuanceOutcome decide(RewardIssuanceRequest req) {
    final createdAt = req.now.toUtc().toIso8601String();
    final trust = req.trustScore.clamp(0.0, 100.0).toDouble();
    final tier = RewardEngine.tierForScore(trust);
    final fraudRisk = _combinedFraudRisk(req);

    String next(String prefix) {
      _seq += 1;
      return '$prefix-$_seq';
    }

    final decisionId = req.decisionId ?? next('rid');

    RewardIssuanceOutcome reject(String reason) {
      return RewardIssuanceOutcome(
        decision: RewardIssuanceDecision(
          decisionId: decisionId,
          userId: req.userId,
          campaignId: req.campaignId,
          attentionSessionId: req.attentionSessionId,
          approved: false,
          rewardAmount: 0,
          rewardCurrency: req.rules.rewardCurrency,
          status: RewardIssuanceStatus.rejected,
          rejectionReason: reason,
          trustScoreAtIssuance: trust,
          fraudRiskAtIssuance: fraudRisk,
          createdAt: createdAt,
          policyVersionId: req.activePolicyVersionId,
        ),
        valueLots: const <ValueLot>[],
        ledgerEntries: const <LedgerEntry>[],
      );
    }

    if (req.duplicateClaim.isDuplicate) {
      return reject(req.duplicateClaim.reason ?? 'duplicate_claim');
    }
    if (!req.eligibility.allEligible) {
      return reject('eligibility_failed');
    }
    if (!req.attention.verified) {
      return reject('attention_invalid');
    }
    final attentionPct = _attentionScorePercent(req.attention);
    if (attentionPct + 1e-9 < req.rules.minAttentionScore) {
      return reject('attention_score_below_minimum');
    }
    if (req.attention.verifiedMs + 1 < req.attention.requiredMs) {
      return reject('focus_time_insufficient');
    }
    final fraudPct = _fraudScorePercent(req.attention);
    if (fraudPct > req.rules.maxAttentionFraudScore + 1e-9) {
      return reject('attention_fraud_score_high');
    }
    if (!req.fraudSignals.isClean) {
      return reject('fraud_signals');
    }
    if (!req.rules.completionPass) {
      return reject('completion_failed');
    }
    if (!_calc.isCampaignEligible(trustScore: trust, campaign: req.budget.toMutableCampaign())) {
      return reject('trust_below_campaign_minimum');
    }
    if (req.budget.isExhausted) {
      return reject('campaign_budget_exhausted');
    }

    final campaign = req.budget.toMutableCampaign();
    final base = _calc.calculateBaseReward(campaign);
    final verifiedAttention = _verifiedAttentionUnit(req.attention);
    var amountUsd = _calc.calculateRewardAmount(
      baseRewardUsd: base,
      verifiedAttention: verifiedAttention,
      confidence: req.rules.confidence,
      trustScore: trust,
      campaign: campaign,
      supplyPressure: req.rules.supplyPressure,
      completionQuality: req.rules.completionQuality,
      demandMultiplier: req.rules.demandMultiplier,
    );
    amountUsd = amountUsd.clamp(minRewardUsd, maxRewardUsd).toDouble();

    if (req.budget.remainingBudgetUsd < amountUsd) {
      return reject('insufficient_remaining_budget');
    }
    if (req.requireLockedCampaignBudgetReserve &&
        req.budget.reservedUsd + 1e-9 < amountUsd) {
      return reject('no_campaign_budget_reserve');
    }
    if (!req.dailyLimits.canAdd(amountUsd)) {
      return reject('daily_earning_cap');
    }

    final policy = _calc.trustPolicy(trust, tier);
    final holdForUnlock = policy.unlockWindow > Duration.zero;
    final status = !req.rules.asyncSettlement
        ? (holdForUnlock
            ? RewardIssuanceStatus.held
            : RewardIssuanceStatus.available)
        : RewardIssuanceStatus.pending;
    final holdReason = holdForUnlock
        ? 'unlock_window:${policy.unlockWindow.inSeconds}s'
        : null;

    final lotId = req.plannedValueLotId ?? next('lot');
    final lotStatus = switch (status) {
      RewardIssuanceStatus.rejected => ValueLotStatus.pending,
      RewardIssuanceStatus.pending => ValueLotStatus.pending,
      RewardIssuanceStatus.held => ValueLotStatus.held,
      RewardIssuanceStatus.available => ValueLotStatus.available,
    };

    final lot = ValueLot(
      lotId: lotId,
      decisionId: decisionId,
      userId: req.userId,
      campaignId: req.campaignId,
      attentionSessionId: req.attentionSessionId,
      amount: amountUsd,
      currency: req.rules.rewardCurrency,
      status: lotStatus,
    );

    final entries = <LedgerEntry>[
      LedgerEntry(
        entryId: next('le'),
        decisionId: decisionId,
        kind: IssuanceLedgerKind.campaignBudgetReserve,
        accountKey: 'campaign:${req.campaignId}:reserved',
        amount: amountUsd,
        currency: RewardCurrency.usd,
        metadata: req.idempotencyKey != null
            ? <String, String>{'idempotency': req.idempotencyKey!}
            : null,
      ),
      LedgerEntry(
        entryId: next('le'),
        decisionId: decisionId,
        kind: status == RewardIssuanceStatus.available
            ? IssuanceLedgerKind.rewardAvailableCredit
            : IssuanceLedgerKind.rewardPendingCredit,
        accountKey: 'user:${req.userId}:value_lots',
        amount: amountUsd,
        currency: req.rules.rewardCurrency,
        lotId: lotId,
      ),
    ];

    return RewardIssuanceOutcome(
      decision: RewardIssuanceDecision(
        decisionId: decisionId,
        userId: req.userId,
        campaignId: req.campaignId,
        attentionSessionId: req.attentionSessionId,
        approved: true,
        rewardAmount: amountUsd,
        rewardCurrency: req.rules.rewardCurrency,
        status: status,
        holdReason: holdReason,
        trustScoreAtIssuance: trust,
        fraudRiskAtIssuance: fraudRisk,
        createdAt: createdAt,
        policyVersionId: req.activePolicyVersionId,
      ),
      valueLots: <ValueLot>[lot],
      ledgerEntries: entries,
    );
  }

  double _combinedFraudRisk(RewardIssuanceRequest req) {
    if (req.fraudRiskOverride != null) {
      return req.fraudRiskOverride!.clamp(0.0, 1.0);
    }
    final fromAttention = req.attention.fraudRisk.clamp(0.0, 1.0);
    var bump = 0.0;
    if (req.fraudSignals.hasReplayPattern) bump += 0.15;
    if (req.fraudSignals.hasSpoofPattern) bump += 0.2;
    if (req.fraudSignals.hasVelocityViolation) bump += 0.1;
    if (!req.fraudSignals.noFraudFlags) bump += 0.15;
    return (fromAttention + bump).clamp(0.0, 1.0).toDouble();
  }
}

/// [AttentionVerificationResult.attentionScore] is 0–1 in the sealed path; rules use 0–100.
double _attentionScorePercent(AttentionVerificationResult a) {
  final s = a.attentionScore;
  return s <= 1.0 + 1e-9 ? s * 100.0 : s;
}

/// [AttentionVerificationResult.fraudRisk] is 0–1; rules use 0–100 “fraud score”.
double _fraudScorePercent(AttentionVerificationResult a) {
  final f = a.fraudRisk;
  return f <= 1.0 + 1e-9 ? f * 100.0 : f;
}

double _verifiedAttentionUnit(AttentionVerificationResult a) {
  final s = a.attentionScore;
  return s <= 1.0 + 1e-9 ? s : (s / 100.0).clamp(0.0, 1.0);
}
