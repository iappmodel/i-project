/// Value Lot Engine — tracks provenance and restrictions per chunk of earned value.
///
/// Aligns with the product `ValueLot` wire shape: one lot per issuance (e.g. campaign reward),
/// [pending] → [available], then spend / withdraw / convert / clawback / expiry.
///
/// **Rule 8:** clawback, lock, and unlock require explicit reasons / metadata stamps — value is
/// never removed or held without an inspectable record on the lot.

// CLIENT SIMULATION / NON-AUTHORITATIVE
// This module is for client-side preview/simulation UX only.
// It must not be treated as the canonical writer for economy, wallet, trust, fraud, campaign, or POPS economic state.
// Backend/API source-of-truth ownership is documented in:
// docs/source-of-truth-ownership-contract.md
// docs/runtime-wiring-matrix.md

enum ValueLotSourceType {
  campaignReward,
  creatorPayout,
  manualAdjustment,
  referral,
  bonus,
}

extension ValueLotSourceTypeWire on ValueLotSourceType {
  String get wireName => switch (this) {
        ValueLotSourceType.campaignReward => 'campaign_reward',
        ValueLotSourceType.creatorPayout => 'creator_payout',
        ValueLotSourceType.manualAdjustment => 'manual_adjustment',
        ValueLotSourceType.referral => 'referral',
        ValueLotSourceType.bonus => 'bonus',
      };
}

enum ValueLotCurrency { usd, icoin, vcoin, rcoin }

extension ValueLotCurrencyWire on ValueLotCurrency {
  String get wireName => switch (this) {
        ValueLotCurrency.usd => 'USD',
        ValueLotCurrency.icoin => 'ICOIN',
        ValueLotCurrency.vcoin => 'VCOIN',
        ValueLotCurrency.rcoin => 'RCOIN',
      };
}

enum ValueLotState {
  pending,
  available,
  locked,
  spent,
  withdrawn,
  clawedBack,
  expired,
}

extension ValueLotStateWire on ValueLotState {
  String get wireName => switch (this) {
        ValueLotState.pending => 'pending',
        ValueLotState.available => 'available',
        ValueLotState.locked => 'locked',
        ValueLotState.spent => 'spent',
        ValueLotState.withdrawn => 'withdrawn',
        ValueLotState.clawedBack => 'clawed_back',
        ValueLotState.expired => 'expired',
      };
}

final class ValueLot {
  const ValueLot({
    required this.lotId,
    required this.userId,
    required this.sourceType,
    required this.sourceId,
    required this.originalAmount,
    required this.remainingAmount,
    required this.currency,
    required this.state,
    this.pendingUntil,
    this.availableAt,
    this.expiresAt,
    required this.trustScoreAtCreation,
    required this.fraudRiskAtCreation,
    required this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });

  final String lotId;
  final String userId;
  final ValueLotSourceType sourceType;
  final String sourceId;
  final double originalAmount;
  final double remainingAmount;
  final ValueLotCurrency currency;
  final ValueLotState state;
  final String? pendingUntil;
  final String? availableAt;
  final String? expiresAt;
  final double trustScoreAtCreation;
  final double fraudRiskAtCreation;
  final Map<String, Object?> metadata;
  final String createdAt;
  final String updatedAt;

