import 'package:eye_tracking_app/core/events/wallet_event.dart';
import 'package:eye_tracking_app/economy/wallet_ledger_projection_rules.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const zero = WalletProjectionTotals(
    pendingMinor: 0,
    availableMinor: 0,
    lockedMinor: 0,
    withdrawnMinor: 0,
    spentMinor: 0,
    expiredMinor: 0,
    clawedBackMinor: 0,
  );

  test('posting rules encode direction and bucket', () {
    expect(
      WalletLedgerProjectionRules.postingRules[WalletLedgerEntryType.creditPending]
          ?.direction,
      'credit',
    );
    expect(
      WalletLedgerProjectionRules.postingRules[WalletLedgerEntryType.unlock]?.bucket,
      WalletBalanceBucket.available,
    );
    expect(
      WalletLedgerProjectionRules.postingRules[WalletLedgerEntryType.debitWithdrawal]
          ?.bucket,
      WalletBalanceBucket.withdrawn,
    );
  });

  test('unlock moves pending to available', () {
    final start = zero.copyWith(pendingMinor: 100);
    final next = WalletLedgerProjectionRules.apply(
      totals: start,
      entryType: WalletLedgerEntryType.unlock,
      amountMinor: 40,
    );
    expect(next.pendingMinor, 60);
    expect(next.availableMinor, 40);
  });

  test('lock and debit withdrawal flow', () {
    final locked = WalletLedgerProjectionRules.apply(
      totals: zero.copyWith(availableMinor: 90),
      entryType: WalletLedgerEntryType.lock,
      amountMinor: 50,
    );
    expect(locked.availableMinor, 40);
    expect(locked.lockedMinor, 50);

    final withdrawn = WalletLedgerProjectionRules.apply(
      totals: locked,
      entryType: WalletLedgerEntryType.debitWithdrawal,
      amountMinor: 20,
    );
    expect(withdrawn.lockedMinor, 30);
    expect(withdrawn.withdrawnMinor, 20);
  });

  test('conversion debit then credit', () {
    final afterDebit = WalletLedgerProjectionRules.apply(
      totals: zero.copyWith(availableMinor: 120),
      entryType: WalletLedgerEntryType.debitConversion,
      amountMinor: 70,
    );
    expect(afterDebit.availableMinor, 50);
    expect(afterDebit.spentMinor, 70);

    final afterCredit = WalletLedgerProjectionRules.apply(
      totals: afterDebit,
      entryType: WalletLedgerEntryType.creditConversion,
      amountMinor: 55,
    );
    expect(afterCredit.availableMinor, 105);
  });

  test('clawback debits selected source bucket', () {
    final source = zero.copyWith(pendingMinor: 20, availableMinor: 30, lockedMinor: 40);
    final pendingCb = WalletLedgerProjectionRules.apply(
      totals: source,
      entryType: WalletLedgerEntryType.clawback,
      amountMinor: 10,
      sourceBucket: WalletProjectionSourceBucket.pending,
    );
    expect(pendingCb.pendingMinor, 10);
    expect(pendingCb.clawedBackMinor, 10);

    final availableCb = WalletLedgerProjectionRules.apply(
      totals: source,
      entryType: WalletLedgerEntryType.clawback,
      amountMinor: 12,
      sourceBucket: WalletProjectionSourceBucket.available,
    );
    expect(availableCb.availableMinor, 18);
    expect(availableCb.clawedBackMinor, 12);
  });

  test('expire supports pending/available and rejects locked source', () {
    final pendingExpired = WalletLedgerProjectionRules.apply(
      totals: zero.copyWith(pendingMinor: 25),
      entryType: WalletLedgerEntryType.expire,
      amountMinor: 5,
      sourceBucket: WalletProjectionSourceBucket.pending,
    );
    expect(pendingExpired.pendingMinor, 20);
    expect(pendingExpired.expiredMinor, 5);

    expect(
      () => WalletLedgerProjectionRules.apply(
        totals: zero.copyWith(lockedMinor: 10),
        entryType: WalletLedgerEntryType.expire,
        amountMinor: 1,
        sourceBucket: WalletProjectionSourceBucket.locked,
      ),
      throwsArgumentError,
    );
  });
}
