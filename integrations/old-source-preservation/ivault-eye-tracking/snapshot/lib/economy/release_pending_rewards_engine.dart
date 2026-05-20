// §27.3 Release Pending Rewards — settlement worker shape for backend parity.
//
// Consumes: wallet value lots (pending + pending_until reached), trust_scores,
// fraud_flags (via injectable gates). Writes: lot state → available,
// wallet_ledger_entries (when [WalletLedgerEngine] holds a matching lot id),
// wallet_balance_projections (returned snapshots + balance.projected events),
// system_events (wallet.value_lot.available, wallet.ledger_entry.created).

import 'package:eye_tracking_app/canonical/build_spec_v01.dart';
import 'package:eye_tracking_app/policy_version.dart';
import 'package:eye_tracking_app/trust_engine.dart';
import 'package:eye_tracking_app/value_lot_engine.dart';
import 'package:eye_tracking_app/wallet_ledger_engine.dart';

/// Derived read-model row aligned with `wallet_balance_projection` (minor fields
/// omitted — USD demo path matches [WalletBalance]).
final class WalletBalanceProjectionV01 {
  const WalletBalanceProjectionV01({
    required this.walletId,
    required this.userId,
    required this.pendingUsd,
    required this.availableUsd,
    required this.lockedUsd,
    required this.withdrawnUsd,
    required this.projectedAt,
  });

  final String walletId;
  final String userId;
  final double pendingUsd;
  final double availableUsd;
  final double lockedUsd;
  final double withdrawnUsd;
  final String projectedAt;

  Map<String, Object?> toPayload() => {
        'walletId': walletId,
        'userId': userId,
        'pendingUsd': pendingUsd,
        'availableUsd': availableUsd,
        'lockedUsd': lockedUsd,
        'withdrawnUsd': withdrawnUsd,
        'projectedAt': projectedAt,
      };
}

/// One lot skipped with a machine reason (trust / fraud / not due / ledger miss).
final class PendingReleaseSkip {
  const PendingReleaseSkip({required this.lotId, required this.userId, required this.reason});

  final String lotId;
  final String userId;
  final String reason;
}

/// One successful pending → available transition.
final class PendingReleaseApplied {
  const PendingReleaseApplied({
    required this.lotId,
    required this.userId,
    required this.walletId,
    required this.amountUsd,
    this.ledgerEntryId,
  });

  final String lotId;
  final String userId;
  final String walletId;
  final double amountUsd;
  final String? ledgerEntryId;
}

final class ReleasePendingRewardsResult {
  const ReleasePendingRewardsResult({
    required this.events,
    required this.projections,
    required this.applied,
    required this.skipped,
  });

  final List<SystemEventV01> events;
  final List<WalletBalanceProjectionV01> projections;
  final List<PendingReleaseApplied> applied;
  final List<PendingReleaseSkip> skipped;
}

/// Trust + fraud inputs for §27.3 (caller loads from `trust_scores` / `fraud_flags`).
typedef TrustSnapshotLookup = TrustScoreSnapshot? Function(String userId);

/// When true, pending release is blocked for that user (e.g. open fraud hold).
typedef FraudReleaseBlocked = bool Function(String userId);

/// Maps economy user id → wallet id (often identical).
typedef WalletIdResolver = String Function(String userId);

/// §27.3 — scans [ValueLotEngine], applies gates, advances lots, syncs ledger.
final class ReleasePendingRewardsEngine {
  ReleasePendingRewardsEngine();

  int _eventSeq = 0;

  String _nextEventId(String prefix) {
    _eventSeq += 1;
    return '$prefix-$_eventSeq';
  }

  bool _pendingWindowReached(ValueLot lot, DateTime now) {
    if (lot.pendingUntil == null || lot.pendingUntil!.isEmpty) return true;
    try {
      final until = DateTime.parse(lot.pendingUntil!).toUtc();
      return !now.toUtc().isBefore(until);
    } catch (_) {
      return false;
    }
  }

  bool _trustAllows(TrustScoreSnapshot? snap) {
    if (snap == null) return true;
    return snap.level != TrustScoreLevel.restricted;
  }

