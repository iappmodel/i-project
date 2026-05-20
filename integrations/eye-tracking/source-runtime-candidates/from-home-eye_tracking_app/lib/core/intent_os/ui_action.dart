import 'ui_action_type.dart';

/// Committed UI action with wall-clock [timestamp] (ms since epoch).
final class UIAction {
  const UIAction({
    required this.type,
    required this.targetZone,
    required this.confidence,
    required this.timestamp,
  });

  final UIActionType type;
  final String targetZone;
  final double confidence;
  final int timestamp;
}
