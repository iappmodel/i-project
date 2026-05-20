import 'dart:math' as math;

import 'package:eye_tracking_app/core/events/system_event.dart';
import 'package:eye_tracking_app/core/events/wallet_event.dart';

/// Wallet Ledger Engine (2.3) — financial truth via append-only ledger + value lots.
///
/// **Money-adjacent unit of work** (mirrors one DB transaction) must, in order:
/// 1. Mutate or create [ValueLot] rows (source-tracked buckets — never `balance += reward`).
/// 2. Append matching [LedgerEntry] rows (immutable history / provenance).
/// 3. Refresh [WalletBalanceProjection] for the wallet ([projectionForWallet]) — cached UI/read model.
/// 4. Optionally notify [WalletAccountingSink] with [WalletEvent]s + [SystemJobCompletedEvent]
///    ([SystemJobType.walletProjection]) for bus / `system_event` persistence.
///
/// Rules:
/// - **Rule 2:** No wallet balance is manually edited; [WalletBalance] is always
///   derived from [ValueLot] rows (which change only via commands that append
///   [LedgerEntry] rows).
/// - **Rule 4:** No withdrawal from pending value — only [ValueLot.availableUsd]
///   may be locked for payout; [requestWithdrawal] requires sufficient aggregate
///   [WalletBalance.availableUsd] and never debits [ValueLot.pendingUsd].
/// - Every reward creates a [ValueLot].
/// - Every balance movement creates a [LedgerEntry].
/// - **Rule 8:** fraud/policy delays and reversals that move USD between buckets (e.g. lock,
///   settle, clawback when modeled here) must appear as [LedgerEntry] rows — no silent erasure.
/// - Pending / available / locked / withdrawn are partition buckets on each lot.
/// - No destructive balance edits (only structural updates via engine commands).
/// - No campaign reward without non-empty [campaignId] and [sourceCampaignEventId].

// CLIENT SIMULATION / NON-AUTHORITATIVE
// This module is for client-side preview/simulation UX only.
// It must not be treated as the canonical writer for economy, wallet, trust, fraud, campaign, or POPS economic state.
// Backend/API source-of-truth ownership is documented in:
// docs/source-of-truth-ownership-contract.md
// docs/runtime-wiring-matrix.md

// --- Core objects ---

/// How value moved between buckets or entered the system.
enum LedgerEntryKind {
  /// Initial campaign reward: mints pending on a new [ValueLot].
  rewardPendingMint,

  /// Pending → available (e.g. verification / time unlock).
  pendingToAvailable,

  /// Available → locked (e.g. withdrawal hold).
  availableToLocked,

  /// Locked → available (e.g. withdrawal cancel).
  lockedToAvailable,

  /// Locked → withdrawn (payout completed).
  lockedToWithdrawn,

  /// Available → withdrawn (direct settle without intermediate lock; optional path).
  availableToWithdrawn,

  /// Conversion: reduce available on source lot(s).
  conversionSourceDebit,

  /// Conversion: credit new lot (typically pending or available per policy).
  conversionDestinationCredit,
}

/// Single immutable ledger row (append-only).
final class LedgerEntry {
  const LedgerEntry({
    required this.id,
    required this.walletId,
    required this.userId,
    required this.kind,
    required this.amountUsd,
    required this.valueLotId,
    required this.referenceType,
    required this.referenceId,
    required this.createdAt,
  });

  final String id;
  final String walletId;
  final String userId;
  final LedgerEntryKind kind;
  /// Always non-negative; direction is in [kind].
  final double amountUsd;
  final String valueLotId;
  final String referenceType;
  final String referenceId;
  final DateTime createdAt;
}

/// One tranche of value tied to a campaign-backed reward or conversion.
final class ValueLot {
  const ValueLot({
    required this.id,
    required this.walletId,
    required this.userId,
    required this.campaignId,
    required this.sourceCampaignEventId,
    required this.originalUsd,
    required this.pendingUsd,
    required this.availableUsd,
    required this.lockedUsd,
    required this.withdrawnUsd,
    required this.createdAt,
  });

  final String id;
  final String walletId;
  final String userId;

  /// Empty string allowed only for non-campaign lots (e.g. conversion children).
  final String campaignId;

  /// Stable id tying this lot to an originating business event (reward id, etc.).
  final String sourceCampaignEventId;

