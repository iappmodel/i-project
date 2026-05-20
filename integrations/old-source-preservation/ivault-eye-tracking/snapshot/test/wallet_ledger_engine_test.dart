import 'package:eye_tracking_app/core/events/system_event.dart';
import 'package:eye_tracking_app/core/events/wallet_event.dart';
import 'package:eye_tracking_app/wallet_ledger_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('WalletLedgerEngine', () {
    const wallet = 'w1';
    const user = 'u1';
    final t0 = DateTime(2026, 4, 25, 12);

    test('rejects campaign reward without campaign id', () {
      final eng = WalletLedgerEngine();
      final r = eng.issueCampaignReward(
        walletId: wallet,
        userId: user,
        campaignId: '',
        sourceCampaignEventId: 'rv-1',
        amountUsd: 1,
        now: t0,
      );
      expect(r.success, false);
      expect(r.error, contains('campaign'));
    });

    test('rejects campaign reward without source event id', () {
      final eng = WalletLedgerEngine();
      final r = eng.issueCampaignReward(
        walletId: wallet,
        userId: user,
        campaignId: 'c1',
        sourceCampaignEventId: '   ',
        amountUsd: 1,
        now: t0,
      );
      expect(r.success, false);
    });

    test('every reward creates ValueLot and LedgerEntry; balance derived', () {
      final eng = WalletLedgerEngine();
      expect(
        eng.issueCampaignReward(
          walletId: wallet,
          userId: user,
          campaignId: 'c1',
          sourceCampaignEventId: 'rv-1',
          amountUsd: 5,
          now: t0,
        ).success,
        true,
      );

      expect(eng.ledgerEntries.length, 1);
      expect(eng.ledgerEntries.single.kind, LedgerEntryKind.rewardPendingMint);
      expect(eng.lotsForWallet(wallet).length, 1);
      final lot = eng.lotsForWallet(wallet).single;
      expect(lot.pendingUsd, 5);
      expect(lot.availableUsd, 0);

      final bal = eng.balanceForWallet(wallet);
      expect(bal.pendingUsd, 5);
      expect(bal.availableUsd, 0);
      expect(bal.totalUsd, 5);
    });

    test('issueCampaignReward respects forcedValueLotId', () {
      final eng = WalletLedgerEngine();
      const forcedId = 'lot-forced-1';
      expect(
        eng.issueCampaignReward(
          walletId: wallet,
          userId: user,
          campaignId: 'c1',
          sourceCampaignEventId: 'rv-forced',
          amountUsd: 2,
          now: t0,
          forcedValueLotId: forcedId,
        ).success,
        true,
      );
      final lot = eng.lotById(forcedId);
      expect(lot, isNotNull);
      expect(lot!.id, forcedId);
      expect(lot.pendingUsd, 2);
    });

    test('pending to available creates LedgerEntry and updates derived balance', () {
      final eng = WalletLedgerEngine();
      eng.issueCampaignReward(
        walletId: wallet,
        userId: user,
        campaignId: 'c1',
        sourceCampaignEventId: 'rv-1',
        amountUsd: 3,
        now: t0,
      );
      final lotId = eng.lotsForWallet(wallet).single.id;

      expect(eng.releasePendingToAvailable(valueLotId: lotId, now: t0).success, true);
      expect(eng.ledgerEntries.length, 2);
      expect(eng.ledgerEntries.last.kind, LedgerEntryKind.pendingToAvailable);

      final lot = eng.lotById(lotId)!;
      expect(lot.pendingUsd, 0);
      expect(lot.availableUsd, 3);

      final bal = eng.balanceForWallet(wallet);
      expect(bal.availableUsd, 3);
      expect(bal.pendingUsd, 0);
    });

    test('no withdrawal without cleared available value', () {
      final eng = WalletLedgerEngine();
      eng.issueCampaignReward(
        walletId: wallet,
        userId: user,
        campaignId: 'c1',
        sourceCampaignEventId: 'rv-1',
        amountUsd: 4,
        now: t0,
      );
      final r = eng.requestWithdrawal(
        walletId: wallet,
        userId: user,
        amountUsd: 1,
        now: t0,
      );
      expect(r.success, false);
      expect(r.error, contains('available'));
    });

    test('withdrawal request locks FIFO then completes to withdrawn', () {
      final eng = WalletLedgerEngine();
      eng.issueCampaignReward(
        walletId: wallet,
        userId: user,
        campaignId: 'c1',
        sourceCampaignEventId: 'rv-a',
        amountUsd: 2,
        now: t0,
      );
      eng.issueCampaignReward(
        walletId: wallet,
        userId: user,
        campaignId: 'c1',
        sourceCampaignEventId: 'rv-b',
        amountUsd: 5,
        now: t0.add(const Duration(seconds: 1)),
      );
      final lots = eng.lotsForWallet(wallet)
        ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
      eng.releasePendingToAvailable(valueLotId: lots[0].id, now: t0);
      eng.releasePendingToAvailable(valueLotId: lots[1].id, now: t0);

      final req = eng.requestWithdrawal(
        walletId: wallet,
        userId: user,
        amountUsd: 6,
        now: t0,
      );
      expect(req.success, true);
      expect(req.withdrawalId, isNotNull);

      final balLocked = eng.balanceForWallet(wallet);
      expect(balLocked.availableUsd, 1);
      expect(balLocked.lockedUsd, 6);

      expect(eng.completeWithdrawal(req.withdrawalId!, now: t0).success, true);
      final balDone = eng.balanceForWallet(wallet);
      expect(balDone.lockedUsd, 0);
      expect(balDone.withdrawnUsd, 6);
      expect(balDone.availableUsd, 1);
    });

    test('cancelWithdrawal restores available from locked', () {
      final eng = WalletLedgerEngine();
      eng.issueCampaignReward(
        walletId: wallet,
        userId: user,
        campaignId: 'c1',
        sourceCampaignEventId: 'rv-1',
        amountUsd: 10,
        now: t0,
      );
      final lid = eng.lotsForWallet(wallet).single.id;
      eng.releasePendingToAvailable(valueLotId: lid, now: t0);

      final req = eng.requestWithdrawal(
        walletId: wallet,
        userId: user,
        amountUsd: 4,
        now: t0,
      );
      expect(eng.cancelWithdrawal(req.withdrawalId!, now: t0).success, true);
      final bal = eng.balanceForWallet(wallet);
      expect(bal.availableUsd, 10);
      expect(bal.lockedUsd, 0);
    });

    test('conversion debits source and credits destination with ledger entries', () {
      final eng = WalletLedgerEngine();
      eng.issueCampaignReward(
        walletId: wallet,
        userId: user,
        campaignId: 'c1',
        sourceCampaignEventId: 'rv-1',
        amountUsd: 10,
        now: t0,
      );
      final srcId = eng.lotsForWallet(wallet).single.id;
      eng.releasePendingToAvailable(valueLotId: srcId, now: t0);

      final conv = eng.convertAvailableToNewLot(
        walletId: wallet,
        userId: user,
        sourceLotId: srcId,
        amountUsd: 4,
        now: t0,
      );
      expect(conv.success, true);
      expect(conv.conversionId, isNotNull);

      final src = eng.lotById(srcId)!;
      expect(src.originalUsd, 6);
      expect(src.availableUsd, 6);

      final dest = eng.lotsForWallet(wallet).where((l) => l.id != srcId).single;
      expect(dest.originalUsd, 4);
      expect(dest.availableUsd, 4);
      expect(dest.campaignId, '');

      expect(
        eng.ledgerEntries.where((e) => e.referenceId == conv.conversionId).length,
        2,
      );

      final total = eng.balanceForWallet(wallet).totalUsd;
      expect(total, 10);
    });

    test('projection mirrors lots after each ledger append', () {
      final eng = WalletLedgerEngine();
      eng.issueCampaignReward(
        walletId: wallet,
        userId: user,
        campaignId: 'c1',
        sourceCampaignEventId: 'rv-1',
        amountUsd: 7,
        now: t0,
      );
      final projPending = eng.projectionForWallet(wallet)!;
      expect(projPending.pendingUsd, 7);
      expect(eng.verifyProjectionMatchesLots(wallet), true);

      final lotId = eng.lotsForWallet(wallet).single.id;
      eng.releasePendingToAvailable(valueLotId: lotId, now: t0);
      final projAvail = eng.projectionForWallet(wallet)!;
      expect(projAvail.availableUsd, 7);
      expect(projAvail.pendingUsd, 0);
      expect(eng.verifyProjectionMatchesLots(wallet), true);
    });

    test('onAccounting emits value_lot, ledger, projection, system for mint', () {
      WalletAccountingEmission? captured;
      final eng = WalletLedgerEngine(
        onAccounting: (e) => captured = e,
      );
      expect(
        eng.issueCampaignReward(
          walletId: wallet,
          userId: user,
          campaignId: 'c1',
          sourceCampaignEventId: 'rv-acct',
          amountUsd: 11,
          now: t0,
        ).success,
        true,
      );
      expect(captured, isNotNull);
      expect(captured!.walletEvents.length, 3);
      expect(captured!.walletEvents[0], isA<WalletValueLotCreatedEvent>());
      expect(captured!.walletEvents[1], isA<WalletLedgerEntryCreatedEvent>());
      expect(captured!.walletEvents[2], isA<WalletBalanceProjectedEvent>());
      expect(captured!.systemEvent, isA<SystemJobCompletedEvent>());
      final sys = captured!.systemEvent as SystemJobCompletedEvent;
      expect(sys.processedCount, 1);
      expect(sys.jobType, SystemJobType.walletProjection.wireValue);
    });

    test('withdrawal request batches ledger lines into one system job', () {
      WalletAccountingEmission? captured;
      final eng = WalletLedgerEngine(
        onAccounting: (e) => captured = e,
      );
      eng.issueCampaignReward(
        walletId: wallet,
        userId: user,
        campaignId: 'c1',
        sourceCampaignEventId: 'rv-x',
        amountUsd: 2,
        now: t0,
      );
      eng.issueCampaignReward(
        walletId: wallet,
        userId: user,
        campaignId: 'c1',
        sourceCampaignEventId: 'rv-y',
        amountUsd: 5,
        now: t0.add(const Duration(seconds: 1)),
      );
      final lots = eng.lotsForWallet(wallet)
        ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
      eng.releasePendingToAvailable(valueLotId: lots[0].id, now: t0);
      eng.releasePendingToAvailable(valueLotId: lots[1].id, now: t0);

      captured = null;
      final req = eng.requestWithdrawal(
        walletId: wallet,
        userId: user,
        amountUsd: 6,
        now: t0,
      );
      expect(req.success, true);
      expect(captured, isNotNull);
      final sys = captured!.systemEvent as SystemJobCompletedEvent;
      expect(sys.processedCount, 2);
      expect(captured!.walletEvents.whereType<WalletLedgerEntryCreatedEvent>().length, 2);
      expect(captured!.walletEvents.whereType<WalletValueLotLockedEvent>().length, 2);
      expect(captured!.walletEvents.last, isA<WalletBalanceProjectedEvent>());
    });
  });
}
