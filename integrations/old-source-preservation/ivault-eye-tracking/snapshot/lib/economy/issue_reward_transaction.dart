// §27.2 Issue Reward — one atomic unit of work after verification.
//
// Consumes (read model): attention_verifications, campaigns, campaign_budget_accounts,
// trust_scores, fraud_flags — supplied via [RewardIssuanceRequest] + [IssueRewardReads].
//
// Writes (persistence batch): reward_candidates, budget_reservations, reward_decisions,
// wallet_value_lots, wallet_ledger_entries, wallet_balance_projections, system_events
// (+ campaign_budget_accounts row update).
//
// Callers map [IssueRewardPlannedTransaction] to SQL `BEGIN … COMMIT` using the same
// ordering as [IssueRewardMemoryStore.applyPlanned]; the in-memory applier proves
// rollback semantics for the Dart integration surface.

import 'dart:convert';
import 'dart:math';

import 'package:eye_tracking_app/canonical/build_spec_v01.dart';
import 'package:eye_tracking_app/reward_issuance_engine.dart';

/// Stable UUID-shaped ids for one issuance attempt (generate v4 upstream).
final class IssueRewardStableIds {
  const IssueRewardStableIds({
    required this.rewardCandidateId,
    required this.rewardDecisionRowId,
    required this.decisionCorrelationId,
    required this.valueLotId,
    required this.budgetReservationId,
    required this.systemEventIds,
  });

  /// Row id for `reward_candidates`.
  final String rewardCandidateId;

  /// Primary key for `reward_decisions` (distinct from issuance engine decision id string).
  final String rewardDecisionRowId;

  /// Passed to [RewardIssuanceRequest.decisionId] and referenced as business id.
  final String decisionCorrelationId;

  final String valueLotId;
  final String budgetReservationId;

  /// One id per planned system_events row in order.
  final List<String> systemEventIds;

  /// Reserve enough ids for the longest branch (approved + wallet + 6 events).
  static IssueRewardStableIds generate({int systemEventCount = 10, Random? random}) {
    final r = random ?? Random.secure();
    String u() => _uuidV4(r);
    return IssueRewardStableIds(
      rewardCandidateId: u(),
      rewardDecisionRowId: u(),
      decisionCorrelationId: u(),
      valueLotId: u(),
      budgetReservationId: u(),
      systemEventIds: List<String>.generate(systemEventCount, (_) => u()),
    );
  }
}