  final double originalUsd;
  final double pendingUsd;
  final double availableUsd;
  final double lockedUsd;
  final double withdrawnUsd;
  final DateTime createdAt;

  bool get _partitionOk {
    final sum = pendingUsd + availableUsd + lockedUsd + withdrawnUsd;
    return (sum - originalUsd).abs() < 1e-9 && originalUsd >= -1e-9;
  }

  ValueLot copyWith({
    double? originalUsd,
    double? pendingUsd,
    double? availableUsd,
    double? lockedUsd,
    double? withdrawnUsd,
  }) {
    final next = ValueLot(
      id: id,
      walletId: walletId,
      userId: userId,
      campaignId: campaignId,
      sourceCampaignEventId: sourceCampaignEventId,
      originalUsd: originalUsd ?? this.originalUsd,
      pendingUsd: pendingUsd ?? this.pendingUsd,
      availableUsd: availableUsd ?? this.availableUsd,
      lockedUsd: lockedUsd ?? this.lockedUsd,
      withdrawnUsd: withdrawnUsd ?? this.withdrawnUsd,
      createdAt: createdAt,
    );
    assert(next._partitionOk, 'ValueLot partition must sum to originalUsd');
    return next;
  }
}

/// Aggregated balances for one wallet — always derived from [ValueLot]s.
final class WalletBalance {
  const WalletBalance({
    required this.walletId,
    required this.pendingUsd,
    required this.availableUsd,
    required this.lockedUsd,
    required this.withdrawnUsd,
  });

  final String walletId;
  final double pendingUsd;
  final double availableUsd;
  final double lockedUsd;
  final double withdrawnUsd;

  double get totalUsd => pendingUsd + availableUsd + lockedUsd + withdrawnUsd;
}

/// Cached read model for UI / APIs — **must** be updated in the same logical
/// transaction as new [ValueLot] rows and [LedgerEntry] rows (never `balance += x`).
///
/// [spentUsd] is reserved for in-app debits not modeled as withdrawals; the
/// bucketed [ValueLot] USD partition uses [WalletBalance] fields for pending /
/// available / locked / withdrawn.
final class WalletBalanceProjection {
  const WalletBalanceProjection({
    required this.walletId,
    required this.pendingUsd,
    required this.availableUsd,
    required this.lockedUsd,
    required this.withdrawnUsd,
    required this.spentUsd,
    required this.updatedAt,
    required this.lastLedgerEntryId,
  });

  final String walletId;
  final double pendingUsd;
  final double availableUsd;
  final double lockedUsd;
  final double withdrawnUsd;
  final double spentUsd;
  final DateTime updatedAt;

  /// Ledger line that triggered this projection refresh (audit anchor).
  final String lastLedgerEntryId;

  double get totalUsd => pendingUsd + availableUsd + lockedUsd + withdrawnUsd + spentUsd;
}

/// One sealed money-adjacent unit: value lots + ledger lines + projection + bus facts.
final class WalletAccountingEmission {
  const WalletAccountingEmission({
    required this.walletEvents,
    required this.systemEvent,
  });

  final List<WalletEvent> walletEvents;
  final SystemEvent systemEvent;
}

typedef WalletAccountingSink = void Function(WalletAccountingEmission emission);

enum WithdrawalRequestStatus { requested, completed, cancelled }

/// Withdrawal lifecycle; amounts are backed by locked slices on lots.
final class WithdrawalRequest {
  const WithdrawalRequest({
    required this.id,
    required this.walletId,
    required this.userId,
    required this.amountUsd,
    required this.status,
    required this.lotAllocations,
    required this.createdAt,
  });

  final String id;
  final String walletId;
  final String userId;
  final double amountUsd;
  final WithdrawalRequestStatus status;

  /// lotId → locked amount for this withdrawal.
  final Map<String, double> lotAllocations;
  final DateTime createdAt;

  WithdrawalRequest copyWith({
    WithdrawalRequestStatus? status,
    Map<String, double>? lotAllocations,
  }) {
    return WithdrawalRequest(
      id: id,
      walletId: walletId,
      userId: userId,
      amountUsd: amountUsd,
      status: status ?? this.status,
      lotAllocations: lotAllocations ?? this.lotAllocations,
      createdAt: createdAt,
    );
  }
}

enum ConversionTransactionStatus { posted, reversed }

