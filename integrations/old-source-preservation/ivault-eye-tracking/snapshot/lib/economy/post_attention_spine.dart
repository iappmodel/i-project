// Post-attention economy spine: issuance decision → wallet ledger (Rule 2) +
// canonical [SystemEventV01] stream for transport / replay.

import 'package:eye_tracking_app/canonical/build_spec_v01.dart';
import 'package:eye_tracking_app/reward_issuance_engine.dart';
import 'package:eye_tracking_app/wallet_ledger_engine.dart';

/// One run of verify → issue → ledger apply (+ optional domain events).
final class PostAttentionSpineResult {
  const PostAttentionSpineResult({
    required this.events,
    this.failureReason,
    this.duplicateSkipped = false,
    this.walletApplyMessage,
    this.decisionApproved = false,
  });

  final List<SystemEventV01> events;
  final String? failureReason;
  final bool duplicateSkipped;
  final String? walletApplyMessage;
  final bool decisionApproved;
}

/// Orchestrates [RewardIssuanceEngine] with [WalletLedgerEngine] (authoritative lots).
final class PostAttentionEconomySpine {
  PostAttentionEconomySpine({RewardIssuanceEngine? issuance})
      : _issuance = issuance ?? RewardIssuanceEngine();

  final RewardIssuanceEngine _issuance;
  final Set<String> _idempotencyApplied = <String>{};

  int _eventSeq = 0;

  String _nextEventId(String prefix) {
    _eventSeq += 1;
    return '$prefix-$_eventSeq';
  }

  /// Clears dedupe keys (e.g. new demo session).
  void resetIdempotency() => _idempotencyApplied.clear();

  /// Idempotent on [idempotencyKey] when non-null and non-empty.
  PostAttentionSpineResult run({
    required RewardIssuanceRequest issuanceRequest,
    required WalletLedgerEngine ledger,
    required String walletId,
    required String correlationId,
    String? idempotencyKey,
  }) {
    final trimmedKey = idempotencyKey?.trim();
    if (trimmedKey != null && trimmedKey.isNotEmpty) {
      if (_idempotencyApplied.contains(trimmedKey)) {
        return const PostAttentionSpineResult(
          events: <SystemEventV01>[],
          duplicateSkipped: true,
        );
      }
    }

    final events = <SystemEventV01>[];
    final nowIso = issuanceRequest.now.toUtc().toIso8601String();

    void push(SystemEventV01 e) {
      events.add(e);
    }

    final outcome = _issuance.decide(issuanceRequest);
    final d = outcome.decision;

    if (!d.approved) {
      push(
        SystemEventV01(
          eventId: _nextEventId('evt'),
          eventType: CanonicalEventTypesV01.attentionVerificationFailed,
          actorType: CanonicalActorTypeV01.system,
          actorId: 'economy-spine',
          subjectType: CanonicalSubjectTypeV01.rewardDecision,
          subjectId: d.decisionId,
          userId: d.userId,
          campaignId: d.campaignId,
          sessionId: issuanceRequest.attentionSessionId,
          payload: <String, Object?>{
            'decisionId': d.decisionId,
            'rejectionReason': d.rejectionReason,
            'correlationId': correlationId,
          },
          policyVersion: d.policyVersionId,
          correlationId: correlationId,
          createdAt: nowIso,
        ),
      );
      if (trimmedKey != null && trimmedKey.isNotEmpty) {
        _idempotencyApplied.add(trimmedKey);
      }
      return PostAttentionSpineResult(
        events: events,
        failureReason: d.rejectionReason,
        decisionApproved: false,
      );
    }

    final lotId = outcome.valueLots.isEmpty ? null : outcome.valueLots.single.lotId;
    if (lotId == null || lotId.isEmpty) {
      return PostAttentionSpineResult(
        events: events,
        failureReason: 'issuance_missing_value_lot',
        decisionApproved: true,
      );
    }

    final apply = ledger.issueCampaignReward(
      walletId: walletId,
      userId: d.userId,
      campaignId: d.campaignId,
      sourceCampaignEventId: d.decisionId,
      amountUsd: d.rewardAmount,
      now: issuanceRequest.now,
      forcedValueLotId: lotId,
    );

    if (!apply.success) {
      push(
        SystemEventV01(
          eventId: _nextEventId('evt'),
          eventType: CanonicalEventTypesV01.rewardReversed,
          actorType: CanonicalActorTypeV01.system,
          actorId: 'economy-spine',
          subjectType: CanonicalSubjectTypeV01.wallet,
          subjectId: walletId,
          userId: d.userId,
          campaignId: d.campaignId,
          sessionId: issuanceRequest.attentionSessionId,
          payload: <String, Object?>{
            'decisionId': d.decisionId,
            'walletError': apply.error,
            'correlationId': correlationId,
          },
          policyVersion: d.policyVersionId,
          correlationId: correlationId,
          createdAt: nowIso,
        ),
      );
      if (trimmedKey != null && trimmedKey.isNotEmpty) {
        _idempotencyApplied.add(trimmedKey);
      }
      return PostAttentionSpineResult(
        events: events,
        failureReason: apply.error,
        decisionApproved: true,
      );
    }

    if (d.status == RewardIssuanceStatus.available) {
      ledger.releasePendingToAvailable(valueLotId: lotId, now: issuanceRequest.now);
    }

    push(
      SystemEventV01(
        eventId: _nextEventId('evt'),
        eventType: CanonicalEventTypesV01.valueLotCreated,
        actorType: CanonicalActorTypeV01.system,
        actorId: 'economy-spine',
        subjectType: CanonicalSubjectTypeV01.valueLot,
        subjectId: lotId,
        userId: d.userId,
        campaignId: d.campaignId,
        sessionId: issuanceRequest.attentionSessionId,
        payload: <String, Object?>{
          'decisionId': d.decisionId,
          'amountUsd': d.rewardAmount,
          'correlationId': correlationId,
        },
        policyVersion: d.policyVersionId,
        idempotencyKey: trimmedKey,
        correlationId: correlationId,
        createdAt: nowIso,
      ),
    );

    push(
      SystemEventV01(
        eventId: _nextEventId('evt'),
        eventType: CanonicalEventTypesV01.rewardIssued,
        actorType: CanonicalActorTypeV01.system,
        actorId: 'economy-spine',
        subjectType: CanonicalSubjectTypeV01.rewardDecision,
        subjectId: d.decisionId,
        userId: d.userId,
        campaignId: d.campaignId,
        sessionId: issuanceRequest.attentionSessionId,
        payload: <String, Object?>{
          'walletId': walletId,
          'valueLotId': lotId,
          'amountUsd': d.rewardAmount,
          'status': d.status.wireName,
          'correlationId': correlationId,
        },
        policyVersion: d.policyVersionId,
        idempotencyKey: trimmedKey,
        correlationId: correlationId,
        createdAt: nowIso,
      ),
    );

    if (trimmedKey != null && trimmedKey.isNotEmpty) {
      _idempotencyApplied.add(trimmedKey);
    }

    return PostAttentionSpineResult(
      events: events,
      walletApplyMessage: apply.message,
      decisionApproved: true,
    );
  }
}
