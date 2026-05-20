import 'package:eye_tracking_app/core/events/wallet_event.dart';

/// Direction + bucket metadata for a ledger entry type.
final class WalletLedgerPostingRule {
  const WalletLedgerPostingRule({
    required this.entryType,
    required this.direction,
    required this.bucket,
  });

  final WalletLedgerEntryType entryType;
  final String direction;
  final WalletBalanceBucket bucket;
}

/// Cached projection totals per wallet/currency.
final class WalletProjectionTotals {
  const WalletProjectionTotals({
    required this.pendingMinor,
    required this.availableMinor,
    required this.lockedMinor,
    required this.withdrawnMinor,
    required this.spentMinor,
    required this.expiredMinor,
    required this.clawedBackMinor,
  });

  final int pendingMinor;
  final int availableMinor;
  final int lockedMinor;
  final int withdrawnMinor;
  final int spentMinor;
  final int expiredMinor;
  final int clawedBackMinor;

  WalletProjectionTotals copyWith({
    int? pendingMinor,
    int? availableMinor,
    int? lockedMinor,
    int? withdrawnMinor,
    int? spentMinor,
    int? expiredMinor,
    int? clawedBackMinor,
  }) {
    return WalletProjectionTotals(
      pendingMinor: pendingMinor ?? this.pendingMinor,
      availableMinor: availableMinor ?? this.availableMinor,
      lockedMinor: lockedMinor ?? this.lockedMinor,
      withdrawnMinor: withdrawnMinor ?? this.withdrawnMinor,
      spentMinor: spentMinor ?? this.spentMinor,
      expiredMinor: expiredMinor ?? this.expiredMinor,
      clawedBackMinor: clawedBackMinor ?? this.clawedBackMinor,
    );
  }
}

enum WalletProjectionSourceBucket { pending, available, locked }

abstract final class WalletLedgerProjectionRules {
  static const WalletLedgerPostingRule creditPending = WalletLedgerPostingRule(
    entryType: WalletLedgerEntryType.creditPending,
    direction: 'credit',
    bucket: WalletBalanceBucket.pending,
  );

  static const WalletLedgerPostingRule creditAvailable = WalletLedgerPostingRule(
    entryType: WalletLedgerEntryType.creditAvailable,
    direction: 'credit',
    bucket: WalletBalanceBucket.available,
  );

  static const WalletLedgerPostingRule unlock = WalletLedgerPostingRule(
    entryType: WalletLedgerEntryType.unlock,
    direction: 'neutral',
    bucket: WalletBalanceBucket.available,
  );

  static const WalletLedgerPostingRule lock = WalletLedgerPostingRule(
    entryType: WalletLedgerEntryType.lock,
    direction: 'neutral',
    bucket: WalletBalanceBucket.locked,
  );

  static const WalletLedgerPostingRule debitWithdrawal = WalletLedgerPostingRule(
    entryType: WalletLedgerEntryType.debitWithdrawal,
    direction: 'debit',
    bucket: WalletBalanceBucket.withdrawn,
  );

  static const WalletLedgerPostingRule debitSpend = WalletLedgerPostingRule(
    entryType: WalletLedgerEntryType.debitSpend,
    direction: 'debit',
    bucket: WalletBalanceBucket.spent,
  );

  static const WalletLedgerPostingRule debitConversion = WalletLedgerPostingRule(
    entryType: WalletLedgerEntryType.debitConversion,
    direction: 'debit',
    bucket: WalletBalanceBucket.spent,
  );

  static const WalletLedgerPostingRule creditConversion =
      WalletLedgerPostingRule(
    entryType: WalletLedgerEntryType.creditConversion,
    direction: 'credit',
    bucket: WalletBalanceBucket.available,
  );

  static const WalletLedgerPostingRule clawback = WalletLedgerPostingRule(
    entryType: WalletLedgerEntryType.clawback,
    direction: 'debit',
    bucket: WalletBalanceBucket.clawedBack,
  );

  static const WalletLedgerPostingRule expire = WalletLedgerPostingRule(
    entryType: WalletLedgerEntryType.expire,
    direction: 'debit',
    bucket: WalletBalanceBucket.expired,
  );

