import 'package:eye_tracking_app/core/events/trust_event.dart';
import 'package:eye_tracking_app/core/system.dart';
import 'package:eye_tracking_app/trust_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('TrustEventWire matches §13 namespaced contract', () {
    expect(TrustEventWire.scoreCreated, 'trust.score.created');
    expect(TrustEventWire.scoreUpdated, 'trust.score.updated');
    expect(TrustEventWire.limitChanged, 'trust.limit.changed');
  });

  test('TrustLimitType wire values match spec', () {
    expect(TrustLimitType.dailyEarn.wireValue, 'daily_earn');
    expect(TrustLimitType.dailyWithdrawal.wireValue, 'daily_withdrawal');
    expect(TrustLimitType.campaignAccess.wireValue, 'campaign_access');
    expect(TrustLimitType.payoutDelay.wireValue, 'payout_delay');
  });

  test('TrustScoreCreatedEvent holds catalog fields', () {
    const e = TrustScoreCreatedEvent(
      userId: 'u1',
      score: 620,
      level: TrustScoreLevel.trusted,
    );
    expect(e.userId, 'u1');
    expect(e.score, 620);
    expect(e.level, TrustScoreLevel.trusted);
  });

  test('TrustScoreUpdatedEvent holds snapshot knobs and reason codes', () {
    const e = TrustScoreUpdatedEvent(
      userId: 'u1',
      previousScore: 400,
      newScore: 620,
      previousLevel: TrustScoreLevel.low,
      newLevel: TrustScoreLevel.trusted,
      reasonCodes: ['velocity_normalized'],
      payoutDelayHours: 24,
      dailyEarnLimit: 50,
      dailyWithdrawalLimit: 25,
      campaignAccessTier: 2,
      policyVersion: 'policy-trust-v2',
    );
    expect(e.previousScore, 400);
    expect(e.newScore, 620);
    expect(e.previousLevel, TrustScoreLevel.low);
    expect(e.newLevel, TrustScoreLevel.trusted);
    expect(e.reasonCodes, ['velocity_normalized']);
    expect(e.payoutDelayHours, 24);
    expect(e.dailyEarnLimit, 50);
    expect(e.dailyWithdrawalLimit, 25);
    expect(e.campaignAccessTier, 2);
    expect(e.policyVersion, 'policy-trust-v2');
  });

  test('EventBus forwards trust events', () async {
    final bus = EventBus();
    final seen = <TrustEvent>[];
    final sub = bus.trustEvents.listen(seen.add);

    bus.emit(
      const TrustLimitChangedEvent(
        userId: 'u',
        limitType: TrustLimitType.payoutDelay,
        previousValue: 12,
        newValue: 48,
        reason: 'risk_review',
      ),
    );

    await Future<void>.delayed(Duration.zero);
    expect(seen, hasLength(1));
    expect(seen.single, isA<TrustLimitChangedEvent>());
    await sub.cancel();
  });
}