/// Records a conversion from source lot(s) into a destination lot.
final class ConversionTransaction {
  const ConversionTransaction({
    required this.id,
    required this.walletId,
    required this.userId,
    required this.sourceLotId,
    required this.destinationLotId,
    required this.amountUsd,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String walletId;
  final String userId;
  final String sourceLotId;
  final String destinationLotId;
  final double amountUsd;
  final ConversionTransactionStatus status;
  final DateTime createdAt;
}

// --- Engine ---

final class WalletLedgerApplyResult {
  const WalletLedgerApplyResult.ok(this.message, {this.withdrawalId, this.conversionId})
    : error = null,
      success = true;
  const WalletLedgerApplyResult.fail(this.error)
    : message = null,
      success = false,
      withdrawalId = null,
      conversionId = null;

  final bool success;
  final String? message;
  final String? error;
  final String? withdrawalId;
  final String? conversionId;
}

final class WalletLedgerEngine {
  WalletLedgerEngine({WalletAccountingSink? onAccounting}) : _onAccounting = onAccounting;

  final WalletAccountingSink? _onAccounting;

  final List<LedgerEntry> _ledger = <LedgerEntry>[];
  final Map<String, ValueLot> _lots = <String, ValueLot>{};
  final Map<String, WithdrawalRequest> _withdrawals = <String, WithdrawalRequest>{};
  final Map<String, ConversionTransaction> _conversions =
      <String, ConversionTransaction>{};
  final Map<String, WalletBalanceProjection> _projections = <String, WalletBalanceProjection>{};

  int _seq = 0;
  int _jobSeq = 0;

  String _nextId(String prefix) {
    _seq += 1;
    return '$prefix-${_seq.toString().padLeft(8, '0')}';
  }

  String _nextJobId() {
    _jobSeq += 1;
    return 'wallet-job-${_jobSeq.toString().padLeft(8, '0')}';
  }

  List<LedgerEntry> get ledgerEntries => List<LedgerEntry>.unmodifiable(_ledger);

  List<ValueLot> lotsForWallet(String walletId) => _lots.values
      .where((l) => l.walletId == walletId)
      .toList(growable: false);

  ValueLot? lotById(String id) => _lots[id];

  WithdrawalRequest? withdrawalById(String id) => _withdrawals[id];

  ConversionTransaction? conversionById(String id) => _conversions[id];

  /// Derived truth: sum of lot buckets for the wallet.
  WalletBalance balanceForWallet(String walletId) {
    var p = 0.0, a = 0.0, l = 0.0, w = 0.0;
    for (final lot in _lots.values) {
      if (lot.walletId != walletId) continue;
      p += lot.pendingUsd;
      a += lot.availableUsd;
      l += lot.lockedUsd;
      w += lot.withdrawnUsd;
    }
    return WalletBalance(
      walletId: walletId,
      pendingUsd: p,
      availableUsd: a,
      lockedUsd: l,
      withdrawnUsd: w,
    );
  }

  /// Cached projection for [walletId], if any ledger line has been posted for it.
  WalletBalanceProjection? projectionForWallet(String walletId) => _projections[walletId];

  /// True when [projectionForWallet] matches [balanceForWallet] (and [spentUsd] is zero).
  bool verifyProjectionMatchesLots(String walletId) {
    final p = _projections[walletId];
    if (p == null) return true;
    final b = balanceForWallet(walletId);
    return (p.pendingUsd - b.pendingUsd).abs() < 1e-9 &&
        (p.availableUsd - b.availableUsd).abs() < 1e-9 &&
        (p.lockedUsd - b.lockedUsd).abs() < 1e-9 &&
        (p.withdrawnUsd - b.withdrawnUsd).abs() < 1e-9 &&
        p.spentUsd.abs() < 1e-9;
  }

  WalletBalanceProjection _refreshProjection(
    String walletId,
    String ledgerEntryId,
    DateTime at,
  ) {
    final b = balanceForWallet(walletId);
    final proj = WalletBalanceProjection(
      walletId: walletId,
      pendingUsd: b.pendingUsd,
      availableUsd: b.availableUsd,
      lockedUsd: b.lockedUsd,
      withdrawnUsd: b.withdrawnUsd,
      spentUsd: 0,
      updatedAt: at,
      lastLedgerEntryId: ledgerEntryId,
    );
    _projections[walletId] = proj;
    return proj;
  }

  (WalletLedgerEntryType, WalletBalanceBucket) _wireForLedgerKind(LedgerEntryKind k) {
    return switch (k) {
      LedgerEntryKind.rewardPendingMint =>
        (WalletLedgerEntryType.creditPending, WalletBalanceBucket.pending),
      LedgerEntryKind.pendingToAvailable =>
        (WalletLedgerEntryType.creditAvailable, WalletBalanceBucket.available),
      LedgerEntryKind.availableToLocked =>
        (WalletLedgerEntryType.lock, WalletBalanceBucket.locked),
      LedgerEntryKind.lockedToAvailable =>
        (WalletLedgerEntryType.unlock, WalletBalanceBucket.available),
      LedgerEntryKind.lockedToWithdrawn =>
        (WalletLedgerEntryType.debitWithdrawal, WalletBalanceBucket.withdrawn),
      LedgerEntryKind.availableToWithdrawn =>
        (WalletLedgerEntryType.debitWithdrawal, WalletBalanceBucket.withdrawn),
      LedgerEntryKind.conversionSourceDebit =>
        (WalletLedgerEntryType.debitConversion, WalletBalanceBucket.available),
      LedgerEntryKind.conversionDestinationCredit =>
        (WalletLedgerEntryType.creditConversion, WalletBalanceBucket.available),
    };
  }

  WalletLedgerEntryCreatedEvent _ledgerCreatedEvent(LedgerEntry e) {
    final mapped = _wireForLedgerKind(e.kind);
    return WalletLedgerEntryCreatedEvent(
      ledgerEntryId: e.id,
      userId: e.userId,
      valueLotId: e.valueLotId,
      entryType: mapped.$1,
      amount: e.amountUsd,
      currency: WalletCurrency.usd,
      balanceBucket: mapped.$2,
      sourceEventId: e.referenceId,
    );
  }

  WalletBalanceProjectedEvent _balanceProjectedEvent(
    String userId,
    WalletBalanceProjection proj,
  ) {
    return WalletBalanceProjectedEvent(
      userId: userId,
      pending: proj.pendingUsd,
      available: proj.availableUsd,
      locked: proj.lockedUsd,
      withdrawn: proj.withdrawnUsd,
      spent: proj.spentUsd,
      currency: WalletCurrency.usd,
      ledgerEntryId: proj.lastLedgerEntryId,
    );
  }

  void _emitAccounting(
    List<WalletEvent> walletEvents,
    int processedLedgerLines,
    DateTime now,
  ) {
    final sink = _onAccounting;
    if (sink == null || walletEvents.isEmpty) return;
    sink(
      WalletAccountingEmission(
        walletEvents: List<WalletEvent>.unmodifiable(walletEvents),
        systemEvent: SystemJobCompletedEvent(
          jobId: _nextJobId(),
          jobType: SystemJobType.walletProjection.wireValue,
          processedCount: processedLedgerLines,
          failedCount: 0,
          completedAt: now.toUtc().toIso8601String(),
        ),
      ),
    );
  }

  /// Append-only ledger row + projection refresh (no direct balance math).
  void _appendLedgerCore(LedgerEntry entry) {
    _ledger.add(entry);
    _refreshProjection(entry.walletId, entry.id, entry.createdAt);
  }

  /// Campaign reward: requires campaign + source event; creates [ValueLot] + ledger.
  ///
  /// When [forcedValueLotId] is set, that id is used for the new lot (must not exist).
  WalletLedgerApplyResult issueCampaignReward({
    required String walletId,
    required String userId,
    required String campaignId,
    required String sourceCampaignEventId,
    required double amountUsd,
    required DateTime now,
    String? forcedValueLotId,
  }) {
    if (campaignId.trim().isEmpty) {
      return const WalletLedgerApplyResult.fail(
        'No reward without source campaign (campaignId required).',
      );
    }
    if (sourceCampaignEventId.trim().isEmpty) {
      return const WalletLedgerApplyResult.fail(
        'No reward without source campaign (sourceCampaignEventId required).',
      );
    }
    if (amountUsd <= 0) {
      return const WalletLedgerApplyResult.fail('Reward amount must be positive.');
    }

    late final String lotId;
    if (forcedValueLotId != null) {
      final trimmed = forcedValueLotId.trim();
      if (trimmed.isEmpty) {
        return const WalletLedgerApplyResult.fail(
          'forcedValueLotId must be non-empty when set.',
        );
      }
      if (_lots.containsKey(trimmed)) {
        return WalletLedgerApplyResult.fail('ValueLot $trimmed already exists.');
      }
      lotId = trimmed;
    } else {
      lotId = _nextId('lot');
    }
    final lot = ValueLot(
      id: lotId,
      walletId: walletId,
      userId: userId,
      campaignId: campaignId,
      sourceCampaignEventId: sourceCampaignEventId,
      originalUsd: amountUsd,
      pendingUsd: amountUsd,
      availableUsd: 0,
      lockedUsd: 0,
      withdrawnUsd: 0,
      createdAt: now,
    );
    _lots[lotId] = lot;

    final le = LedgerEntry(
      id: _nextId('le'),
      walletId: walletId,
      userId: userId,
      kind: LedgerEntryKind.rewardPendingMint,
      amountUsd: amountUsd,
      valueLotId: lotId,
      referenceType: 'campaign_reward',
      referenceId: sourceCampaignEventId,
      createdAt: now,
    );
    _appendLedgerCore(le);

    _emitAccounting(
      [
        WalletValueLotCreatedEvent(
          valueLotId: lotId,
          userId: userId,
          sourceType: WalletValueLotSourceType.campaignReward,
          sourceId: sourceCampaignEventId,
          originalAmount: amountUsd,
          currency: WalletCurrency.usd,
          initialState: WalletValueLotInitialState.pending,
          trustScoreAtCreation: 0,
          fraudRiskAtCreation: 0,
        ),
        _ledgerCreatedEvent(le),
        _balanceProjectedEvent(userId, _projections[walletId]!),
      ],
      1,
      now,
    );

    return WalletLedgerApplyResult.ok('ValueLot $lotId minted in pending.');
  }

  WalletLedgerApplyResult releasePendingToAvailable({
    required String valueLotId,
    required DateTime now,
  }) {
    final lot = _lots[valueLotId];
    if (lot == null) {
      return WalletLedgerApplyResult.fail('Unknown ValueLot $valueLotId.');
    }
    final move = lot.pendingUsd;
    if (move <= 0) {
      return const WalletLedgerApplyResult.fail('No pending balance to release.');
    }

    final updated = lot.copyWith(
      pendingUsd: 0,
      availableUsd: lot.availableUsd + move,
    );
    _lots[valueLotId] = updated;

    final le = LedgerEntry(
      id: _nextId('le'),
      walletId: lot.walletId,
      userId: lot.userId,
      kind: LedgerEntryKind.pendingToAvailable,
      amountUsd: move,
      valueLotId: valueLotId,
      referenceType: 'value_lot',
      referenceId: valueLotId,
      createdAt: now,
    );
    _appendLedgerCore(le);

    _emitAccounting(
      [
        WalletValueLotAvailableEvent(
          valueLotId: valueLotId,
          userId: lot.userId,
          amount: move,
          currency: WalletCurrency.usd,
          availableAt: now.toUtc().toIso8601String(),
        ),
        _ledgerCreatedEvent(le),
        _balanceProjectedEvent(lot.userId, _projections[lot.walletId]!),
      ],
      1,
      now,
    );

    return const WalletLedgerApplyResult.ok('Pending moved to available.');
  }

  /// Reserves [amountUsd] from cleared available balance only (Rule 4 — not from
  /// pending). FIFO by lot [createdAt].
  WalletLedgerApplyResult requestWithdrawal({
    required String walletId,
    required String userId,
    required double amountUsd,
    required DateTime now,
  }) {
    if (amountUsd <= 0) {
      return const WalletLedgerApplyResult.fail('Withdrawal amount must be positive.');
    }
    final bal = balanceForWallet(walletId);
    if (bal.availableUsd + 1e-9 < amountUsd) {
      return const WalletLedgerApplyResult.fail(
        'Rule 4: only available value can be withdrawn; insufficient cleared balance.',
      );
    }

    final wid = _nextId('wd');
    var remaining = amountUsd;
    final allocations = <String, double>{};
    final orderedIds = _lots.values
        .where((l) => l.walletId == walletId)
        .toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));

    final accounting = <WalletEvent>[];
    var ledgerLines = 0;
    for (final snapshot in orderedIds) {
      if (remaining <= 1e-12) break;
      final lot = _lots[snapshot.id];
      if (lot == null) continue;
      final take = math.min(lot.availableUsd, remaining);
      if (take <= 1e-12) continue;

      allocations[lot.id] = take;
      final updated = lot.copyWith(
        availableUsd: lot.availableUsd - take,
        lockedUsd: lot.lockedUsd + take,
      );
      _lots[lot.id] = updated;

      final le = LedgerEntry(
        id: _nextId('le'),
        walletId: walletId,
        userId: userId,
        kind: LedgerEntryKind.availableToLocked,
        amountUsd: take,
        valueLotId: lot.id,
        referenceType: 'withdrawal_request',
        referenceId: wid,
        createdAt: now,
      );
      _appendLedgerCore(le);
      ledgerLines++;
      accounting
        ..add(
          WalletValueLotLockedEvent(
            valueLotId: lot.id,
            userId: userId,
            amount: take,
            currency: WalletCurrency.usd,
            reason: WalletValueLotLockReason.withdrawalHold,
          ),
        )
        ..add(_ledgerCreatedEvent(le));
      remaining -= take;
    }

    final request = WithdrawalRequest(
      id: wid,
      walletId: walletId,
      userId: userId,
      amountUsd: amountUsd,
      status: WithdrawalRequestStatus.requested,
      lotAllocations: Map<String, double>.unmodifiable(allocations),
      createdAt: now,
    );
    _withdrawals[wid] = request;

    if (ledgerLines > 0) {
      accounting.add(_balanceProjectedEvent(userId, _projections[walletId]!));
      _emitAccounting(accounting, ledgerLines, now);
    }

    return WalletLedgerApplyResult.ok('Withdrawal $wid requested.', withdrawalId: wid);
  }

