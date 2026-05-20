// 2.7 Campaign Budget Reserve Engine — prevent overspending.
//
// Flow (integration boundary):
// attention verified → reward candidate → attemptReserve → (success) →
// approveRewardDecision → value lot pending clear → onValueClear → spent.
//
// Invariant: availableBudget = totalBudget - reservedBudget - spentBudget
// Reserve / release / finalize are synchronous single-call mutations (atomic
// on the Dart isolate; no await between check and write).

import 'dart:math' as math;

enum BudgetReserveLotStage {
  /// Reserve succeeded; reward decision not yet approved.
  reservedAwaitingApproval,

  /// Reward approved; value lot pending until cleared.
  reservedAwaitingValueClear,

  /// Reserve returned to the campaign (rejected or reversed before spend).
  released,

  /// Value cleared; reserve converted to spend.
  spent,
}

enum ReserveAttemptFailureCode {
  campaignNotRegistered,
  nonPositiveAmount,
  insufficientAvailableBudget,
}

enum BudgetReserveMutationFailure {
  lotNotFound,
  invalidLotStage,
  campaignMismatch,
  nonPositiveRefund,
  refundExceedsSpent,
}

final class CampaignBudgetBook {
  const CampaignBudgetBook({
    required this.campaignId,
    required this.totalBudget,
    required this.reservedBudget,
    required this.spentBudget,
    required this.refundedBudget,
  });

  final String campaignId;
  final double totalBudget;
  final double reservedBudget;
  final double spentBudget;
  final double refundedBudget;

  /// Spec: availableBudget = totalBudget - reservedBudget - spentBudget
  double get availableBudget =>
      totalBudget - reservedBudget - spentBudget;
}

final class BudgetReserveLot {
  BudgetReserveLot({
    required this.valueLotId,
    required this.campaignId,
    required this.rewardCandidateId,
    required this.amount,
    required this.stage,
    required this.createdAt,
  });

  final String valueLotId;
  final String campaignId;
  final String rewardCandidateId;
  final double amount;
  BudgetReserveLotStage stage;
  final DateTime createdAt;
}

final class ReserveAttemptSuccess {
  const ReserveAttemptSuccess({
    required this.valueLotId,
    required this.lot,
    required this.book,
  });

  final String valueLotId;
  final BudgetReserveLot lot;
  final CampaignBudgetBook book;
}

final class ReserveAttemptFailure {
  const ReserveAttemptFailure({
    required this.code,
    this.book,
  });

  final ReserveAttemptFailureCode code;
  final CampaignBudgetBook? book;
}

/// Result of [CampaignBudgetReserveEngine.attemptReserve].
sealed class ReserveAttemptResult {}

final class ReserveAttemptOk extends ReserveAttemptResult {
  ReserveAttemptOk(this.value);
  final ReserveAttemptSuccess value;
}

final class ReserveAttemptErr extends ReserveAttemptResult {
  ReserveAttemptErr(this.failure);
  final ReserveAttemptFailure failure;
}

sealed class BudgetReserveMutationResult {}

final class BudgetReserveMutationOk extends BudgetReserveMutationResult {
  BudgetReserveMutationOk({this.lot, required this.book});
  final BudgetReserveLot? lot;
  final CampaignBudgetBook book;
}

final class BudgetReserveMutationErr extends BudgetReserveMutationResult {
  BudgetReserveMutationErr(this.failure);
  final BudgetReserveMutationFailure failure;
}

class _MutableCampaignBudget {
  _MutableCampaignBudget({
    required this.campaignId,
    required this.totalBudget,
    this.reservedBudget = 0,
    this.spentBudget = 0,
    this.refundedBudget = 0,
  }) : assert(totalBudget >= 0);

  final String campaignId;
  double totalBudget;
  double reservedBudget;
  double spentBudget;
  double refundedBudget;

  CampaignBudgetBook snapshot() => CampaignBudgetBook(
        campaignId: campaignId,
        totalBudget: totalBudget,
        reservedBudget: reservedBudget,
        spentBudget: spentBudget,
        refundedBudget: refundedBudget,
      );

  double get _available => totalBudget - reservedBudget - spentBudget;

  void _assertInvariant() {
    assert(
      reservedBudget >= -1e-9 &&
          spentBudget >= -1e-9 &&
          refundedBudget >= -1e-9,
    );
    assert(_available >= -1e-9);
  }
}

/// Holds per-campaign budget books and value-lot reserve lines.
final class CampaignBudgetReserveEngine {
  final Map<String, _MutableCampaignBudget> _campaigns =
      <String, _MutableCampaignBudget>{};
  final Map<String, BudgetReserveLot> _lots = <String, BudgetReserveLot>{};
  int _lotSeq = 0;

  /// Register or replace the total budget cap for a campaign.
  /// Does not change reserved/spent/refunded; callers should register before use.
  void registerCampaign({
    required String campaignId,
    required double totalBudget,
  }) {
    assert(totalBudget >= 0);
    final existing = _campaigns[campaignId];
    if (existing == null) {
      _campaigns[campaignId] = _MutableCampaignBudget(
        campaignId: campaignId,
        totalBudget: totalBudget,
      );
    } else {
      existing.totalBudget = totalBudget;
    }
  }

  CampaignBudgetBook? bookFor(String campaignId) =>
      _campaigns[campaignId]?.snapshot();

  BudgetReserveLot? lotById(String valueLotId) => _lots[valueLotId];

