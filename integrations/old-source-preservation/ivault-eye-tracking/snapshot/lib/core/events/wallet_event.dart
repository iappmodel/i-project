// Accounting catalog §10 — wallet.* payloads (immutable append-only semantics).

/// Stable wire names for wallet domain events (analytics / ledger projection / bus).
abstract final class WalletEventWire {
  static const valueLotCreated = 'wallet.value_lot.created';
  static const valueLotAvailable = 'wallet.value_lot.available';
  static const valueLotLocked = 'wallet.value_lot.locked';
  static const valueLotSpent = 'wallet.value_lot.spent';
  static const ledgerEntryCreated = 'wallet.ledger_entry.created';
  static const balanceProjected = 'wallet.balance.projected';
}

/// Wire: [WalletEventWire.valueLotCreated] — [WalletValueLotSourceType.wireValue].
enum WalletValueLotSourceType {
  campaignReward('campaign_reward'),
  creatorPayout('creator_payout'),
  manualAdjustment('manual_adjustment'),
  referral('referral'),
  bonus('bonus');

  const WalletValueLotSourceType(this.wireValue);
  final String wireValue;
}

/// Wire: ISO-like codes as in product spec.
enum WalletCurrency {
  usd('USD'),
  icoin('ICOIN'),
  vcoin('VCOIN'),
  rcoin('RCOIN');

  const WalletCurrency(this.wireValue);
  final String wireValue;
}

/// Wire: [WalletEventWire.valueLotCreated] — initial lot state.
enum WalletValueLotInitialState {
  pending('pending'),
  available('available'),
  locked('locked');

  const WalletValueLotInitialState(this.wireValue);
  final String wireValue;
}

/// Wire: [WalletEventWire.valueLotLocked] — [WalletValueLotLockReason.wireValue].
enum WalletValueLotLockReason {
  fraudReview('fraud_review'),
  adminReview('admin_review'),
  withdrawalHold('withdrawal_hold'),
  campaignDispute('campaign_dispute');

  const WalletValueLotLockReason(this.wireValue);
  final String wireValue;
}

/// Wire: [WalletEventWire.valueLotSpent] — [WalletValueLotSpendType.wireValue].
enum WalletValueLotSpendType {
  purchase('purchase'),
  tip('tip'),
  conversion('conversion'),
  withdrawal('withdrawal');

  const WalletValueLotSpendType(this.wireValue);
  final String wireValue;
}

/// Wire: [WalletEventWire.ledgerEntryCreated] — [WalletLedgerEntryType.wireValue].
enum WalletLedgerEntryType {
  creditPending('credit_pending'),
  creditAvailable('credit_available'),
  debitSpend('debit_spend'),
  debitWithdrawal('debit_withdrawal'),
  debitConversion('debit_conversion'),
  creditConversion('credit_conversion'),
  lock('lock'),
  unlock('unlock'),
  clawback('clawback'),
  expire('expire'),
  adminAdjustment('admin_adjustment');

  const WalletLedgerEntryType(this.wireValue);
  final String wireValue;
}

/// Wire: [WalletEventWire.ledgerEntryCreated] — [WalletBalanceBucket.wireValue].
enum WalletBalanceBucket {
  pending('pending'),
  available('available'),
  locked('locked'),
  withdrawn('withdrawn'),
  spent('spent'),
  expired('expired'),
  clawedBack('clawed_back');

  const WalletBalanceBucket(this.wireValue);
  final String wireValue;
}

/// Base type for wallet-domain accounting events on [EventBus].
///
/// Instances are **facts** (append-only); callers must not mutate fields after
/// construction. Prefer `const` constructors where possible.
sealed class WalletEvent {
  const WalletEvent();
}

/// Wire: `wallet.value_lot.created`
final class WalletValueLotCreatedEvent extends WalletEvent {
  const WalletValueLotCreatedEvent({
    required this.valueLotId,
    required this.userId,
    required this.sourceType,
    required this.sourceId,
    required this.originalAmount,
    required this.currency,
    required this.initialState,
    this.pendingUntil,
    required this.trustScoreAtCreation,
    required this.fraudRiskAtCreation,
  });

  final String valueLotId;
  final String userId;
  final WalletValueLotSourceType sourceType;
  final String sourceId;
  final double originalAmount;
  final WalletCurrency currency;
  final WalletValueLotInitialState initialState;

  /// ISO-8601 timestamp when pending clears, if applicable.
  final String? pendingUntil;
  final double trustScoreAtCreation;
  final double fraudRiskAtCreation;
}

/// Wire: `wallet.value_lot.available`
final class WalletValueLotAvailableEvent extends WalletEvent {
  const WalletValueLotAvailableEvent({
    required this.valueLotId,
    required this.userId,
    required this.amount,
    required this.currency,
    required this.availableAt,
  });

  final String valueLotId;
  final String userId;
  final double amount;
  final WalletCurrency currency;

  /// ISO-8601 timestamp when value became available.
  final String availableAt;
}

/// Wire: `wallet.value_lot.locked`
final class WalletValueLotLockedEvent extends WalletEvent {
  const WalletValueLotLockedEvent({
    required this.valueLotId,
    required this.userId,
    required this.amount,
    required this.currency,
    required this.reason,
  });

  final String valueLotId;
  final String userId;
  final double amount;
  final WalletCurrency currency;
  final WalletValueLotLockReason reason;
}

/// Wire: `wallet.value_lot.spent`
final class WalletValueLotSpentEvent extends WalletEvent {
  const WalletValueLotSpentEvent({
    required this.valueLotId,
    required this.userId,
    required this.amount,
    required this.currency,
    required this.spendType,
    required this.spendId,
  });

  final String valueLotId;
  final String userId;
  final double amount;
  final WalletCurrency currency;
  final WalletValueLotSpendType spendType;
  final String spendId;
}

/// Wire: `wallet.ledger_entry.created`
final class WalletLedgerEntryCreatedEvent extends WalletEvent {
  const WalletLedgerEntryCreatedEvent({
    required this.ledgerEntryId,
    required this.userId,
    this.valueLotId,
    required this.entryType,
    required this.amount,
    required this.currency,
    required this.balanceBucket,
    required this.sourceEventId,
  });

  final String ledgerEntryId;
  final String userId;
  final String? valueLotId;
  final WalletLedgerEntryType entryType;
  final double amount;
  final WalletCurrency currency;
  final WalletBalanceBucket balanceBucket;
  final String sourceEventId;
}

/// Wire: `wallet.balance.projected` — optional projection for debugging.
final class WalletBalanceProjectedEvent extends WalletEvent {
  const WalletBalanceProjectedEvent({
    required this.userId,
    required this.pending,
    required this.available,
    required this.locked,
    required this.withdrawn,
    required this.spent,
    required this.currency,
    required this.ledgerEntryId,
  });

  final String userId;
  final double pending;
  final double available;
  final double locked;
  final double withdrawn;
  final double spent;
  final WalletCurrency currency;
  final String ledgerEntryId;
}