  WalletLedgerApplyResult completeWithdrawal(String withdrawalId, {required DateTime now}) {
    final req = _withdrawals[withdrawalId];
    if (req == null) {
      return WalletLedgerApplyResult.fail('Unknown withdrawal $withdrawalId.');
    }
    if (req.status != WithdrawalRequestStatus.requested) {
      return const WalletLedgerApplyResult.fail('Withdrawal not in requested state.');
    }

    final accounting = <WalletEvent>[];
    var ledgerLines = 0;
    for (final e in req.lotAllocations.entries) {
      final lotId = e.key;
      final amt = e.value;
      final lot = _lots[lotId];
      if (lot == null) {
        return WalletLedgerApplyResult.fail('Lot $lotId missing during completion.');
      }
      if (lot.lockedUsd + 1e-9 < amt) {
        return WalletLedgerApplyResult.fail('Locked balance invariant failed for $lotId.');
      }
      _lots[lotId] = lot.copyWith(
        lockedUsd: lot.lockedUsd - amt,
        withdrawnUsd: lot.withdrawnUsd + amt,
      );

      final le = LedgerEntry(
        id: _nextId('le'),
        walletId: req.walletId,
        userId: req.userId,
        kind: LedgerEntryKind.lockedToWithdrawn,
        amountUsd: amt,
        valueLotId: lotId,
        referenceType: 'withdrawal_request',
        referenceId: withdrawalId,
        createdAt: now,
      );
      _appendLedgerCore(le);
      ledgerLines++;
      accounting
        ..add(
          WalletValueLotSpentEvent(
            valueLotId: lotId,
            userId: req.userId,
            amount: amt,
            currency: WalletCurrency.usd,
            spendType: WalletValueLotSpendType.withdrawal,
            spendId: withdrawalId,
          ),
        )
        ..add(_ledgerCreatedEvent(le));
    }

    _withdrawals[withdrawalId] = req.copyWith(status: WithdrawalRequestStatus.completed);
    if (ledgerLines > 0) {
      accounting.add(_balanceProjectedEvent(req.userId, _projections[req.walletId]!));
      _emitAccounting(accounting, ledgerLines, now);
    }
    return const WalletLedgerApplyResult.ok('Withdrawal completed.');
  }