  static const Map<WalletLedgerEntryType, WalletLedgerPostingRule> postingRules =
      <WalletLedgerEntryType, WalletLedgerPostingRule>{
    WalletLedgerEntryType.creditPending: creditPending,
    WalletLedgerEntryType.creditAvailable: creditAvailable,
    WalletLedgerEntryType.unlock: unlock,
    WalletLedgerEntryType.lock: lock,
    WalletLedgerEntryType.debitWithdrawal: debitWithdrawal,
    WalletLedgerEntryType.debitSpend: debitSpend,
    WalletLedgerEntryType.debitConversion: debitConversion,
    WalletLedgerEntryType.creditConversion: creditConversion,
    WalletLedgerEntryType.clawback: clawback,
    WalletLedgerEntryType.expire: expire,
  };

  /// Applies projection effects for one ledger entry.
  ///
  /// For [WalletLedgerEntryType.clawback], [sourceBucket] is required so the
  /// correct bucket is debited before moving value into `clawed_back`.
  static WalletProjectionTotals apply({
    required WalletProjectionTotals totals,
    required WalletLedgerEntryType entryType,
    required int amountMinor,
    WalletProjectionSourceBucket? sourceBucket,
  }) {
    if (amountMinor <= 0) {
      throw ArgumentError.value(amountMinor, 'amountMinor', 'must be > 0');
    }
    return switch (entryType) {
      WalletLedgerEntryType.creditPending => totals.copyWith(
          pendingMinor: totals.pendingMinor + amountMinor,
        ),
      WalletLedgerEntryType.creditAvailable ||
      WalletLedgerEntryType.creditConversion => totals.copyWith(
          availableMinor: totals.availableMinor + amountMinor,
        ),
      WalletLedgerEntryType.unlock => totals.copyWith(
          pendingMinor: totals.pendingMinor - amountMinor,
          availableMinor: totals.availableMinor + amountMinor,
        ),
      WalletLedgerEntryType.lock => totals.copyWith(
          availableMinor: totals.availableMinor - amountMinor,
          lockedMinor: totals.lockedMinor + amountMinor,
        ),
      WalletLedgerEntryType.debitWithdrawal => totals.copyWith(
          lockedMinor: totals.lockedMinor - amountMinor,
          withdrawnMinor: totals.withdrawnMinor + amountMinor,
        ),
      WalletLedgerEntryType.debitSpend || WalletLedgerEntryType.debitConversion =>
        totals.copyWith(
          availableMinor: totals.availableMinor - amountMinor,
          spentMinor: totals.spentMinor + amountMinor,
        ),
      WalletLedgerEntryType.clawback => _applyClawback(
          totals: totals,
          amountMinor: amountMinor,
          sourceBucket: sourceBucket,
        ),
      WalletLedgerEntryType.expire => _applyExpire(
          totals: totals,
          amountMinor: amountMinor,
          sourceBucket: sourceBucket,
        ),
      WalletLedgerEntryType.adminAdjustment =>
        throw UnsupportedError('No canonical projection rule for admin_adjustment'),
    };
  }

  static WalletProjectionTotals _applyClawback({
    required WalletProjectionTotals totals,
    required int amountMinor,
    required WalletProjectionSourceBucket? sourceBucket,
  }) {
    final source = sourceBucket ??
        (throw ArgumentError('clawback requires sourceBucket'));
    return switch (source) {
      WalletProjectionSourceBucket.pending => totals.copyWith(
          pendingMinor: totals.pendingMinor - amountMinor,
          clawedBackMinor: totals.clawedBackMinor + amountMinor,
        ),
      WalletProjectionSourceBucket.available => totals.copyWith(
          availableMinor: totals.availableMinor - amountMinor,
          clawedBackMinor: totals.clawedBackMinor + amountMinor,
        ),
      WalletProjectionSourceBucket.locked => totals.copyWith(
          lockedMinor: totals.lockedMinor - amountMinor,
          clawedBackMinor: totals.clawedBackMinor + amountMinor,
        ),
    };
  }

  static WalletProjectionTotals _applyExpire({
    required WalletProjectionTotals totals,
    required int amountMinor,
    required WalletProjectionSourceBucket? sourceBucket,
  }) {
    final source = sourceBucket ??
        (throw ArgumentError('expire requires sourceBucket'));
    return switch (source) {
      WalletProjectionSourceBucket.pending => totals.copyWith(
          pendingMinor: totals.pendingMinor - amountMinor,
          expiredMinor: totals.expiredMinor + amountMinor,
        ),
      WalletProjectionSourceBucket.available => totals.copyWith(
          availableMinor: totals.availableMinor - amountMinor,
          expiredMinor: totals.expiredMinor + amountMinor,
        ),
      WalletProjectionSourceBucket.locked =>
        throw ArgumentError('expire sourceBucket cannot be locked'),
    };
  }
}
