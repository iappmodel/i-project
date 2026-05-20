import 'ui_action.dart';

/// Pending shell action waiting for explicit confirmation (e.g. second blink).
class ActionRequest {
  const ActionRequest({
    required this.action,
    required this.queuedAtMs,
  });

  final UIAction action;

  /// [DateTime.now().millisecondsSinceEpoch] when queued.
  final int queuedAtMs;
}