  WalletLedgerApplyResult cancelWithdrawal(String withdrawalId, {required DateTime now}) {
    final req = _withdrawals[withdrawalId];
    if (req == null) {
      return WalletLedgerApplyResult.fail('Unknown withdrawal $withdrawalId.');
    }
    if (req.status != WithdrawalRequestStatus.requested) {
      return const WalletLedgerApplyResult.fail('Withdrawal not in requested state.');
    }

    final accounting = <WalletEvent>[];
    var ledgerLines = 0;
    for (final e in req.lotAllocations.entries) {
      final lotId = e.key;
      final amt = e.value;
      final lot = _lots[lotId];
      if (lot == null) {
        return WalletLedgerApplyResult.fail('Lot $lotId missing during cancel.');
      }
      _lots[lotId] = lot.copyWith(
        lockedUsd: lot.lockedUsd - amt,
        availableUsd: lot.availableUsd + amt,
      );

      final le = LedgerEntry(
        id: _nextId('le'),
        walletId: req.walletId,
        userId: req.userId,
        kind: LedgerEntryKind.lockedToAvailable,
        amountUsd: amt,
        valueLotId: lotId,
        referenceType: 'withdrawal_request',
        referenceId: withdrawalId,
        createdAt: now,
      );
      _appendLedgerCore(le);
      ledgerLines++;
      accounting.add(_ledgerCreatedEvent(le));
    }

    _withdrawals[withdrawalId] = req.copyWith(status: WithdrawalRequestStatus.cancelled);
    if (ledgerLines > 0) {
      accounting.add(_balanceProjectedEvent(req.userId, _projections[req.walletId]!));
      _emitAccounting(accounting, ledgerLines, now);
    }
    return const WalletLedgerApplyResult.ok('Withdrawal cancelled; funds unlocked.');
  }

