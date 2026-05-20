import 'dart:math' as math;

/// §2.6 Campaign lifecycle — creation through payout.
enum CampaignLifecyclePhase {
  draft,
  submitted,
  approved,
  active,
  paused,
  budgetDepleted,
  completed,
  cancelled,
  rejected,
}

extension CampaignLifecyclePhaseWire on CampaignLifecyclePhase {
  String get wireName => switch (this) {
        CampaignLifecyclePhase.draft => 'draft',
        CampaignLifecyclePhase.submitted => 'submitted',
        CampaignLifecyclePhase.approved => 'approved',
        CampaignLifecyclePhase.active => 'active',
        CampaignLifecyclePhase.paused => 'paused',
        CampaignLifecyclePhase.budgetDepleted => 'budget_depleted',
        CampaignLifecyclePhase.completed => 'completed',
        CampaignLifecyclePhase.cancelled => 'cancelled',
        CampaignLifecyclePhase.rejected => 'rejected',
      };
}

/// Open budget hold pending verification / approval.
enum BudgetReservationStatus { active, released, settled }

final class BudgetReservation {
  BudgetReservation({
    required this.id,
    required this.campaignId,
    required this.amountUsd,
    required this.createdAt,
    required this.expiresAt,
    this.status = BudgetReservationStatus.active,
  });

  final String id;
  final String campaignId;
  final double amountUsd;
  final DateTime createdAt;
  final DateTime expiresAt;
  BudgetReservationStatus status;

  bool get isTerminal =>
      status == BudgetReservationStatus.released ||
      status == BudgetReservationStatus.settled;
}

/// Mutable campaign aggregate for engine-owned state.
final class ManagedCampaign {
  ManagedCampaign({
    required this.id,
    required this.brandId,
    required this.totalBudgetUsd,
    required this.rewardPerVerifiedActionUsd,
    required this.targetAudience,
    required this.maxFraudSignalScore,
    required this.minAttentionScore,
    required this.minVerifiedAttentionSeconds,
    required this.startAt,
    required this.endAt,
    this.allowedGeoCodes = const <String>{},
    this.allowedDeviceClasses = const <String>{},
    this.maxVerifiedActionsPerUser = 10,
    this.maxVerifiedActionsPerUserPerDay = 3,
  })  : phase = CampaignLifecyclePhase.draft,
        spentBudgetUsd = 0.0;

  final String id;
  final String brandId;

  /// §2.6 controls
  double totalBudgetUsd;
  double spentBudgetUsd;
  double rewardPerVerifiedActionUsd;
  Set<String> targetAudience;
  /// Higher = more tolerant (allow higher fraud scores).
  double maxFraudSignalScore;
  double minAttentionScore;
  double minVerifiedAttentionSeconds;
  Set<String> allowedGeoCodes;
  Set<String> allowedDeviceClasses;
  int maxVerifiedActionsPerUser;
  int maxVerifiedActionsPerUserPerDay;
  DateTime startAt;
  DateTime endAt;

  CampaignLifecyclePhase phase;

  /// Sum of [BudgetReservation] amounts with status `active`.
  double reservedBudgetUsd = 0.0;

  double get remainingBudgetUsd =>
      (totalBudgetUsd - spentBudgetUsd - reservedBudgetUsd)
          .clamp(0.0, totalBudgetUsd);

  bool get isTerminal =>
      phase == CampaignLifecyclePhase.completed ||
      phase == CampaignLifecyclePhase.cancelled ||
      phase == CampaignLifecyclePhase.rejected;

  bool isActiveWindow(DateTime now) =>
      !now.isBefore(startAt) && !now.isAfter(endAt);
}

final class CampaignTransitionResult {
  const CampaignTransitionResult({
    required this.ok,
    required this.message,
    this.phase,
  });

  final bool ok;
  final String message;
  final CampaignLifecyclePhase? phase;
}

final class BudgetReserveResult {
  const BudgetReserveResult({
    required this.ok,
    required this.message,
    this.reservationId,
    this.reservation,
  });

  final bool ok;
  final String message;
  final String? reservationId;
  final BudgetReservation? reservation;
}

final class BudgetSettleResult {
  const BudgetSettleResult({
    required this.ok,
    required this.message,
    this.spentAfter,
    this.reservedAfter,
  });

  final bool ok;
  final String message;
  final double? spentAfter;
  final double? reservedAfter;
}

