import 'package:eye_tracking_app/core/events/withdrawal_event.dart';
import 'package:eye_tracking_app/core/system.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('WithdrawalRequestedEvent holds catalog fields', () {
    const e = WithdrawalRequestedEvent(
      withdrawalId: 'w1',
      userId: 'u1',
      amount: 42.5,
      currency: WithdrawalCurrency.usd,
      destinationType: WithdrawalDestinationType.bank,
      destinationId: 'ba_123',
    );
    expect(e.withdrawalId, 'w1');
    expect(e.userId, 'u1');
    expect(e.amount, 42.5);
    expect(e.currency, WithdrawalCurrency.usd);
    expect(e.destinationType, WithdrawalDestinationType.bank);
    expect(e.destinationId, 'ba_123');
  });

  test('destination and rejection wire values match spec', () {
    expect(WithdrawalDestinationType.cryptoWallet.wireValue, 'crypto_wallet');
    expect(WithdrawalDestinationType.giftCard.wireValue, 'gift_card');
    expect(
      WithdrawalRejectedReason.insufficientAvailableBalance.wireValue,
      'insufficient_available_balance',
    );
    expect(WithdrawalRejectedReason.kycRequired.wireValue, 'kyc_required');
  });

  test('WithdrawalCompletedEvent carries provider id and timestamp', () {
    const e = WithdrawalCompletedEvent(
      withdrawalId: 'w',
      userId: 'u',
      amount: 10,
      currency: WithdrawalCurrency.usd,
      providerTransactionId: 'txn_abc',
      completedAt: '2026-04-25T12:00:00.000Z',
    );
    expect(e.providerTransactionId, 'txn_abc');
    expect(e.completedAt, '2026-04-25T12:00:00.000Z');
  });

  test('EventBus forwards withdrawal events', () async {
    final bus = EventBus();
    final seen = <WithdrawalEvent>[];
    final sub = bus.withdrawalEvents.listen(seen.add);

    bus.emit(
      const WithdrawalFailedEvent(
        withdrawalId: 'w',
        userId: 'u',
        amount: 5,
        currency: WithdrawalCurrency.usd,
        reason: 'provider_timeout',
        retryable: true,
      ),
    );

    await Future<void>.delayed(Duration.zero);
    expect(seen, hasLength(1));
    expect(seen.single, isA<WithdrawalFailedEvent>());
    expect((seen.single as WithdrawalFailedEvent).retryable, true);
    await sub.cancel();
  });
}