  /// Moves [amountUsd] from source lot available into a new conversion lot (available).
  WalletLedgerApplyResult convertAvailableToNewLot({
    required String walletId,
    required String userId,
    required String sourceLotId,
    required double amountUsd,
    required DateTime now,
  }) {
    if (amountUsd <= 0) {
      return const WalletLedgerApplyResult.fail('Conversion amount must be positive.');
    }
    final src = _lots[sourceLotId];
    if (src == null) {
      return WalletLedgerApplyResult.fail('Unknown source lot $sourceLotId.');
    }
    if (src.walletId != walletId) {
      return const WalletLedgerApplyResult.fail('Source lot wallet mismatch.');
    }
    if (src.availableUsd + 1e-9 < amountUsd) {
      return const WalletLedgerApplyResult.fail('Insufficient available on source lot.');
    }

    final convId = _nextId('cv');
    final newLotId = _nextId('lot');

    _lots[sourceLotId] = src.copyWith(
      originalUsd: src.originalUsd - amountUsd,
      availableUsd: src.availableUsd - amountUsd,
    );

    final leDebit = LedgerEntry(
      id: _nextId('le'),
      walletId: walletId,
      userId: userId,
      kind: LedgerEntryKind.conversionSourceDebit,
      amountUsd: amountUsd,
      valueLotId: sourceLotId,
      referenceType: 'conversion',
      referenceId: convId,
      createdAt: now,
    );
    _appendLedgerCore(leDebit);

    final dest = ValueLot(
      id: newLotId,
      walletId: walletId,
      userId: userId,
      campaignId: '',
      sourceCampaignEventId: convId,
      originalUsd: amountUsd,
      pendingUsd: 0,
      availableUsd: amountUsd,
      lockedUsd: 0,
      withdrawnUsd: 0,
      createdAt: now,
    );
    _lots[newLotId] = dest;

    final leCredit = LedgerEntry(
      id: _nextId('le'),
      walletId: walletId,
      userId: userId,
      kind: LedgerEntryKind.conversionDestinationCredit,
      amountUsd: amountUsd,
      valueLotId: newLotId,
      referenceType: 'conversion',
      referenceId: convId,
      createdAt: now,
    );
    _appendLedgerCore(leCredit);

    _conversions[convId] = ConversionTransaction(
      id: convId,
      walletId: walletId,
      userId: userId,
      sourceLotId: sourceLotId,
      destinationLotId: newLotId,
      amountUsd: amountUsd,
      status: ConversionTransactionStatus.posted,
      createdAt: now,
    );

    _emitAccounting(
      [
        _ledgerCreatedEvent(leDebit),
        WalletValueLotCreatedEvent(
          valueLotId: newLotId,
          userId: userId,
          sourceType: WalletValueLotSourceType.manualAdjustment,
          sourceId: convId,
          originalAmount: amountUsd,
          currency: WalletCurrency.usd,
          initialState: WalletValueLotInitialState.available,
          trustScoreAtCreation: 0,
          fraudRiskAtCreation: 0,
        ),
        _ledgerCreatedEvent(leCredit),
        _balanceProjectedEvent(userId, _projections[walletId]!),
      ],
      2,
      now,
    );

    return WalletLedgerApplyResult.ok('Conversion $convId posted.', conversionId: convId);
  }
}