String _uuidV4(Random r) {
  final b = List<int>.generate(16, (_) => r.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  final h = b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-'
      '${h.substring(16, 20)}-${h.substring(20, 32)}';
}

/// Authoritative campaign budget row (minor units) — read in the same DB txn as issue.
final class IssueRewardBudgetAccountRead {
  const IssueRewardBudgetAccountRead({
    required this.campaignId,
    required this.currencyWire,
    required this.fundedMinor,
    required this.reservedMinor,
    required this.spentMinor,
  });

  final String campaignId;
  final String currencyWire;
  final int fundedMinor;
  final int reservedMinor;
  final int spentMinor;

  int get availableMinor => fundedMinor - reservedMinor - spentMinor;
}

/// Inputs for planning §27.2 (verification PK + issuance + wallet + stable ids).
final class IssueRewardTransactionInput {
  const IssueRewardTransactionInput({
    required this.verificationId,
    required this.issuanceRequest,
    required this.walletId,
    required this.budgetAccount,
    required this.ids,
    this.requireLockedCampaignBudgetReserve = false,
  });

  final String verificationId;
  final RewardIssuanceRequest issuanceRequest;
  final String walletId;
  final IssueRewardBudgetAccountRead budgetAccount;
  final IssueRewardStableIds ids;

  /// When true, matches [RewardIssuanceRequest.requireLockedCampaignBudgetReserve].
  final bool requireLockedCampaignBudgetReserve;
}

int usdToMinor(double usd) {
  if (usd <= 0) return 0;
  return max(1, (usd * 100).round());
}

String _currencyWire(RewardCurrency c) => c.wireName;

String _candidateEligibilityWire({
  required bool approved,
  required RewardIssuanceStatus status,
}) {
  if (!approved) return 'ineligible';
  if (status == RewardIssuanceStatus.held) return 'eligible';
  return 'eligible';
}

String _decisionWire({
  required bool approved,
  required RewardIssuanceStatus status,
}) {
  if (!approved) return 'rejected';
  if (status == RewardIssuanceStatus.rejected) return 'rejected';
  if (status == RewardIssuanceStatus.held) return 'held';
  return 'approved';
}

String? _initialStatusWire(RewardIssuanceStatus s) {
  return switch (s) {
    RewardIssuanceStatus.rejected => null,
    RewardIssuanceStatus.pending => 'pending',
    RewardIssuanceStatus.held => 'held',
    RewardIssuanceStatus.available => 'available',
  };
}

/// Planned row for `reward_candidates`.
final class RewardCandidateRow {
  const RewardCandidateRow({
    required this.id,
    required this.userId,
    required this.campaignId,
    required this.verificationId,
    required this.expectedAmountMinor,
    required this.currencyWire,
    required this.eligibilityStatus,
    required this.reason,
    required this.policyVersion,
    required this.idempotencyKey,
  });

  final String id;
  final String userId;
  final String campaignId;
  final String verificationId;
  final int expectedAmountMinor;
  final String currencyWire;
  final String eligibilityStatus;
  final String? reason;
  final String policyVersion;
  final String idempotencyKey;
}

/// Planned row for `budget_reservations` (only when approved with positive amount).
final class BudgetReservationRow {
  const BudgetReservationRow({
    required this.id,
    required this.campaignId,
    required this.userId,
    required this.rewardCandidateId,
    required this.amountMinor,
    required this.currencyWire,
    required this.status,
    required this.expiresAtIso,
    required this.idempotencyKey,
  });

  final String id;
  final String campaignId;
  final String userId;
  final String rewardCandidateId;
  final int amountMinor;
  final String currencyWire;
  final String status;
  final String expiresAtIso;
  final String idempotencyKey;
}

/// Planned row for `reward_decisions`.
final class RewardDecisionRow {
  const RewardDecisionRow({
    required this.id,
    required this.rewardCandidateId,
    required this.userId,
    required this.campaignId,
    required this.verificationId,
    required this.decision,
    required this.amountMinor,
    required this.currencyWire,
    required this.budgetReservationId,
    required this.initialStatus,
    required this.rejectionReason,
    required this.holdReason,
    required this.trustScoreAtIssuance,
    required this.fraudRiskAtIssuance,
    required this.policyVersion,
    required this.idempotencyKey,
  });

  final String id;
  final String rewardCandidateId;
  final String userId;
  final String campaignId;
  final String verificationId;
  final String decision;
  final int amountMinor;
  final String currencyWire;
  final String? budgetReservationId;
  final String? initialStatus;
  final String? rejectionReason;
  final String? holdReason;
  final double trustScoreAtIssuance;
  final double fraudRiskAtIssuance;
  final String policyVersion;
  final String idempotencyKey;
}

/// Update applied to `campaign_budget_accounts` in the same txn as issuance.
final class CampaignBudgetAccountUpdate {
  const CampaignBudgetAccountUpdate({
    required this.campaignId,
    required this.addSpentMinor,
    required this.addReservedMinor,
  });

  final String campaignId;
  final int addSpentMinor;
  final int addReservedMinor;
}

/// Planned `wallet_value_lots` row.
final class WalletValueLotRow {
  const WalletValueLotRow({
    required this.id,
    required this.walletId,
    required this.userId,
    required this.sourceId,
    required this.originalAmountMinor,
    required this.remainingAmountMinor,
    required this.currencyWire,
    required this.state,
    required this.idempotencyKey,
  });

  final String id;
  final String walletId;
  final String userId;
  final String sourceId;
  final int originalAmountMinor;
  final int remainingAmountMinor;
  final String currencyWire;
  final String state;
  final String idempotencyKey;
}

/// Planned `wallet_ledger_entries` row.
final class WalletLedgerEntryRow {
  const WalletLedgerEntryRow({
    required this.id,
    required this.walletId,
    required this.userId,
    required this.valueLotId,
    required this.entryType,
    required this.amountMinor,
    required this.currencyWire,
    required this.direction,
    required this.balanceBucket,
    required this.sourceEventId,
    required this.idempotencyKey,
  });

  final String id;
  final String walletId;
  final String userId;
  final String? valueLotId;
  final String entryType;
  final int amountMinor;
  final String currencyWire;
  final String direction;
  final String balanceBucket;
  final String? sourceEventId;
  final String idempotencyKey;
}

/// Upsert patch for `wallet_balance_projections`.
final class WalletBalanceProjectionPatch {
  const WalletBalanceProjectionPatch({
    required this.walletId,
    required this.userId,
    required this.currencyWire,
    required this.deltaPendingMinor,
    required this.deltaAvailableMinor,
    required this.lastLedgerEntryId,
  });

  final String walletId;
  final String userId;
  final String currencyWire;
  final int deltaPendingMinor;
  final int deltaAvailableMinor;
  final String lastLedgerEntryId;
}

/// Minimal `system_events` row for append-only log.
final class SystemEventRow {
  const SystemEventRow({
    required this.id,
    required this.eventType,
    required this.actorType,
    required this.actorId,
    required this.subjectType,
    required this.subjectId,
    required this.userId,
    required this.campaignId,
    required this.sessionId,
    required this.payload,
    required this.policyVersion,
    required this.idempotencyKey,
    required this.correlationId,
  });

  final String id;
  final String eventType;
  final String actorType;
  final String? actorId;
  final String subjectType;
  final String subjectId;
  final String? userId;
  final String? campaignId;
  final String? sessionId;
  final Map<String, Object?> payload;
  final String? policyVersion;
  final String? idempotencyKey;
  final String? correlationId;
}

/// Immutable result of planning §27.2.
final class IssueRewardPlannedTransaction {
  const IssueRewardPlannedTransaction({
    required this.outcome,
    required this.rewardCandidate,
    required this.budgetReservation,
    required this.rewardDecision,
    required this.budgetAccountUpdate,
    required this.walletValueLots,
    required this.walletLedgerEntries,
    required this.balancePatches,
    required this.systemEvents,
    this.planError,
  });

  final RewardIssuanceOutcome outcome;
  final RewardCandidateRow rewardCandidate;
  final BudgetReservationRow? budgetReservation;
  final RewardDecisionRow rewardDecision;
  final CampaignBudgetAccountUpdate? budgetAccountUpdate;
  final List<WalletValueLotRow> walletValueLots;
  final List<WalletLedgerEntryRow> walletLedgerEntries;
  final List<WalletBalanceProjectionPatch> balancePatches;
  final List<SystemEventRow> systemEvents;

  /// Set when budget account cannot cover an approved decision (defense in depth).
  final String? planError;

  bool get isSuccess => planError == null;
}

/// Plans §27.2 writes from consumed read models + [RewardIssuanceEngine].
final class IssueRewardTransactionPlanner {
  IssueRewardTransactionPlanner({RewardIssuanceEngine? issuance})
      : _issuance = issuance ?? RewardIssuanceEngine();

  final RewardIssuanceEngine _issuance;

  IssueRewardPlannedTransaction plan(IssueRewardTransactionInput in_) {
    final rng = Random.secure();
    final req = RewardIssuanceRequest(
      userId: in_.issuanceRequest.userId,
      campaignId: in_.issuanceRequest.campaignId,
      attentionSessionId: in_.issuanceRequest.attentionSessionId,
      attention: in_.issuanceRequest.attention,
      rules: in_.issuanceRequest.rules,
      budget: in_.issuanceRequest.budget,
      trustScore: in_.issuanceRequest.trustScore,
      fraudSignals: in_.issuanceRequest.fraudSignals,
      duplicateClaim: in_.issuanceRequest.duplicateClaim,
      dailyLimits: in_.issuanceRequest.dailyLimits,
      eligibility: in_.issuanceRequest.eligibility,
      now: in_.issuanceRequest.now,
      activePolicyVersionId: in_.issuanceRequest.activePolicyVersionId,
      fraudRiskOverride: in_.issuanceRequest.fraudRiskOverride,
      decisionId: in_.ids.decisionCorrelationId,
      idempotencyKey: in_.issuanceRequest.idempotencyKey,
      requireLockedCampaignBudgetReserve: in_.requireLockedCampaignBudgetReserve,
      plannedValueLotId: in_.ids.valueLotId,
    );

    final outcome = _issuance.decide(req);
    final d = outcome.decision;
    final cur = _currencyWire(d.rewardCurrency);
    final idem =
        in_.issuanceRequest.idempotencyKey?.trim().isNotEmpty == true
            ? in_.issuanceRequest.idempotencyKey!.trim()
            : 'issue-reward:${in_.verificationId}:${in_.ids.decisionCorrelationId}';

    final expectedMinor = d.approved
        ? usdToMinor(d.rewardAmount)
        : 1;

    final candidate = RewardCandidateRow(
      id: in_.ids.rewardCandidateId,
      userId: d.userId,
      campaignId: d.campaignId,
      verificationId: in_.verificationId,
      expectedAmountMinor: expectedMinor,
      currencyWire: cur,
      eligibilityStatus: _candidateEligibilityWire(
        approved: d.approved,
        status: d.status,
      ),
      reason: d.approved ? null : d.rejectionReason,
      policyVersion: d.policyVersionId,
      idempotencyKey: '$idem:candidate',
    );

    BudgetReservationRow? reservation;
    CampaignBudgetAccountUpdate? budgetUpd;
    final walletLots = <WalletValueLotRow>[];
    final ledgerRows = <WalletLedgerEntryRow>[];
    final patches = <WalletBalanceProjectionPatch>[];
    final events = <SystemEventRow>[];
    var evtIdx = 0;
    String nextEvtId() {
      if (evtIdx >= in_.ids.systemEventIds.length) {
        throw StateError(
          'IssueRewardStableIds.systemEventIds too small: need > $evtIdx',
        );
      }
      return in_.ids.systemEventIds[evtIdx++];
    }

    String? planError;

    if (d.approved) {
      final amountMinor = usdToMinor(d.rewardAmount);
      if (in_.budgetAccount.availableMinor < amountMinor) {
        planError = 'campaign_budget_insufficient_available';
      } else {
        reservation = BudgetReservationRow(
          id: in_.ids.budgetReservationId,
          campaignId: d.campaignId,
          userId: d.userId,
          rewardCandidateId: candidate.id,
          amountMinor: amountMinor,
          currencyWire: cur,
          status: 'captured',
          expiresAtIso: in_.issuanceRequest.now.toUtc().add(const Duration(days: 1)).toIso8601String(),
          idempotencyKey: '$idem:reserve',
        );
        budgetUpd = CampaignBudgetAccountUpdate(
          campaignId: in_.budgetAccount.campaignId,
          addSpentMinor: amountMinor,
          addReservedMinor: 0,
        );

        final lotState = switch (d.status) {
          RewardIssuanceStatus.available => 'available',
          RewardIssuanceStatus.held => 'pending',
          RewardIssuanceStatus.pending => 'pending',
          RewardIssuanceStatus.rejected => 'pending',
        };
        final remaining = amountMinor;
        walletLots.add(
          WalletValueLotRow(
            id: in_.ids.valueLotId,
            walletId: in_.walletId,
            userId: d.userId,
            sourceId: d.decisionId,
            originalAmountMinor: amountMinor,
            remainingAmountMinor: remaining,
            currencyWire: cur,
            state: lotState,
            idempotencyKey: '$idem:lot',
          ),
        );

        events.add(
          SystemEventRow(
            id: nextEvtId(),
            eventType: CanonicalRewardEventTypesV01.candidateCreated,
            actorType: CanonicalActorTypeV01.system.wireName,
            actorId: null,
            subjectType: 'reward_candidate',
            subjectId: candidate.id,
            userId: d.userId,
            campaignId: d.campaignId,
            sessionId: d.attentionSessionId,
            payload: {
              'rewardCandidateId': candidate.id,
              'verificationId': in_.verificationId,
              'expectedAmountMinor': expectedMinor,
              'currency': cur,
            },
            policyVersion: d.policyVersionId,
            idempotencyKey: candidate.idempotencyKey,
            correlationId: in_.ids.decisionCorrelationId,
          ),
        );

        events.add(
          SystemEventRow(
            id: nextEvtId(),
            eventType: CanonicalBudgetEventTypesV01.reservationCaptured,
            actorType: CanonicalActorTypeV01.system.wireName,
            actorId: null,
            subjectType: CanonicalSubjectTypeV01.budgetReservation.wireName,
            subjectId: reservation.id,
            userId: d.userId,
            campaignId: d.campaignId,
            sessionId: d.attentionSessionId,
            payload: {
              'reservationId': reservation.id,
              'rewardCandidateId': candidate.id,
              'amountMinor': amountMinor,
            },
            policyVersion: d.policyVersionId,
            idempotencyKey: reservation.idempotencyKey,
            correlationId: in_.ids.decisionCorrelationId,
          ),
        );

        final decisionEvtType = switch (d.status) {
          RewardIssuanceStatus.held => CanonicalRewardEventTypesV01.decisionHeld,
          RewardIssuanceStatus.rejected => CanonicalRewardEventTypesV01.decisionRejected,
          _ => CanonicalRewardEventTypesV01.decisionApproved,
        };
        final decisionEvtId = nextEvtId();
        events.add(
          SystemEventRow(
            id: decisionEvtId,
            eventType: decisionEvtType,
            actorType: CanonicalActorTypeV01.system.wireName,
            actorId: null,
            subjectType: CanonicalSubjectTypeV01.rewardDecision.wireName,
            subjectId: in_.ids.rewardDecisionRowId,
            userId: d.userId,
            campaignId: d.campaignId,
            sessionId: d.attentionSessionId,
            payload: {
              'decisionId': d.decisionId,
              'amountMinor': amountMinor,
              'walletId': in_.walletId,
              'valueLotId': in_.ids.valueLotId,
              'status': d.status.wireName,
            },
            policyVersion: d.policyVersionId,
            idempotencyKey: '$idem:decision_evt',
            correlationId: in_.ids.decisionCorrelationId,
          ),
        );

        final leMintId = _uuidV4(rng);
        ledgerRows.add(
          WalletLedgerEntryRow(
            id: leMintId,
            walletId: in_.walletId,
            userId: d.userId,
            valueLotId: in_.ids.valueLotId,
            entryType: 'credit_pending',
            amountMinor: amountMinor,
            currencyWire: cur,
            direction: 'credit',
            balanceBucket: 'pending',
            sourceEventId: decisionEvtId,
            idempotencyKey: '$idem:le:mint',
          ),
        );

        if (d.status == RewardIssuanceStatus.available) {
          final leReleaseId = _uuidV4(rng);
          ledgerRows.add(
            WalletLedgerEntryRow(
              id: leReleaseId,
              walletId: in_.walletId,
              userId: d.userId,
              valueLotId: in_.ids.valueLotId,
              entryType: 'credit_available',
              amountMinor: amountMinor,
              currencyWire: cur,
              direction: 'credit',
              balanceBucket: 'available',
              sourceEventId: decisionEvtId,
              idempotencyKey: '$idem:le:release',
            ),
          );
          patches.add(
            WalletBalanceProjectionPatch(
              walletId: in_.walletId,
              userId: d.userId,
              currencyWire: cur,
              deltaPendingMinor: 0,
              deltaAvailableMinor: amountMinor,
              lastLedgerEntryId: leReleaseId,
            ),
          );
        } else {
          patches.add(
            WalletBalanceProjectionPatch(
              walletId: in_.walletId,
              userId: d.userId,
              currencyWire: cur,
              deltaPendingMinor: amountMinor,
              deltaAvailableMinor: 0,
              lastLedgerEntryId: leMintId,
            ),
          );
        }

        events.add(
          SystemEventRow(
            id: nextEvtId(),
            eventType: CanonicalWalletEventTypesV01.valueLotCreated,
            actorType: CanonicalActorTypeV01.system.wireName,
            actorId: null,
            subjectType: CanonicalSubjectTypeV01.valueLot.wireName,
            subjectId: in_.ids.valueLotId,
            userId: d.userId,
            campaignId: d.campaignId,
            sessionId: d.attentionSessionId,
            payload: {
              'valueLotId': in_.ids.valueLotId,
              'walletId': in_.walletId,
              'amountMinor': amountMinor,
              'state': lotState,
            },
            policyVersion: d.policyVersionId,
            idempotencyKey: '$idem:lot_evt',
            correlationId: in_.ids.decisionCorrelationId,
          ),
        );

        events.add(
          SystemEventRow(
            id: nextEvtId(),
            eventType: CanonicalWalletEventTypesV01.ledgerEntryCreated,
            actorType: CanonicalActorTypeV01.system.wireName,
            actorId: null,
            subjectType: CanonicalSubjectTypeV01.ledgerEntry.wireName,
            subjectId: ledgerRows.last.id,
            userId: d.userId,
            campaignId: d.campaignId,
            sessionId: d.attentionSessionId,
            payload: {'ledgerEntryId': ledgerRows.last.id},
            policyVersion: d.policyVersionId,
            idempotencyKey: '$idem:le_evt',
            correlationId: in_.ids.decisionCorrelationId,
          ),
        );

        events.add(
          SystemEventRow(
            id: nextEvtId(),
            eventType: CanonicalWalletEventTypesV01.balanceProjected,
            actorType: CanonicalActorTypeV01.system.wireName,
            actorId: null,
            subjectType: CanonicalSubjectTypeV01.wallet.wireName,
            subjectId: in_.walletId,
            userId: d.userId,
            campaignId: d.campaignId,
            sessionId: d.attentionSessionId,
            payload: {
              'walletId': in_.walletId,
              'currency': cur,
              'deltaPendingMinor': patches.last.deltaPendingMinor,
              'deltaAvailableMinor': patches.last.deltaAvailableMinor,
            },
            policyVersion: d.policyVersionId,
            idempotencyKey: '$idem:proj_evt',
            correlationId: in_.ids.decisionCorrelationId,
          ),
        );
      }
    } else {
      events.add(
        SystemEventRow(
          id: nextEvtId(),
          eventType: CanonicalRewardEventTypesV01.candidateCreated,
          actorType: CanonicalActorTypeV01.system.wireName,
          actorId: null,
          subjectType: 'reward_candidate',
          subjectId: candidate.id,
          userId: d.userId,
          campaignId: d.campaignId,
          sessionId: d.attentionSessionId,
          payload: {
            'rewardCandidateId': candidate.id,
            'verificationId': in_.verificationId,
            'expectedAmountMinor': expectedMinor,
          },
          policyVersion: d.policyVersionId,
          idempotencyKey: candidate.idempotencyKey,
          correlationId: in_.ids.decisionCorrelationId,
        ),
      );
      events.add(
        SystemEventRow(
          id: nextEvtId(),
          eventType: CanonicalRewardEventTypesV01.decisionRejected,
          actorType: CanonicalActorTypeV01.system.wireName,
          actorId: null,
          subjectType: CanonicalSubjectTypeV01.rewardDecision.wireName,
          subjectId: in_.ids.rewardDecisionRowId,
          userId: d.userId,
          campaignId: d.campaignId,
          sessionId: d.attentionSessionId,
          payload: {
            'decisionId': d.decisionId,
            'rejectionReason': d.rejectionReason,
          },
          policyVersion: d.policyVersionId,
          idempotencyKey: '$idem:decision_evt',
          correlationId: in_.ids.decisionCorrelationId,
        ),
      );
    }

    if (planError != null && d.approved) {
      events
        ..clear()
        ..add(
          SystemEventRow(
            id: nextEvtId(),
            eventType: CanonicalRewardEventTypesV01.candidateCreated,
            actorType: CanonicalActorTypeV01.system.wireName,
            actorId: null,
            subjectType: 'reward_candidate',
            subjectId: candidate.id,
            userId: d.userId,
            campaignId: d.campaignId,
            sessionId: d.attentionSessionId,
            payload: {
              'rewardCandidateId': candidate.id,
              'verificationId': in_.verificationId,
              'planAborted': true,
              'reason': planError,
            },
            policyVersion: d.policyVersionId,
            idempotencyKey: '${candidate.idempotencyKey}:abort',
            correlationId: in_.ids.decisionCorrelationId,
          ),
        )
        ..add(
          SystemEventRow(
            id: nextEvtId(),
            eventType: CanonicalRewardEventTypesV01.decisionRejected,
            actorType: CanonicalActorTypeV01.system.wireName,
            actorId: null,
            subjectType: CanonicalSubjectTypeV01.rewardDecision.wireName,
            subjectId: in_.ids.rewardDecisionRowId,
            userId: d.userId,
            campaignId: d.campaignId,
            sessionId: d.attentionSessionId,
            payload: {
              'decisionId': d.decisionId,
              'rejectionReason': planError,
            },
            policyVersion: d.policyVersionId,
            idempotencyKey: '$idem:decision_abort_evt',
            correlationId: in_.ids.decisionCorrelationId,
          ),
        );
    }

    final candidateFinal = planError != null && d.approved
        ? RewardCandidateRow(
            id: candidate.id,
            userId: candidate.userId,
            campaignId: candidate.campaignId,
            verificationId: candidate.verificationId,
            expectedAmountMinor: candidate.expectedAmountMinor,
            currencyWire: candidate.currencyWire,
            eligibilityStatus: 'ineligible',
            reason: planError,
            policyVersion: candidate.policyVersion,
            idempotencyKey: candidate.idempotencyKey,
          )
        : candidate;

    final decisionRow = planError != null && d.approved
        ? RewardDecisionRow(
            id: in_.ids.rewardDecisionRowId,
            rewardCandidateId: candidateFinal.id,
            userId: d.userId,
            campaignId: d.campaignId,
            verificationId: in_.verificationId,
            decision: 'rejected',
            amountMinor: 0,
            currencyWire: cur,
            budgetReservationId: null,
            initialStatus: null,
            rejectionReason: planError,
            holdReason: null,
            trustScoreAtIssuance: d.trustScoreAtIssuance,
            fraudRiskAtIssuance: d.fraudRiskAtIssuance,
            policyVersion: d.policyVersionId,
            idempotencyKey: '$idem:decision',
          )
        : RewardDecisionRow(
            id: in_.ids.rewardDecisionRowId,
            rewardCandidateId: candidateFinal.id,
            userId: d.userId,
            campaignId: d.campaignId,
            verificationId: in_.verificationId,
            decision: _decisionWire(approved: d.approved, status: d.status),
            amountMinor: d.approved ? usdToMinor(d.rewardAmount) : 0,
            currencyWire: cur,
            budgetReservationId: reservation?.id,
            initialStatus: _initialStatusWire(d.status),
            rejectionReason: d.rejectionReason,
            holdReason: d.holdReason,
            trustScoreAtIssuance: d.trustScoreAtIssuance,
            fraudRiskAtIssuance: d.fraudRiskAtIssuance,
            policyVersion: d.policyVersionId,
            idempotencyKey: '$idem:decision',
          );

    return IssueRewardPlannedTransaction(
      outcome: outcome,
      rewardCandidate: candidateFinal,
      budgetReservation: planError != null ? null : reservation,
      rewardDecision: decisionRow,
      budgetAccountUpdate: planError != null ? null : budgetUpd,
      walletValueLots: planError != null ? const <WalletValueLotRow>[] : walletLots,
      walletLedgerEntries: planError != null ? const <WalletLedgerEntryRow>[] : ledgerRows,
      balancePatches: planError != null ? const <WalletBalanceProjectionPatch>[] : patches,
      systemEvents: events,
      planError: planError,
    );
  }
}

/// In-memory mirrors of §27.2 tables for tests / worker dry-runs.
final class IssueRewardMemoryStore {
  final Map<String, RewardCandidateRow> rewardCandidates = {};
  final Map<String, BudgetReservationRow> budgetReservations = {};
  final Map<String, RewardDecisionRow> rewardDecisions = {};
  final Map<String, WalletValueLotRow> walletValueLots = {};
  final Map<String, WalletLedgerEntryRow> walletLedgerEntries = {};
  final Map<String, SystemEventRow> systemEvents = {};
  final Map<String, Map<String, int>> balanceProjections = {};
  final Map<String, IssueRewardBudgetAccountRead> budgetAccounts = {};

  /// Apply [tx] in FK-safe order; rolls back this store on any failure.
  ///
  /// When [IssueRewardPlannedTransaction.planError] is set (engine approved but
  /// `campaign_budget_accounts` read disagrees), only candidate + decision +
  /// `system_events` rows are applied — no wallet or reservation mutations.
  void applyPlanned(IssueRewardPlannedTransaction tx, IssueRewardBudgetAccountRead accountRead) {
    if (tx.planError != null) {
      rewardCandidates[tx.rewardCandidate.id] = tx.rewardCandidate;
      rewardDecisions[tx.rewardDecision.id] = tx.rewardDecision;
      for (final e in tx.systemEvents) {
        systemEvents[e.id] = e;
      }
      budgetAccounts[accountRead.campaignId] = accountRead;
      return;
    }

    final rollbacks = <void Function()>[];

    void guard(void Function() apply, void Function() rollback) {
      apply();
      rollbacks.add(rollback);
    }

    void assertNoDuplicateKeys() {
      if (rewardCandidates.containsKey(tx.rewardCandidate.id)) {
        throw StateError('duplicate reward_candidate ${tx.rewardCandidate.id}');
      }
      if (rewardDecisions.containsKey(tx.rewardDecision.id)) {
        throw StateError('duplicate reward_decision ${tx.rewardDecision.id}');
      }
      final br = tx.budgetReservation;
      if (br != null && budgetReservations.containsKey(br.id)) {
        throw StateError('duplicate budget_reservation ${br.id}');
      }
      for (final lot in tx.walletValueLots) {
        if (walletValueLots.containsKey(lot.id)) {
          throw StateError('duplicate wallet_value_lot ${lot.id}');
        }
      }
      for (final le in tx.walletLedgerEntries) {
        if (walletLedgerEntries.containsKey(le.id)) {
          throw StateError('duplicate wallet_ledger_entry ${le.id}');
        }
      }
      for (final e in tx.systemEvents) {
        if (systemEvents.containsKey(e.id)) {
          throw StateError('duplicate system_event ${e.id}');
        }
      }
    }

    try {
      assertNoDuplicateKeys();
      budgetAccounts[accountRead.campaignId] = accountRead;

      guard(
        () => rewardCandidates[tx.rewardCandidate.id] = tx.rewardCandidate,
        () => rewardCandidates.remove(tx.rewardCandidate.id),
      );

      final r = tx.budgetReservation;
      if (r != null) {
        guard(
          () => budgetReservations[r.id] = r,
          () => budgetReservations.remove(r.id),
        );
      }

      guard(
        () => rewardDecisions[tx.rewardDecision.id] = tx.rewardDecision,
        () => rewardDecisions.remove(tx.rewardDecision.id),
      );

      final upd = tx.budgetAccountUpdate;
      if (upd != null) {
        final cur = budgetAccounts[upd.campaignId]!;
        guard(
          () {
            budgetAccounts[upd.campaignId] = IssueRewardBudgetAccountRead(
              campaignId: cur.campaignId,
              currencyWire: cur.currencyWire,
              fundedMinor: cur.fundedMinor,
              reservedMinor: cur.reservedMinor + upd.addReservedMinor,
              spentMinor: cur.spentMinor + upd.addSpentMinor,
            );
          },
          () => budgetAccounts[upd.campaignId] = cur,
        );
      }

      for (final lot in tx.walletValueLots) {
        guard(
          () => walletValueLots[lot.id] = lot,
          () => walletValueLots.remove(lot.id),
        );
      }

      for (final le in tx.walletLedgerEntries) {
        guard(
          () => walletLedgerEntries[le.id] = le,
          () => walletLedgerEntries.remove(le.id),
        );
      }

      for (final e in tx.systemEvents) {
        guard(
          () => systemEvents[e.id] = e,
          () => systemEvents.remove(e.id),
        );
      }

      for (final p in tx.balancePatches) {
        final key = '${p.walletId}|${p.currencyWire}';
        final prev = balanceProjections[key];
        guard(
          () {
            final base = prev ?? const {'pending': 0, 'available': 0};
            balanceProjections[key] = {
              'pending': (base['pending']! + p.deltaPendingMinor),
              'available': (base['available']! + p.deltaAvailableMinor),
            };
          },
          () {
            if (prev == null) {
              balanceProjections.remove(key);
            } else {
              balanceProjections[key] = prev;
            }
          },
        );
      }
    } catch (e) {
      for (final r in rollbacks.reversed) {
        r();
      }
      rethrow;
    }
  }

  /// JSON snapshot for outbox / replay fixtures.
  String snapshotJson() => jsonEncode({
        'rewardCandidates': rewardCandidates.map((k, v) => MapEntry(k, {
              'id': v.id,
              'verificationId': v.verificationId,
            })),
        'decisions': rewardDecisions.length,
        'reservations': budgetReservations.length,
        'lots': walletValueLots.length,
        'ledger': walletLedgerEntries.length,
        'events': systemEvents.length,
      });
}