/// §2.6 Campaign engine — lifecycle, controls, and budget rules.
///
/// Rules enforced:
/// - Reserve budget before reward issuance (pending hold).
/// - Reward amount cannot exceed remaining campaign budget.
/// - Budget is reserved before downstream reward approval; settlement moves
///   reserved → spent.
/// - Unused reserve [release] or [expireReservations].
final class CampaignEngine {
  CampaignEngine();

  final Map<String, ManagedCampaign> _campaigns = <String, ManagedCampaign>{};
  final Map<String, BudgetReservation> _reservationsById =
      <String, BudgetReservation>{};
  int _idSeq = 0;

  String _nextId(String prefix) => '$prefix:${++_idSeq}';

  Iterable<ManagedCampaign> get campaigns =>
      _campaigns.values.map((c) => c);

  ManagedCampaign? campaignById(String id) => _campaigns[id];

  void registerOrReplace(ManagedCampaign campaign) {
    _campaigns[campaign.id] = campaign;
  }

  /// Draft → submitted.
  CampaignTransitionResult submit(String campaignId) {
    final c = _require(campaignId);
    if (c.phase != CampaignLifecyclePhase.draft) {
      return const CampaignTransitionResult(
        ok: false,
        message: 'submit: expected draft',
      );
    }
    c.phase = CampaignLifecyclePhase.submitted;
    return CampaignTransitionResult(ok: true, message: 'submitted', phase: c.phase);
  }

  /// Submitted → approved (review gate).
  CampaignTransitionResult approveReview(String campaignId) {
    final c = _require(campaignId);
    if (c.phase != CampaignLifecyclePhase.submitted) {
      return const CampaignTransitionResult(
        ok: false,
        message: 'approveReview: expected submitted',
      );
    }
    c.phase = CampaignLifecyclePhase.approved;
    return CampaignTransitionResult(ok: true, message: 'approved', phase: c.phase);
  }

  /// Submitted → rejected.
  CampaignTransitionResult reject(String campaignId) {
    final c = _require(campaignId);
    if (c.phase != CampaignLifecyclePhase.submitted) {
      return const CampaignTransitionResult(
        ok: false,
        message: 'reject: expected submitted',
      );
    }
    _releaseAllActiveReservations(campaignId, DateTime.now());
    c.phase = CampaignLifecyclePhase.rejected;
    return CampaignTransitionResult(ok: true, message: 'rejected', phase: c.phase);
  }

  /// Approved → active when [now] is inside the campaign window.
  CampaignTransitionResult activate(String campaignId, DateTime now) {
    final c = _require(campaignId);
    if (c.phase != CampaignLifecyclePhase.approved &&
        c.phase != CampaignLifecyclePhase.paused) {
      return const CampaignTransitionResult(
        ok: false,
        message: 'activate: expected approved or paused',
      );
    }
    if (!c.isActiveWindow(now)) {
      return const CampaignTransitionResult(
        ok: false,
        message: 'activate: outside start/end window',
      );
    }
    if (c.remainingBudgetUsd <= 0) {
      c.phase = CampaignLifecyclePhase.budgetDepleted;
      return const CampaignTransitionResult(
        ok: false,
        message: 'activate: no budget',
        phase: CampaignLifecyclePhase.budgetDepleted,
      );
    }
    c.phase = CampaignLifecyclePhase.active;
    return CampaignTransitionResult(ok: true, message: 'active', phase: c.phase);
  }

  CampaignTransitionResult pause(String campaignId) {
    final c = _require(campaignId);
    if (c.phase != CampaignLifecyclePhase.active) {
      return const CampaignTransitionResult(
        ok: false,
        message: 'pause: expected active',
      );
    }
    c.phase = CampaignLifecyclePhase.paused;
    return CampaignTransitionResult(ok: true, message: 'paused', phase: c.phase);
  }

  /// Marks budget exhausted (e.g. after last settlement).
  CampaignTransitionResult markBudgetDepleted(String campaignId) {
    final c = _require(campaignId);
    if (c.phase != CampaignLifecyclePhase.active &&
        c.phase != CampaignLifecyclePhase.paused) {
      return const CampaignTransitionResult(
        ok: false,
        message: 'markBudgetDepleted: expected active or paused',
      );
    }
    if (c.remainingBudgetUsd > 0 || c.reservedBudgetUsd > 0) {
      return const CampaignTransitionResult(
        ok: false,
        message: 'markBudgetDepleted: liquidity still available',
      );
    }
    c.phase = CampaignLifecyclePhase.budgetDepleted;
    return CampaignTransitionResult(
      ok: true,
      message: 'budget_depleted',
      phase: c.phase,
    );
  }

