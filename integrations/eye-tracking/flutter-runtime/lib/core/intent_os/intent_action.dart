import 'ui_action.dart';
import 'ui_action_type.dart';

/// Alias for call sites that speak in "intent" vocabulary; same as [UIActionType].
typedef IntentActionType = UIActionType;

/// Intent-level action before the pipeline (simulation + kernel); maps to [UIAction] for execution.
final class IntentAction {
  const IntentAction({
    required this.type,
    required this.targetZone,
    required this.confidence,
    required this.sourceTimestamp,
  });

  final UIActionType type;
  final String targetZone;
  final double confidence;
  final int sourceTimestamp;

  factory IntentAction.fromUiAction(UIAction a) => IntentAction(
        type: a.type,
        targetZone: a.targetZone,
        confidence: a.confidence,
        sourceTimestamp: a.timestamp,
      );

  /// New [UIAction] for [ActionExecutor] (fresh timestamp at commit time).
  UIAction toUiAction() => UIAction(
        type: type,
        targetZone: targetZone,
        confidence: confidence,
        timestamp: DateTime.now().millisecondsSinceEpoch,
      );
}
