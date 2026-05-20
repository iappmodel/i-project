import 'package:eye_tracking_app/core/events/conversion_event.dart';
import 'package:eye_tracking_app/core/events/wallet_event.dart';
import 'package:eye_tracking_app/core/system.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('ConversionRequestedEvent holds catalog fields', () {
    const e = ConversionRequestedEvent(
      conversionId: 'c1',
      userId: 'u1',
      fromCurrency: WalletCurrency.usd,
      toCurrency: WalletCurrency.icoin,
      fromAmount: 10,
      quotedToAmount: 1000,
      quoteId: 'q1',
    );
    expect(e.conversionId, 'c1');
    expect(e.userId, 'u1');
    expect(e.fromCurrency, WalletCurrency.usd);
    expect(e.toCurrency, WalletCurrency.icoin);
    expect(e.fromAmount, 10);
    expect(e.quotedToAmount, 1000);
    expect(e.quoteId, 'q1');
  });

  test('ConversionCompletedEvent holds rate and settled amounts', () {
    const e = ConversionCompletedEvent(
      conversionId: 'c2',
      userId: 'u2',
      fromCurrency: WalletCurrency.icoin,
      toCurrency: WalletCurrency.vcoin,
      fromAmount: 500,
      toAmount: 48.5,
      rate: 0.097,
    );
    expect(e.toAmount, 48.5);
    expect(e.rate, 0.097);
  });

  test('ConversionFailedReason wire values match spec', () {
    expect(
      ConversionFailedReason.insufficientBalance.wireValue,
      'insufficient_balance',
    );
    expect(ConversionFailedReason.quoteExpired.wireValue, 'quote_expired');
    expect(
      ConversionFailedReason.currencyPairDisabled.wireValue,
      'currency_pair_disabled',
    );
    expect(ConversionFailedReason.trustRestricted.wireValue, 'trust_restricted');
    expect(ConversionFailedReason.systemError.wireValue, 'system_error');
  });

  test('EventBus forwards conversion events', () async {
    final bus = EventBus();
    final seen = <ConversionEvent>[];
    final sub = bus.conversionEvents.listen(seen.add);

    bus.emit(
      const ConversionFailedEvent(
        conversionId: 'c',
        userId: 'u',
        reason: ConversionFailedReason.quoteExpired,
      ),
    );

    await Future<void>.delayed(Duration.zero);
    expect(seen, hasLength(1));
    expect(seen.single, isA<ConversionFailedEvent>());
    await sub.cancel();
  });
}