  CampaignTransitionResult complete(String campaignId) {
    final c = _require(campaignId);
    if (c.phase != CampaignLifecyclePhase.active &&
        c.phase != CampaignLifecyclePhase.paused &&
        c.phase != CampaignLifecyclePhase.budgetDepleted) {
      return const CampaignTransitionResult(
        ok: false,
        message: 'complete: invalid phase',
      );
    }
    if (c.reservedBudgetUsd > 0) {
      return const CampaignTransitionResult(
        ok: false,
        message: 'complete: release reservations first',
      );
    }
    c.phase = CampaignLifecyclePhase.completed;
    return CampaignTransitionResult(ok: true, message: 'completed', phase: c.phase);
  }

  CampaignTransitionResult cancel(String campaignId, DateTime now) {
    final c = _require(campaignId);
    if (c.isTerminal) {
      return const CampaignTransitionResult(
        ok: false,
        message: 'cancel: terminal phase',
      );
    }
    _releaseAllActiveReservations(campaignId, now);
    c.phase = CampaignLifecyclePhase.cancelled;
    return CampaignTransitionResult(ok: true, message: 'cancelled', phase: c.phase);
  }

  /// Reserve [amountUsd] before issuing a pending reward. Does not spend.
  ///
  /// Fails if campaign not [active], window invalid, or amount exceeds
  /// [remainingBudgetUsd] or [rewardPerVerifiedActionUsd] (per-action cap).
  BudgetReserveResult reserveForVerifiedAction({
    required String campaignId,
    required double amountUsd,
    required DateTime now,
    Duration holdTtl = const Duration(hours: 24),
  }) {
    final c = _require(campaignId);
    if (c.phase != CampaignLifecyclePhase.active) {
      return const BudgetReserveResult(
        ok: false,
        message: 'reserve: campaign not active',
      );
    }
    if (!c.isActiveWindow(now)) {
      return const BudgetReserveResult(
        ok: false,
        message: 'reserve: outside window',
      );
    }
    final amt = amountUsd.clamp(0.0, double.infinity);
    if (amt <= 0) {
      return const BudgetReserveResult(ok: false, message: 'reserve: bad amount');
    }
    if (amt > c.rewardPerVerifiedActionUsd + 1e-9) {
      return const BudgetReserveResult(
        ok: false,
        message: 'reserve: exceeds reward_per_verified_action',
      );
    }
    if (amt > c.remainingBudgetUsd + 1e-9) {
      return const BudgetReserveResult(
        ok: false,
        message: 'reserve: exceeds remaining budget',
      );
    }
    expireReservations(now);
    if (amt > c.remainingBudgetUsd + 1e-9) {
      return const BudgetReserveResult(
        ok: false,
        message: 'reserve: insufficient after expiry sweep',
      );
    }

    final id = _nextId('brsv');
    final res = BudgetReservation(
      id: id,
      campaignId: campaignId,
      amountUsd: amt,
      createdAt: now,
      expiresAt: now.add(holdTtl),
    );
    _reservationsById[id] = res;
    c.reservedBudgetUsd += amt;
    return BudgetReserveResult(
      ok: true,
      message: 'reserved',
      reservationId: id,
      reservation: res,
    );
  }

  /// Release a hold (unused reserve / cancelled verification).
  BudgetSettleResult releaseReservation({
    required String reservationId,
    required DateTime now,
  }) {
    expireReservations(now);
    final r = _reservationsById[reservationId];
    if (r == null) {
      return const BudgetSettleResult(ok: false, message: 'release: unknown id');
    }
    if (r.status != BudgetReservationStatus.active) {
      return const BudgetSettleResult(
        ok: false,
        message: 'release: not active',
      );
    }
    final c = _require(r.campaignId);
    r.status = BudgetReservationStatus.released;
    c.reservedBudgetUsd =
        math.max(0.0, c.reservedBudgetUsd - r.amountUsd);
    return BudgetSettleResult(
      ok: true,
      message: 'released',
      spentAfter: c.spentBudgetUsd,
      reservedAfter: c.reservedBudgetUsd,
    );
  }

