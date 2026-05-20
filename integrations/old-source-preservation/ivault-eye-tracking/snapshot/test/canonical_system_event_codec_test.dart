import 'package:eye_tracking_app/canonical/build_spec_v01.dart';
import 'package:eye_tracking_app/canonical/system_event_codec.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('systemEventV01 round-trip', () {
    final e = SystemEventV01(
      eventId: 'e1',
      eventType: CanonicalEventTypesV01.rewardIssued,
      actorType: CanonicalActorTypeV01.system,
      actorId: 'actor',
      subjectType: CanonicalSubjectTypeV01.user,
      subjectId: 'u1',
      payload: const <String, Object?>{'a': 1},
      createdAt: '2026-04-25T12:00:00.000Z',
    );
    final json = systemEventV01ToJson(e);
    final back = systemEventV01FromJson(json);
    expect(back, isNotNull);
    expect(back!.eventId, e.eventId);
    expect(back.eventType, e.eventType);
    expect(back.actorType, e.actorType);
  });
}
