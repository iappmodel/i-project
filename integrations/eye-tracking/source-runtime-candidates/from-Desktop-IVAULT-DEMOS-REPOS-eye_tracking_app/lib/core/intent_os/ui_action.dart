import 'ui_action_type.dart';

/// Resolved UI operation with zone target and scoring metadata.
class UIAction {
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