  ValueLot copyWith({
    String? lotId,
    String? userId,
    ValueLotSourceType? sourceType,
    String? sourceId,
    double? originalAmount,
    double? remainingAmount,
    ValueLotCurrency? currency,
    ValueLotState? state,
    String? pendingUntil,
    String? availableAt,
    String? expiresAt,
    double? trustScoreAtCreation,
    double? fraudRiskAtCreation,
    Map<String, Object?>? metadata,
    String? createdAt,
    String? updatedAt,
    bool clearPendingUntil = false,
    bool clearAvailableAt = false,
    bool clearExpiresAt = false,
  }) {
    return ValueLot(
      lotId: lotId ?? this.lotId,
      userId: userId ?? this.userId,
      sourceType: sourceType ?? this.sourceType,
      sourceId: sourceId ?? this.sourceId,
      originalAmount: originalAmount ?? this.originalAmount,
      remainingAmount: remainingAmount ?? this.remainingAmount,
      currency: currency ?? this.currency,
      state: state ?? this.state,
      pendingUntil: clearPendingUntil ? null : (pendingUntil ?? this.pendingUntil),
      availableAt: clearAvailableAt ? null : (availableAt ?? this.availableAt),
      expiresAt: clearExpiresAt ? null : (expiresAt ?? this.expiresAt),
      trustScoreAtCreation: trustScoreAtCreation ?? this.trustScoreAtCreation,
      fraudRiskAtCreation: fraudRiskAtCreation ?? this.fraudRiskAtCreation,
      metadata: metadata ?? Map<String, Object?>.from(this.metadata),
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

final class ValueLotEngineException implements Exception {
  ValueLotEngineException(this.message);
  final String message;
  @override
  String toString() => 'ValueLotEngineException: $message';
}

String _iso(DateTime t) => t.toUtc().toIso8601String();

bool _isTerminal(ValueLotState s) =>
    s == ValueLotState.spent ||
    s == ValueLotState.withdrawn ||
    s == ValueLotState.clawedBack ||
    s == ValueLotState.expired;

/// In-memory engine: create lots, advance lifecycle, spend by [remainingAmount].
final class ValueLotEngine {
  ValueLotEngine();

  final Map<String, ValueLot> _byId = {};
  int _seq = 0;

  Iterable<ValueLot> get lots => _byId.values;

  ValueLot? lot(String lotId) => _byId[lotId];

  List<ValueLot> lotsForUser(String userId) =>
      _byId.values.where((l) => l.userId == userId).toList(growable: false);

  String _nextId() {
    _seq += 1;
    return 'vl_${_seq}_${DateTime.now().microsecondsSinceEpoch}';
  }

  /// Creates a new lot in [ValueLotState.pending] (e.g. campaign reward awaiting clearance).
  ValueLot createPending({
    String? lotId,
    required String userId,
    required ValueLotSourceType sourceType,
    required String sourceId,
    required double amount,
    required ValueLotCurrency currency,
    required DateTime now,
    DateTime? pendingUntil,
    DateTime? expiresAt,
    double trustScoreAtCreation = 0,
    double fraudRiskAtCreation = 0,
    Map<String, Object?> metadata = const {},
  }) {
    if (amount <= 0 || !amount.isFinite) {
      throw ValueLotEngineException('amount must be positive and finite');
    }
    final id = lotId ?? _nextId();
    if (_byId.containsKey(id)) {
      throw ValueLotEngineException('duplicate lotId: $id');
    }
    final t = _iso(now);
    final lot = ValueLot(
      lotId: id,
      userId: userId,
      sourceType: sourceType,
      sourceId: sourceId,
      originalAmount: amount,
      remainingAmount: amount,
      currency: currency,
      state: ValueLotState.pending,
      pendingUntil: pendingUntil != null ? _iso(pendingUntil) : null,
      availableAt: null,
      expiresAt: expiresAt != null ? _iso(expiresAt) : null,
      trustScoreAtCreation: trustScoreAtCreation,
      fraudRiskAtCreation: fraudRiskAtCreation,
      metadata: Map<String, Object?>.from(metadata),
      createdAt: t,
      updatedAt: t,
    );
    _byId[id] = lot;
    return lot;
  }

  /// If [now] is on/after pending window, moves [pending] → [available].
  ValueLot tryReleasePending({required String lotId, required DateTime now}) {
    final lot = _require(lotId);
    if (lot.state != ValueLotState.pending) {
      throw ValueLotEngineException('lot $lotId is not pending (state=${lot.state})');
    }
    if (lot.pendingUntil != null) {
      final until = DateTime.parse(lot.pendingUntil!);
      if (now.isBefore(until)) {
        throw ValueLotEngineException('pendingUntil not reached');
      }
    }
    final next = lot.copyWith(
      state: ValueLotState.available,
      availableAt: _iso(now),
      updatedAt: _iso(now),
      clearPendingUntil: true,
    );
    _byId[lotId] = next;
    return next;
  }

  /// Force-release to available (e.g. policy approved early). Optional [when] for [availableAt].
  ValueLot forceAvailable({required String lotId, required DateTime now}) {
    final lot = _require(lotId);
    if (lot.state != ValueLotState.pending) {
      throw ValueLotEngineException('lot $lotId is not pending');
    }
    final next = lot.copyWith(
      state: ValueLotState.available,
      availableAt: _iso(now),
      updatedAt: _iso(now),
      clearPendingUntil: true,
    );
    _byId[lotId] = next;
    return next;
  }

  /// Moves [available] → [locked]. [reason] is stored on the lot (Rule 8 — no silent holds).
  ValueLot lock({
    required String lotId,
    required DateTime now,
    String reason = 'withdrawal_hold',
  }) {
    final lot = _require(lotId);
    if (reason.trim().isEmpty) {
      throw ValueLotEngineException('lock requires non-empty reason');
    }
    if (_isTerminal(lot.state)) {
      throw ValueLotEngineException('cannot lock terminal lot');
    }
    if (lot.state != ValueLotState.available) {
      throw ValueLotEngineException('lock requires available state');
    }
    final meta = Map<String, Object?>.from(lot.metadata)
      ..['lockReason'] = reason
      ..['lockedAt'] = _iso(now);
    final next = lot.copyWith(
      state: ValueLotState.locked,
      metadata: meta,
      updatedAt: _iso(now),
    );
    _byId[lotId] = next;
    return next;
  }

  /// Moves [locked] → [available]. [reason] is stored on the lot (Rule 8).
  ValueLot unlock({
    required String lotId,
    required DateTime now,
    String reason = 'withdrawal_release',
  }) {
    final lot = _require(lotId);
    if (reason.trim().isEmpty) {
      throw ValueLotEngineException('unlock requires non-empty reason');
    }
    if (lot.state != ValueLotState.locked) {
      throw ValueLotEngineException('unlock requires locked state');
    }
    final meta = Map<String, Object?>.from(lot.metadata)
      ..['unlockReason'] = reason
      ..['unlockedAt'] = _iso(now);
    final next = lot.copyWith(
      state: ValueLotState.available,
      metadata: meta,
      updatedAt: _iso(now),
    );
    _byId[lotId] = next;
    return next;
  }

  /// Spend from [available] or [locked] balance; [spent] when [remainingAmount] hits zero.
  ValueLot spend({required String lotId, required double amount, required DateTime now}) {
    final lot = _require(lotId);
    if (amount <= 0 || !amount.isFinite) {
      throw ValueLotEngineException('spend amount invalid');
    }
    if (lot.state != ValueLotState.available && lot.state != ValueLotState.locked) {
      throw ValueLotEngineException('spend requires available or locked');
    }
    if (amount > lot.remainingAmount + 1e-9) {
      throw ValueLotEngineException('spend exceeds remainingAmount');
    }
    final rem = (lot.remainingAmount - amount).clamp(0.0, lot.originalAmount);
    final nextState = rem <= 1e-12 ? ValueLotState.spent : lot.state;
    final next = lot.copyWith(
      remainingAmount: rem,
      state: nextState,
      updatedAt: _iso(now),
    );
    _byId[lotId] = next;
    return next;
  }

  /// Full remaining balance withdrawn; state [withdrawn].
  ValueLot withdrawAll({required String lotId, required DateTime now}) {
    final lot = _require(lotId);
    if (lot.state != ValueLotState.available && lot.state != ValueLotState.locked) {
      throw ValueLotEngineException('withdraw requires available or locked');
    }
    if (lot.remainingAmount <= 0) {
      throw ValueLotEngineException('nothing to withdraw');
    }
    final next = lot.copyWith(
      remainingAmount: 0,
      state: ValueLotState.withdrawn,
      updatedAt: _iso(now),
    );
    _byId[lotId] = next;
    return next;
  }

  /// Fraud / policy reversal: zero balance, [clawedBack]. [reason] must be non-empty (Rule 8).
  ValueLot clawBack({required String lotId, required DateTime now, required String reason}) {
    final lot = _require(lotId);
    if (reason.trim().isEmpty) {
      throw ValueLotEngineException('clawBack requires non-empty reason');
    }
    if (_isTerminal(lot.state)) {
      throw ValueLotEngineException('cannot claw back terminal lot');
    }
    final meta = Map<String, Object?>.from(lot.metadata)
      ..['clawBackReason'] = reason
      ..['clawedBackAt'] = _iso(now);
    final next = lot.copyWith(
      remainingAmount: 0,
      state: ValueLotState.clawedBack,
      metadata: meta,
      updatedAt: _iso(now),
      clearPendingUntil: true,
    );
    _byId[lotId] = next;
    return next;
  }

  /// Marks [expired] if [expiresAt] is set and [now] is past it (non-terminal lots only).
  ValueLot? tryExpire({required String lotId, required DateTime now}) {
    final lot = _byId[lotId];
    if (lot == null) return null;
    if (_isTerminal(lot.state)) return lot;
    if (lot.expiresAt == null) return lot;
    final exp = DateTime.parse(lot.expiresAt!);
    if (now.isBefore(exp)) return lot;
    final next = lot.copyWith(state: ValueLotState.expired, remainingAmount: 0, updatedAt: _iso(now));
    _byId[lotId] = next;
    return next;
  }

  /// Full conversion: closes source lot [spent] and returns a new pending lot in [newCurrency]
  /// (e.g. USD → ICOIN) with optional [conversionRate] applied to amount.
  ValueLot convertToCurrency({
    required String lotId,
    required ValueLotCurrency newCurrency,
    required double conversionRate,
    required DateTime now,
    DateTime? newLotPendingUntil,
    Map<String, Object?> extraMetadata = const {},
  }) {
    final lot = _require(lotId);
    if (lot.state != ValueLotState.available && lot.state != ValueLotState.locked) {
      throw ValueLotEngineException('convert requires available or locked');
    }
    if (conversionRate <= 0 || !conversionRate.isFinite) {
      throw ValueLotEngineException('conversionRate invalid');
    }
    final outAmount = lot.remainingAmount * conversionRate;
    if (outAmount <= 0) {
      throw ValueLotEngineException('converted amount would be non-positive');
    }
    final closedMeta = Map<String, Object?>.from(lot.metadata)
      ..['convertedToCurrency'] = newCurrency.wireName
      ..['conversionRate'] = conversionRate;
    final closed = lot.copyWith(
      remainingAmount: 0,
      state: ValueLotState.spent,
      updatedAt: _iso(now),
      metadata: closedMeta,
    );
    _byId[lotId] = closed;

    final childMeta = <String, Object?>{
      'parentLotId': lot.lotId,
      ...extraMetadata,
    };
    return createPending(
      userId: lot.userId,
      sourceType: ValueLotSourceType.manualAdjustment,
      sourceId: 'conversion:${lot.lotId}',
      amount: outAmount,
      currency: newCurrency,
      now: now,
      pendingUntil: newLotPendingUntil,
      trustScoreAtCreation: lot.trustScoreAtCreation,
      fraudRiskAtCreation: lot.fraudRiskAtCreation,
      metadata: childMeta,
    );
  }

  ValueLot _require(String lotId) {
    final l = _byId[lotId];
    if (l == null) {
      throw ValueLotEngineException('unknown lotId: $lotId');
    }
    return l;
  }
}
