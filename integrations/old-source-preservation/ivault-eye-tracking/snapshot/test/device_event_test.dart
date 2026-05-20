import 'package:eye_tracking_app/core/events/device_event.dart';
import 'package:eye_tracking_app/core/system.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('DeviceRegisteredEvent holds catalog fields', () {
    const e = DeviceRegisteredEvent(
      userId: 'u1',
      deviceId: 'd1',
      platform: DevicePlatform.ios,
      model: 'iPhone',
      osVersion: '18.0',
      appVersion: '1.0.0',
    );
    expect(e.userId, 'u1');
    expect(e.deviceId, 'd1');
    expect(e.platform, DevicePlatform.ios);
    expect(e.model, 'iPhone');
    expect(e.osVersion, '18.0');
    expect(e.appVersion, '1.0.0');
  });

  test('DeviceSuspiciousSignal wire values match spec', () {
    expect(
      DeviceSuspiciousSignal.emulatorDetected.wireValue,
      'emulator_detected',
    );
    expect(
      DeviceSuspiciousSignal.automationSuspected.wireValue,
      'automation_suspected',
    );
  });

  test('EventBus forwards device events', () async {
    final bus = EventBus();
    final seen = <DeviceEvent>[];
    final sub = bus.deviceEvents.listen(seen.add);

    bus.emit(
      const DeviceTrustChangedEvent(
        userId: 'u',
        deviceId: 'd',
        previousTrust: 0.5,
        newTrust: 0.3,
        reason: 'velocity',
      ),
    );

    await Future<void>.delayed(Duration.zero);
    expect(seen, hasLength(1));
    expect(seen.single, isA<DeviceTrustChangedEvent>());
    await sub.cancel();
  });
}
