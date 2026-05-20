import 'ui_action.dart';

/// Queued autonomous action awaiting user confirmation (e.g. second blink).
final class ActionRequest {
  const ActionRequest({
    required this.action,
    required this.queuedAtMs,
  });

  final UIAction action;
  final int queuedAtMs;
}
