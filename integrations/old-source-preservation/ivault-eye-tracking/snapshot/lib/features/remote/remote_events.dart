import 'remote_types.dart';

/// Canonical remote event names (spec §16).
typedef RemoteEventType = String;

abstract final class RemoteEventTypes {
  static const String opened = 'remote.opened';
  static const String closed = 'remote.closed';
  static const String moved = 'remote.moved';
  static const String locked = 'remote.locked';
  static const String unlocked = 'remote.unlocked';
  static const String commandRequested = 'remote.command.requested';
  static const String commandConfirmationRequired =
      'remote.command.confirmation_required';
  static const String commandConfirmed = 'remote.command.confirmed';
  static const String commandExecuted = 'remote.command.executed';
  static const String commandBlocked = 'remote.command.blocked';
  static const String commandRateLimited = 'remote.command.rate_limited';
  static const String voiceStarted = 'remote.input.voice_started';
  static const String voiceStopped = 'remote.input.voice_stopped';
  static const String gazeStarted = 'remote.input.gaze_started';
  static const String gazeStopped = 'remote.input.gaze_stopped';
  static const String emergencyStop = 'remote.emergency_stop';
}

final class RemoteEventEntry {
  const RemoteEventEntry({
    required this.type,
    required this.at,
    this.commandType,
    this.detail,
  });

  final RemoteEventType type;
  final DateTime at;
  final String? commandType;
  final String? detail;
}