  /// Runs one sweep. Idempotent for lots already non-pending.
  ReleasePendingRewardsResult run({
    required ValueLotEngine valueLots,
    required WalletLedgerEngine ledger,
    required DateTime now,
    TrustSnapshotLookup? trustSnapshot,
    FraudReleaseBlocked? fraudBlocksRelease,
    WalletIdResolver? walletIdForUser,
    String correlationId = 'release-pending-rewards',
    String actorId = 'release-pending-rewards',
  }) {
    final trust = trustSnapshot ?? (_) => null;
    final fraud = fraudBlocksRelease ?? (_) => false;
    final walletId = walletIdForUser ?? (String u) => u;

    final events = <SystemEventV01>[];
    final projections = <WalletBalanceProjectionV01>[];
    final applied = <PendingReleaseApplied>[];
    final skipped = <PendingReleaseSkip>[];

    final nowIso = now.toUtc().toIso8601String();
    final walletsTouched = <String>{};

    void push(SystemEventV01 e) => events.add(e);

    Iterable<ValueLot> candidates() sync* {
      for (final lot in valueLots.lots) {
        if (lot.state != ValueLotState.pending) continue;
        if (lot.currency != ValueLotCurrency.usd) continue;
        if (!_pendingWindowReached(lot, now)) continue;
        yield lot;
      }
    }

    for (final lot in candidates()) {
      final uid = lot.userId;
      final wid = walletId(uid);

      if (!_trustAllows(trust(uid))) {
        skipped.add(PendingReleaseSkip(lotId: lot.lotId, userId: uid, reason: 'trust_restricted'));
        continue;
      }
      if (fraud(uid)) {
        skipped.add(PendingReleaseSkip(lotId: lot.lotId, userId: uid, reason: 'fraud_hold'));
        continue;
      }

      final ledgerLot = ledger.lotById(lot.lotId);
      String? ledgerEntryId;
      double moveUsd = lot.remainingAmount;

      if (ledgerLot != null && ledgerLot.pendingUsd > 1e-12) {
        moveUsd = ledgerLot.pendingUsd;
        final res = ledger.releasePendingToAvailable(valueLotId: lot.lotId, now: now);
        if (!res.success) {
          skipped.add(
            PendingReleaseSkip(lotId: lot.lotId, userId: uid, reason: res.error ?? 'ledger_release_failed'),
          );
          continue;
        }
        final entries = ledger.ledgerEntries;
        ledgerEntryId = entries.isEmpty ? null : entries.last.id;
      }

      try {
        valueLots.tryReleasePending(lotId: lot.lotId, now: now);
      } on ValueLotEngineException catch (e) {
        skipped.add(PendingReleaseSkip(lotId: lot.lotId, userId: uid, reason: e.message));
        continue;
      }

      walletsTouched.add(wid);

      final policy = trust(uid)?.policyVersionId ?? kBootstrapPolicyVersionId;

      push(
        SystemEventV01(
          eventId: _nextEventId('evt'),
          eventType: CanonicalWalletEventTypesV01.valueLotAvailable,
          actorType: CanonicalActorTypeV01.system,
          actorId: actorId,
          subjectType: CanonicalSubjectTypeV01.valueLot,
          subjectId: lot.lotId,
          userId: uid,
          payload: <String, Object?>{
            'walletId': wid,
            'valueLotId': lot.lotId,
            'amountUsd': moveUsd,
            'correlationId': correlationId,
          },
          policyVersion: policy,
          correlationId: correlationId,
          createdAt: nowIso,
        ),
      );

      if (ledgerEntryId != null) {
        push(
          SystemEventV01(
            eventId: _nextEventId('evt'),
            eventType: CanonicalWalletEventTypesV01.ledgerEntryCreated,
            actorType: CanonicalActorTypeV01.system,
            actorId: actorId,
            subjectType: CanonicalSubjectTypeV01.ledgerEntry,
            subjectId: ledgerEntryId,
            userId: uid,
            payload: <String, Object?>{
              'walletId': wid,
              'ledgerEntryId': ledgerEntryId,
              'kind': 'pending_to_available',
              'valueLotId': lot.lotId,
              'amountUsd': moveUsd,
              'correlationId': correlationId,
            },
            policyVersion: policy,
            correlationId: correlationId,
            createdAt: nowIso,
          ),
        );
      }

      applied.add(
        PendingReleaseApplied(
          lotId: lot.lotId,
          userId: uid,
          walletId: wid,
          amountUsd: moveUsd,
          ledgerEntryId: ledgerEntryId,
        ),
      );
    }

    final walletUserId = <String, String>{};
    for (final a in applied) {
      walletUserId[a.walletId] = a.userId;
    }

    for (final wid in walletsTouched) {
      final bal = ledger.balanceForWallet(wid);
      final uid = walletUserId[wid] ?? wid;
      final proj = WalletBalanceProjectionV01(
        walletId: wid,
        userId: uid,
        pendingUsd: bal.pendingUsd,
        availableUsd: bal.availableUsd,
        lockedUsd: bal.lockedUsd,
        withdrawnUsd: bal.withdrawnUsd,
        projectedAt: nowIso,
      );
      projections.add(proj);

      push(
        SystemEventV01(
          eventId: _nextEventId('evt'),
          eventType: CanonicalWalletEventTypesV01.balanceProjected,
          actorType: CanonicalActorTypeV01.system,
          actorId: actorId,
          subjectType: CanonicalSubjectTypeV01.wallet,
          subjectId: wid,
          userId: uid,
          payload: proj.toPayload()..['correlationId'] = correlationId,
          policyVersion: trust(uid)?.policyVersionId ?? kBootstrapPolicyVersionId,
          correlationId: correlationId,
          createdAt: nowIso,
        ),
      );
    }

    return ReleasePendingRewardsResult(
      events: events,
      projections: projections,
      applied: applied,
      skipped: skipped,
    );
  }
}
