import 'package:eye_tracking_app/core/events/wallet_event.dart';
import 'package:eye_tracking_app/core/system.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('WalletValueLotCreatedEvent holds catalog fields', () {
    const e = WalletValueLotCreatedEvent(
      valueLotId: 'vl1',
      userId: 'u1',
      sourceType: WalletValueLotSourceType.campaignReward,
      sourceId: 'src1',
      originalAmount: 10.5,
      currency: WalletCurrency.usd,
      initialState: WalletValueLotInitialState.pending,
      pendingUntil: '2026-04-26T00:00:00.000Z',
      trustScoreAtCreation: 0.82,
      fraudRiskAtCreation: 0.11,
    );
    expect(e.valueLotId, 'vl1');
    expect(e.sourceType.wireValue, 'campaign_reward');
    expect(e.currency.wireValue, 'USD');
    expect(e.initialState.wireValue, 'pending');
    expect(e.pendingUntil, '2026-04-26T00:00:00.000Z');
  });

  test('WalletLedgerEntryType wire values match spec', () {
    expect(WalletLedgerEntryType.creditPending.wireValue, 'credit_pending');
    expect(WalletLedgerEntryType.adminAdjustment.wireValue, 'admin_adjustment');
    expect(WalletLedgerEntryType.expire.wireValue, 'expire');
    expect(WalletBalanceBucket.spent.wireValue, 'spent');
    expect(WalletBalanceBucket.clawedBack.wireValue, 'clawed_back');
    expect(WalletBalanceBucket.expired.wireValue, 'expired');
  });

  test('EventBus forwards wallet events', () async {
    final bus = EventBus();
    final seen = <WalletEvent>[];
    final sub = bus.walletEvents.listen(seen.add);

    bus.emit(
      const WalletLedgerEntryCreatedEvent(
        ledgerEntryId: 'le1',
        userId: 'u',
        valueLotId: 'vl',
        entryType: WalletLedgerEntryType.creditAvailable,
        amount: 1,
        currency: WalletCurrency.icoin,
        balanceBucket: WalletBalanceBucket.available,
        sourceEventId: 'evt1',
      ),
    );

    await Future<void>.delayed(Duration.zero);
    expect(seen, hasLength(1));
    expect(seen.single, isA<WalletLedgerEntryCreatedEvent>());
    await sub.cancel();
  });

  test('WalletBalanceProjectedEvent carries five buckets', () {
    const e = WalletBalanceProjectedEvent(
      userId: 'u2',
      pending: 1,
      available: 2,
      locked: 3,
      withdrawn: 4,
      spent: 5,
      currency: WalletCurrency.vcoin,
      ledgerEntryId: 'le9',
    );
    expect(e.pending + e.available + e.locked + e.withdrawn + e.spent, 15);
    expect(e.currency.wireValue, 'VCOIN');
  });
}
