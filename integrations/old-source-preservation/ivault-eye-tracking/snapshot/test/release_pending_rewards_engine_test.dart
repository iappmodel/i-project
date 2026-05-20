import 'package:eye_tracking_app/canonical/build_spec_v01.dart';
import 'package:eye_tracking_app/economy/release_pending_rewards_engine.dart';
import 'package:eye_tracking_app/policy_version.dart';
import 'package:eye_tracking_app/trust_engine.dart';
import 'package:eye_tracking_app/value_lot_engine.dart';
import 'package:eye_tracking_app/wallet_ledger_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ReleasePendingRewardsEngine', () {
    test('releases pending when pending_until reached; ledger + events + projection',
        () {
      final t0 = DateTime.utc(2026, 1, 1, 12);
      final until = t0.add(const Duration(hours: 1));
      final runAt = until.add(const Duration(seconds: 1));

      final vl = ValueLotEngine();
      vl.createPending(
        lotId: 'lot-shared-1',
        userId: 'user-a',
        sourceType: ValueLotSourceType.campaignReward,
        sourceId: 'src-1',
        amount: 5,
        currency: ValueLotCurrency.usd,
        now: t0,
        pendingUntil: until,
      );

      final ledger = WalletLedgerEngine();
      ledger.issueCampaignReward(
        walletId: 'user-a',
        userId: 'user-a',
        campaignId: 'camp',
        sourceCampaignEventId: 'dec-1',
        amountUsd: 5,
        now: t0,
        forcedValueLotId: 'lot-shared-1',
      );

      final trust = TrustScoreSnapshot(
        userId: 'user-a',
        score: 600,
        level: TrustScoreLevel.normal,
        payoutDelayHours: 6,
        dailyEarnLimit: 50,
        dailyWithdrawalLimit: 25,
        campaignAccessTier: 2,
        riskFlags: const [],
        positiveSignals: const [],
        updatedAt: t0.toUtc().toIso8601String(),
        policyVersionId: kBootstrapPolicyVersionId,
      );

      final eng = ReleasePendingRewardsEngine();
      final out = eng.run(
        valueLots: vl,
        ledger: ledger,
        now: runAt,
        trustSnapshot: (_) => trust,
        fraudBlocksRelease: (_) => false,
        correlationId: 'corr-1',
      );

      expect(out.applied, hasLength(1));
      expect(out.applied.single.lotId, 'lot-shared-1');
      expect(out.applied.single.ledgerEntryId, isNotNull);
      expect(vl.lot('lot-shared-1')!.state, ValueLotState.available);
      expect(ledger.lotById('lot-shared-1')!.pendingUsd, 0);
      expect(ledger.lotById('lot-shared-1')!.availableUsd, 5);

      expect(out.projections.single.availableUsd, 5);
      expect(out.events.where((e) => e.eventType == CanonicalWalletEventTypesV01.valueLotAvailable), hasLength(1));
      expect(out.events.where((e) => e.eventType == CanonicalWalletEventTypesV01.ledgerEntryCreated), hasLength(1));
      expect(out.events.where((e) => e.eventType == CanonicalWalletEventTypesV01.balanceProjected), hasLength(1));
    });

    test('skips when trust level is restricted', () {
      final t0 = DateTime.utc(2026, 2, 1);
      final vl = ValueLotEngine();
      vl.createPending(
        userId: 'u1',
        sourceType: ValueLotSourceType.bonus,
        sourceId: 'b1',
        amount: 1,
        currency: ValueLotCurrency.usd,
        now: t0,
      );

      final ledger = WalletLedgerEngine();
      final snap = TrustScoreSnapshot(
        userId: 'u1',
        score: 0,
        level: TrustScoreLevel.restricted,
        payoutDelayHours: 0,
        dailyEarnLimit: 0,
        dailyWithdrawalLimit: 0,
        campaignAccessTier: 0,
        riskFlags: const ['blocked'],
        positiveSignals: const [],
        updatedAt: t0.toUtc().toIso8601String(),
        policyVersionId: kBootstrapPolicyVersionId,
      );

      final out = ReleasePendingRewardsEngine().run(
        valueLots: vl,
        ledger: ledger,
        now: t0,
        trustSnapshot: (_) => snap,
      );

      expect(out.applied, isEmpty);
      expect(out.skipped.single.reason, 'trust_restricted');
      expect(vl.lotsForUser('u1').single.state, ValueLotState.pending);
    });

    test('skips when fraudBlocksRelease is true', () {
      final t0 = DateTime.utc(2026, 3, 1);
      final vl = ValueLotEngine();
      vl.createPending(
        userId: 'u2',
        sourceType: ValueLotSourceType.bonus,
        sourceId: 'b2',
        amount: 2,
        currency: ValueLotCurrency.usd,
        now: t0,
      );

      final out = ReleasePendingRewardsEngine().run(
        valueLots: vl,
        ledger: WalletLedgerEngine(),
        now: t0,
        fraudBlocksRelease: (id) => id == 'u2',
      );

      expect(out.skipped.single.reason, 'fraud_hold');
      expect(out.applied, isEmpty);
    });

    test('does not pick lot before pending_until', () {
      final t0 = DateTime.utc(2026, 4, 1);
      final until = t0.add(const Duration(days: 1));
      final vl = ValueLotEngine();
      vl.createPending(
        userId: 'u3',
        sourceType: ValueLotSourceType.bonus,
        sourceId: 'b3',
        amount: 3,
        currency: ValueLotCurrency.usd,
        now: t0,
        pendingUntil: until,
      );

      final out = ReleasePendingRewardsEngine().run(
        valueLots: vl,
        ledger: WalletLedgerEngine(),
        now: t0,
      );

      expect(out.applied, isEmpty);
      expect(out.skipped, isEmpty);
    });
  });
}
