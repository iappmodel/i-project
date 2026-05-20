// Product telemetry catalog §12 — conversion.* payloads (local types + bus only).

import 'wallet_event.dart';

/// Stable wire names for conversion domain events.
abstract final class ConversionEventWire {
  static const requested = 'conversion.requested';
  static const completed = 'conversion.completed';
  static const failed = 'conversion.failed';
}

/// Wire: [ConversionEventWire.failed] — machine-readable failure reason.
enum ConversionFailedReason {
  insufficientBalance('insufficient_balance'),
  quoteExpired('quote_expired'),
  currencyPairDisabled('currency_pair_disabled'),
  trustRestricted('trust_restricted'),
  systemError('system_error');

  const ConversionFailedReason(this.wireValue);
  final String wireValue;
}

/// Base type for currency-conversion domain events on [EventBus].
sealed class ConversionEvent {
  const ConversionEvent();
}

/// Wire: `conversion.requested`
final class ConversionRequestedEvent extends ConversionEvent {
  const ConversionRequestedEvent({
    required this.conversionId,
    required this.userId,
    required this.fromCurrency,
    required this.toCurrency,
    required this.fromAmount,
    required this.quotedToAmount,
    required this.quoteId,
  });

  final String conversionId;
  final String userId;
  final WalletCurrency fromCurrency;
  final WalletCurrency toCurrency;
  final double fromAmount;
  final double quotedToAmount;
  final String quoteId;
}

/// Wire: `conversion.completed`
final class ConversionCompletedEvent extends ConversionEvent {
  const ConversionCompletedEvent({
    required this.conversionId,
    required this.userId,
    required this.fromCurrency,
    required this.toCurrency,
    required this.fromAmount,
    required this.toAmount,
    required this.rate,
  });

  final String conversionId;
  final String userId;
  final WalletCurrency fromCurrency;
  final WalletCurrency toCurrency;
  final double fromAmount;
  final double toAmount;
  final double rate;
}

/// Wire: `conversion.failed`
final class ConversionFailedEvent extends ConversionEvent {
  const ConversionFailedEvent({
    required this.conversionId,
    required this.userId,
    required this.reason,
  });

  final String conversionId;
  final String userId;
  final ConversionFailedReason reason;
}
