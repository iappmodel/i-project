// Product telemetry catalog §5 — device.* payloads (local types + bus only).

/// Wire name: `device.registered`
enum DevicePlatform { ios, android, web, desktop }

/// Wire values for [DeviceSuspiciousActivityDetectedEvent.signal].
enum DeviceSuspiciousSignal {
  emulatorDetected('emulator_detected'),
  rootDetected('root_detected'),
  cameraTamperSuspected('camera_tamper_suspected'),
  rapidAccountSwitching('rapid_account_switching'),
  locationSpoofSuspected('location_spoof_suspected'),
  automationSuspected('automation_suspected');

  const DeviceSuspiciousSignal(this.wireValue);
  final String wireValue;
}

enum DeviceSuspiciousSeverity { low, medium, high, critical }

/// Base type for device-domain events on [EventBus].
sealed class DeviceEvent {
  const DeviceEvent();
}

/// Emitted when a device is first associated with a user.
/// Wire: `device.registered`
final class DeviceRegisteredEvent extends DeviceEvent {
  const DeviceRegisteredEvent({
    required this.userId,
    required this.deviceId,
    required this.platform,
    this.model,
    this.osVersion,
    this.appVersion,
  });

  final String userId;
  final String deviceId;
  final DevicePlatform platform;
  final String? model;
  final String? osVersion;
  final String? appVersion;
}

/// Emitted when device reputation changes.
/// Wire: `device.trust_changed`
final class DeviceTrustChangedEvent extends DeviceEvent {
  const DeviceTrustChangedEvent({
    required this.userId,
    required this.deviceId,
    required this.previousTrust,
    required this.newTrust,
    required this.reason,
  });

  final String userId;
  final String deviceId;
  final double previousTrust;
  final double newTrust;
  final String reason;
}

/// Emitted when device behavior looks abnormal.
/// Wire: `device.suspicious_activity_detected`
final class DeviceSuspiciousActivityDetectedEvent extends DeviceEvent {
  const DeviceSuspiciousActivityDetectedEvent({
    required this.userId,
    required this.deviceId,
    required this.signal,
    required this.severity,
  });

  final String userId;
  final String deviceId;
  final DeviceSuspiciousSignal signal;
  final DeviceSuspiciousSeverity severity;
}
