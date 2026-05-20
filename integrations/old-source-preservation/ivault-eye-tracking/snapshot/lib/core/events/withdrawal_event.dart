// Product telemetry catalog §11 — withdrawal.* payloads (local types + bus only).

/// Stable wire names for withdrawal domain events.
abstract final class WithdrawalEventWire {
  static const requested = 'withdrawal.requested';
  static const approved = 'withdrawal.approved';
  static const rejected = 'withdrawal.rejected';
  static const completed = 'withdrawal.completed';
  static const failed = 'withdrawal.failed';
}

/// Wire: [WithdrawalEventWire.*] — payout currency (spec: USD only).
enum WithdrawalCurrency {
  usd('USD');

  const WithdrawalCurrency(this.wireValue);
  final String wireValue;
}

/// Wire: [WithdrawalEventWire.requested] — [WithdrawalDestinationType.wireValue].
enum WithdrawalDestinationType {
  bank('bank'),
  paypal('paypal'),
  cashapp('cashapp'),
  cryptoWallet('crypto_wallet'),
  giftCard('gift_card');

  const WithdrawalDestinationType(this.wireValue);
  final String wireValue;
}

/// Wire: [WithdrawalEventWire.approved] — who authorized the payout.
enum WithdrawalApprovedBy {
  system('system'),
  admin('admin');

  const WithdrawalApprovedBy(this.wireValue);
  final String wireValue;
}

/// Wire: [WithdrawalEventWire.rejected] — machine-readable deny reason.
enum WithdrawalRejectedReason {
  insufficientAvailableBalance('insufficient_available_balance'),
  trustTooLow('trust_too_low'),
  fraudReview('fraud_review'),
  dailyLimitExceeded('daily_limit_exceeded'),
  destinationInvalid('destination_invalid'),
  kycRequired('kyc_required');

  const WithdrawalRejectedReason(this.wireValue);
  final String wireValue;
}

/// Base type for withdrawal-domain events on [EventBus].
sealed class WithdrawalEvent {
  const WithdrawalEvent();
}

/// Wire: `withdrawal.requested`
final class WithdrawalRequestedEvent extends WithdrawalEvent {
  const WithdrawalRequestedEvent({
    required this.withdrawalId,
    required this.userId,
    required this.amount,
    required this.currency,
    required this.destinationType,
    required this.destinationId,
  });

  final String withdrawalId;
  final String userId;
  final double amount;
  final WithdrawalCurrency currency;
  final WithdrawalDestinationType destinationType;
  final String destinationId;
}

/// Wire: `withdrawal.approved`
final class WithdrawalApprovedEvent extends WithdrawalEvent {
  const WithdrawalApprovedEvent({
    required this.withdrawalId,
    required this.userId,
    required this.amount,
    required this.currency,
    required this.approvedBy,
    required this.policyVersion,
  });

  final String withdrawalId;
  final String userId;
  final double amount;
  final WithdrawalCurrency currency;
  final WithdrawalApprovedBy approvedBy;
  final String policyVersion;
}

/// Wire: `withdrawal.rejected`
final class WithdrawalRejectedEvent extends WithdrawalEvent {
  const WithdrawalRejectedEvent({
    required this.withdrawalId,
    required this.userId,
    required this.amount,
    required this.currency,
    required this.reason,
    required this.policyVersion,
  });

  final String withdrawalId;
  final String userId;
  final double amount;
  final WithdrawalCurrency currency;
  final WithdrawalRejectedReason reason;
  final String policyVersion;
}

/// Wire: `withdrawal.completed`
final class WithdrawalCompletedEvent extends WithdrawalEvent {
  const WithdrawalCompletedEvent({
    required this.withdrawalId,
    required this.userId,
    required this.amount,
    required this.currency,
    required this.providerTransactionId,
    required this.completedAt,
  });

  final String withdrawalId;
  final String userId;
  final double amount;
  final WithdrawalCurrency currency;
  final String providerTransactionId;

  /// ISO-8601 timestamp when the provider confirmed settlement.
  final String completedAt;
}

/// Wire: `withdrawal.failed`
final class WithdrawalFailedEvent extends WithdrawalEvent {
  const WithdrawalFailedEvent({
    required this.withdrawalId,
    required this.userId,
    required this.amount,
    required this.currency,
    required this.reason,
    required this.retryable,
  });

  final String withdrawalId;
  final String userId;
  final double amount;
  final WithdrawalCurrency currency;
  final String reason;
  final bool retryable;
}
