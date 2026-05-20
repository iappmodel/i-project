import 'package:eye_tracking_app/core/events/presence_event.dart';
import 'package:eye_tracking_app/core/system.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('PresenceVerificationScoredEvent carries expected fields', () {
    const e = PresenceVerificationScoredEvent(
      verificationId: 'pv1',
      userId: 'u1',
      sessionId: 's1',
      proofLevel: PresenceProofLevel.level3,
      momentType: 'watch_video',
      presenceConfidence: 0.91,
      attentionConfidence: 0.88,
      intentConfidence: 0.73,
      continuityConfidence: 0.84,
      fraudRisk: 0.08,
      createdAt: '2026-04-26T10:00:00Z',
    );

    expect(e.proofLevel.wireValue, 'level_3');
    expect(e.momentType, 'watch_video');
    expect(e.presenceConfidence, greaterThan(0.9));
  });

  test('PresenceDecisionType wire values remain stable', () {
    expect(PresenceDecisionType.approveReward.wireValue, 'approve_reward');
    expect(PresenceDecisionType.holdReward.wireValue, 'hold_reward');
    expect(PresenceDecisionType.flagFraud.wireValue, 'flag_fraud');
  });

  test('EventBus forwards presence events', () async {
    final bus = EventBus();
    final seen = <PresenceEvent>[];
    final sub = bus.presenceEvents.listen(seen.add);

    bus.emit(
      const PresencePrivacyReceiptCreatedEvent(
        receiptId: 'pr1',
        verificationId: 'pv1',
        userId: 'u1',
        sessionId: 's1',
        createdAt: '2026-04-26T10:00:00Z',
      ),
    );

    await Future<void>.delayed(Duration.zero);
    expect(seen, hasLength(1));
    expect(seen.single, isA<PresencePrivacyReceiptCreatedEvent>());
    await sub.cancel();
  });
}
