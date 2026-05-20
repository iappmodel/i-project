import 'package:eye_tracking_app/value_lot_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ValueLotEngine', () {
    test('campaign reward: pending → available after pendingUntil, then partial spend', () {
      final engine = ValueLotEngine();
      final t0 = DateTime.utc(2026, 4, 25, 10);
      final pendingUntil = t0.add(const Duration(hours: 6));

      final lot = engine.createPending(
        userId: 'u1',
        sourceType: ValueLotSourceType.campaignReward,
        sourceId: 'campaign-a',
        amount: 0.35,
        currency: ValueLotCurrency.usd,
        now: t0,
        pendingUntil: pendingUntil,
        trustScoreAtCreation: 0.82,
        fraudRiskAtCreation: 0.05,
        metadata: const <String, Object?>{'campaignId': 'c-a'},
      );

      expect(lot.state, ValueLotState.pending);
      expect(lot.remainingAmount, closeTo(0.35, 1e-9));
      expect(lot.sourceType.wireName, 'campaign_reward');
      expect(lot.currency.wireName, 'USD');

      expect(
        () => engine.tryReleasePending(lotId: lot.lotId, now: t0.add(const Duration(hours: 1))),
        throwsA(isA<ValueLotEngineException>()),
      );

      final avail = engine.tryReleasePending(lotId: lot.lotId, now: pendingUntil);
      expect(avail.state, ValueLotState.available);
      expect(avail.availableAt, isNotNull);

      final afterSpend = engine.spend(lotId: lot.lotId, amount: 0.10, now: pendingUntil.add(const Duration(minutes: 1)));
      expect(afterSpend.state, ValueLotState.available);
      expect(afterSpend.remainingAmount, closeTo(0.25, 1e-9));

      final depleted = engine.spend(lotId: lot.lotId, amount: 0.25, now: pendingUntil.add(const Duration(minutes: 2)));
      expect(depleted.state, ValueLotState.spent);
      expect(depleted.remainingAmount, 0);
    });

    test('withdrawAll zeros remaining from available', () {
      final engine = ValueLotEngine();
      final now = DateTime.utc(2026, 1, 1);
      final lot = engine.createPending(
        lotId: 'fixed-id',
        userId: 'u2',
        sourceType: ValueLotSourceType.referral,
        sourceId: 'ref-1',
        amount: 10,
        currency: ValueLotCurrency.rcoin,
        now: now,
      );
      engine.forceAvailable(lotId: lot.lotId, now: now);
      final w = engine.withdrawAll(lotId: lot.lotId, now: now.add(const Duration(seconds: 1)));
      expect(w.state, ValueLotState.withdrawn);
      expect(w.remainingAmount, 0);
    });

    test('clawBack from pending with reason in metadata', () {
      final engine = ValueLotEngine();
      final now = DateTime.utc(2026, 6, 1);
      final lot = engine.createPending(
        userId: 'u3',
        sourceType: ValueLotSourceType.campaignReward,
        sourceId: 'c2',
        amount: 1,
        currency: ValueLotCurrency.usd,
        now: now,
      );
      final c = engine.clawBack(lotId: lot.lotId, now: now, reason: 'fraud_review');
      expect(c.state, ValueLotState.clawedBack);
      expect(c.metadata['clawBackReason'], 'fraud_review');
      expect(c.metadata['clawedBackAt'], isNotNull);
    });

    test('clawBack rejects empty reason', () {
      final engine = ValueLotEngine();
      final now = DateTime.utc(2026, 6, 2);
      final lot = engine.createPending(
        userId: 'u3b',
        sourceType: ValueLotSourceType.campaignReward,
        sourceId: 'c2b',
        amount: 1,
        currency: ValueLotCurrency.usd,
        now: now,
      );
      expect(
        () => engine.clawBack(lotId: lot.lotId, now: now, reason: '  '),
        throwsA(isA<ValueLotEngineException>()),
      );
    });

    test('lock and unlock preserve remaining', () {
      final engine = ValueLotEngine();
      final now = DateTime.utc(2026, 3, 1);
      final lot = engine.createPending(
        userId: 'u4',
        sourceType: ValueLotSourceType.bonus,
        sourceId: 'b1',
        amount: 5,
        currency: ValueLotCurrency.icoin,
        now: now,
      );
      engine.forceAvailable(lotId: lot.lotId, now: now);
      engine.lock(lotId: lot.lotId, now: now, reason: 'fraud_review_hold');
      final locked = engine.lot(lot.lotId)!;
      expect(locked.state, ValueLotState.locked);
      expect(locked.metadata['lockReason'], 'fraud_review_hold');
      expect(locked.metadata['lockedAt'], isNotNull);
      engine.unlock(
        lotId: lot.lotId,
        now: now.add(const Duration(seconds: 1)),
        reason: 'review_cleared',
      );
      final after = engine.lot(lot.lotId)!;
      expect(after.state, ValueLotState.available);
      expect(after.remainingAmount, 5);
      expect(after.metadata['unlockReason'], 'review_cleared');
      expect(after.metadata['unlockedAt'], isNotNull);
    });

    test('tryExpire marks expired when past expiresAt', () {
      final engine = ValueLotEngine();
      final now = DateTime.utc(2026, 7, 1, 12);
      final exp = now.add(const Duration(days: 30));
      final lot = engine.createPending(
        userId: 'u5',
        sourceType: ValueLotSourceType.creatorPayout,
        sourceId: 'p1',
        amount: 2,
        currency: ValueLotCurrency.usd,
        now: now,
        expiresAt: exp,
      );
      engine.forceAvailable(lotId: lot.lotId, now: now);
      final after = engine.tryExpire(lotId: lot.lotId, now: exp.add(const Duration(seconds: 1)))!;
      expect(after.state, ValueLotState.expired);
      expect(after.remainingAmount, 0);
    });

    test('convertToCurrency closes lot and creates pending child in new currency', () {
      final engine = ValueLotEngine();
      final now = DateTime.utc(2026, 8, 1);
      final parent = engine.createPending(
        userId: 'u6',
        sourceType: ValueLotSourceType.campaignReward,
        sourceId: 'c3',
        amount: 1.0,
        currency: ValueLotCurrency.usd,
        now: now,
      );
      engine.forceAvailable(lotId: parent.lotId, now: now);
      final child = engine.convertToCurrency(
        lotId: parent.lotId,
        newCurrency: ValueLotCurrency.icoin,
        conversionRate: 100,
        now: now.add(const Duration(minutes: 1)),
      );
      expect(engine.lot(parent.lotId)!.state, ValueLotState.spent);
      expect(child.currency, ValueLotCurrency.icoin);
      expect(child.remainingAmount, closeTo(100, 1e-9));
      expect(child.state, ValueLotState.pending);
      expect(child.metadata['parentLotId'], parent.lotId);
    });

    test('lotsForUser filters by userId', () {
      final engine = ValueLotEngine();
      final t = DateTime.utc(2026, 1, 1);
      engine.createPending(
        userId: 'a',
        sourceType: ValueLotSourceType.manualAdjustment,
        sourceId: 'adj',
        amount: 1,
        currency: ValueLotCurrency.usd,
        now: t,
      );
      engine.createPending(
        userId: 'b',
        sourceType: ValueLotSourceType.manualAdjustment,
        sourceId: 'adj2',
        amount: 2,
        currency: ValueLotCurrency.usd,
        now: t,
      );
      expect(engine.lotsForUser('a'), hasLength(1));
      expect(engine.lotsForUser('b'), hasLength(1));
    });
  });
}