  /// Atomic: checks [availableBudget] and increments [reservedBudget] or fails.
  ReserveAttemptResult attemptReserve({
    required String campaignId,
    required String rewardCandidateId,
    required double amount,
    required DateTime now,
    String? valueLotId,
  }) {
    final c = _campaigns[campaignId];
    if (c == null) {
      return ReserveAttemptErr(
        const ReserveAttemptFailure(
          code: ReserveAttemptFailureCode.campaignNotRegistered,
        ),
      );
    }
    if (amount <= 0) {
      return ReserveAttemptErr(
        ReserveAttemptFailure(
          code: ReserveAttemptFailureCode.nonPositiveAmount,
          book: c.snapshot(),
        ),
      );
    }
    final available = c.totalBudget - c.reservedBudget - c.spentBudget;
    if (amount > available + 1e-9) {
      return ReserveAttemptErr(
        ReserveAttemptFailure(
          code: ReserveAttemptFailureCode.insufficientAvailableBudget,
          book: c.snapshot(),
        ),
      );
    }

    c.reservedBudget += amount;
    c._assertInvariant();

    final id = valueLotId ?? _nextLotId();
    final lot = BudgetReserveLot(
      valueLotId: id,
      campaignId: campaignId,
      rewardCandidateId: rewardCandidateId,
      amount: amount,
      stage: BudgetReserveLotStage.reservedAwaitingApproval,
      createdAt: now,
    );
    _lots[id] = lot;

    return ReserveAttemptOk(
      ReserveAttemptSuccess(
        valueLotId: id,
        lot: lot,
        book: c.snapshot(),
      ),
    );
  }

  /// After reserve succeeds and reward decision is approved.
  BudgetReserveMutationResult approveRewardDecision({
    required String valueLotId,
  }) {
    final lot = _lots[valueLotId];
    if (lot == null) {
      return BudgetReserveMutationErr(BudgetReserveMutationFailure.lotNotFound);
    }
    if (lot.stage != BudgetReserveLotStage.reservedAwaitingApproval) {
      return BudgetReserveMutationErr(
        BudgetReserveMutationFailure.invalidLotStage,
      );
    }
    lot.stage = BudgetReserveLotStage.reservedAwaitingValueClear;
    final book = _campaigns[lot.campaignId]!.snapshot();
    return BudgetReserveMutationOk(lot: lot, book: book);
  }

  /// Release reserve if reward rejected (any time before spend conversion).
  BudgetReserveMutationResult releaseReserveOnReject({
    required String valueLotId,
  }) {
    final lot = _lots[valueLotId];
    if (lot == null) {
      return BudgetReserveMutationErr(BudgetReserveMutationFailure.lotNotFound);
    }
    if (lot.stage == BudgetReserveLotStage.spent ||
        lot.stage == BudgetReserveLotStage.released) {
      return BudgetReserveMutationErr(
        BudgetReserveMutationFailure.invalidLotStage,
      );
    }
    final c = _campaigns[lot.campaignId];
    if (c == null) {
      return BudgetReserveMutationErr(
        BudgetReserveMutationFailure.campaignMismatch,
      );
    }
    c.reservedBudget -= lot.amount;
    c.reservedBudget = math.max(0, c.reservedBudget);
    lot.stage = BudgetReserveLotStage.released;
    c._assertInvariant();
    return BudgetReserveMutationOk(lot: lot, book: c.snapshot());
  }

  /// When value clears: convert reserve to spend (campaign spend marked spent).
  BudgetReserveMutationResult convertReserveToSpendOnValueClear({
    required String valueLotId,
  }) {
    final lot = _lots[valueLotId];
    if (lot == null) {
      return BudgetReserveMutationErr(BudgetReserveMutationFailure.lotNotFound);
    }
    if (lot.stage != BudgetReserveLotStage.reservedAwaitingValueClear) {
      return BudgetReserveMutationErr(
        BudgetReserveMutationFailure.invalidLotStage,
      );
    }
    final c = _campaigns[lot.campaignId];
    if (c == null) {
      return BudgetReserveMutationErr(
        BudgetReserveMutationFailure.campaignMismatch,
      );
    }
    c.reservedBudget -= lot.amount;
    c.reservedBudget = math.max(0, c.reservedBudget);
    c.spentBudget += lot.amount;
    lot.stage = BudgetReserveLotStage.spent;
    c._assertInvariant();
    return BudgetReserveMutationOk(lot: lot, book: c.snapshot());
  }

  /// Move amount from spent to refunded (e.g. settlement clawback). Atomic.
  BudgetReserveMutationResult recordRefundFromSpent({
    required String campaignId,
    required double amount,
  }) {
    if (amount <= 0) {
      return BudgetReserveMutationErr(
        BudgetReserveMutationFailure.nonPositiveRefund,
      );
    }
    final c = _campaigns[campaignId];
    if (c == null) {
      return BudgetReserveMutationErr(
        BudgetReserveMutationFailure.campaignMismatch,
      );
    }
    if (amount > c.spentBudget + 1e-9) {
      return BudgetReserveMutationErr(
        BudgetReserveMutationFailure.refundExceedsSpent,
      );
    }
    c.spentBudget -= amount;
    c.refundedBudget += amount;
    c._assertInvariant();
    return BudgetReserveMutationOk(book: c.snapshot());
  }

  String _nextLotId() {
    _lotSeq += 1;
    return 'lot_$_lotSeq';
  }
}