  /// After reward approval: move reserved → spent for this reservation.
  BudgetSettleResult settleReservation({
    required String reservationId,
    required DateTime now,
  }) {
    expireReservations(now);
    final r = _reservationsById[reservationId];
    if (r == null) {
      return const BudgetSettleResult(ok: false, message: 'settle: unknown id');
    }
    if (r.status != BudgetReservationStatus.active) {
      return const BudgetSettleResult(ok: false, message: 'settle: not active');
    }
    if (now.isAfter(r.expiresAt)) {
      return const BudgetSettleResult(
        ok: false,
        message: 'settle: reservation expired; release and re-reserve',
      );
    }
    final c = _require(r.campaignId);
    if (c.phase != CampaignLifecyclePhase.active &&
        c.phase != CampaignLifecyclePhase.paused) {
      return const BudgetSettleResult(
        ok: false,
        message: 'settle: campaign not payable',
      );
    }

    r.status = BudgetReservationStatus.settled;
    c.reservedBudgetUsd =
        math.max(0.0, c.reservedBudgetUsd - r.amountUsd);
    c.spentBudgetUsd += r.amountUsd;

    if (c.remainingBudgetUsd <= 1e-9 && c.reservedBudgetUsd <= 1e-9) {
      c.phase = CampaignLifecyclePhase.budgetDepleted;
    }
    return BudgetSettleResult(
      ok: true,
      message: 'settled',
      spentAfter: c.spentBudgetUsd,
      reservedAfter: c.reservedBudgetUsd,
    );
  }

  /// Approve payout only if a prior reservation exists and is still active.
  BudgetSettleResult approveRewardFromReservation({
    required String reservationId,
    required DateTime now,
  }) =>
      settleReservation(reservationId: reservationId, now: now);

  void expireReservations(DateTime now) {
    for (final r in _reservationsById.values) {
      if (r.status != BudgetReservationStatus.active) continue;
      if (!now.isAfter(r.expiresAt)) continue;
      final c = _campaigns[r.campaignId];
      if (c == null) continue;
      r.status = BudgetReservationStatus.released;
      c.reservedBudgetUsd =
          math.max(0.0, c.reservedBudgetUsd - r.amountUsd);
    }
  }

  /// Geo / device / audience / fraud / attention gates for a verification.
  bool passesAttentionAndFraud({
    required ManagedCampaign campaign,
    required double attentionScore,
    required double fraudSignalScore,
    required double verifiedAttentionSeconds,
  }) {
    if (attentionScore < campaign.minAttentionScore) return false;
    if (verifiedAttentionSeconds < campaign.minVerifiedAttentionSeconds) {
      return false;
    }
    if (fraudSignalScore > campaign.maxFraudSignalScore) return false;
    return true;
  }

  bool passesGeoDevice({
    required ManagedCampaign campaign,
    required String? userGeo,
    required String? userDeviceClass,
  }) {
    if (campaign.allowedGeoCodes.isNotEmpty) {
      if (userGeo == null || !campaign.allowedGeoCodes.contains(userGeo)) {
        return false;
      }
    }
    if (campaign.allowedDeviceClasses.isNotEmpty) {
      if (userDeviceClass == null ||
          !campaign.allowedDeviceClasses.contains(userDeviceClass)) {
        return false;
      }
    }
    return true;
  }

  bool passesAudience({
    required ManagedCampaign campaign,
    required Set<String> userInterests,
  }) {
    if (campaign.targetAudience.isEmpty) return true;
    return userInterests.intersection(campaign.targetAudience).isNotEmpty;
  }

  /// Frequency cap: pass cumulative counts from an external tracker.
  bool passesFrequencyCaps({
    required ManagedCampaign campaign,
    required int userLifetimeActions,
    required int userActionsToday,
  }) {
    if (userLifetimeActions >= campaign.maxVerifiedActionsPerUser) {
      return false;
    }
    if (userActionsToday >= campaign.maxVerifiedActionsPerUserPerDay) {
      return false;
    }
    return true;
  }

  ManagedCampaign _require(String id) {
    final c = _campaigns[id];
    if (c == null) throw StateError('Unknown campaign: $id');
    return c;
  }

  void _releaseAllActiveReservations(String campaignId, DateTime now) {
    for (final r in _reservationsById.values) {
      if (r.campaignId != campaignId) continue;
      if (r.status != BudgetReservationStatus.active) continue;
      releaseReservation(reservationId: r.id, now: now);
    }
  }
}
