import 'intent_action.dart';
import 'ui_action_type.dart';

/// Autonomous UI proposal after prediction and risk/latency estimates — not executed until
/// the pipeline promotes it (e.g. to [IntentAction]) and passes fixation + sandbox gates.
final class AutonomousAction {
  const AutonomousAction({
    required this.type,
    required this.targetZone,
    required this.confidence,
    required this.riskScore,
    required this.predictedLatency,
  });

  final UIActionType type;
  final String targetZone;
  final double confidence;
  final double riskScore;

  /// Expected time-to-effect for scheduling / UX (milliseconds).
  final int predictedLatency;

  IntentAction toIntentAction(int sourceTimestamp) => IntentAction(
        type: type,
        targetZone: targetZone,
        confidence: confidence,
        sourceTimestamp: sourceTimestamp,
      );
}

/// Heuristic gate before promoting an [AutonomousAction] to execution (with fixation + sandbox).
bool canExecuteAutonomously(AutonomousAction a) {
  return a.confidence > 0.85 &&
      a.riskScore < 0.2 &&
      a.predictedLatency < 200;
}
