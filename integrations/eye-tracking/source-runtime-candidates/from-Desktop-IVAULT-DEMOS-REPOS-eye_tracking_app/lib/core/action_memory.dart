import 'intent_os/ui_action.dart';
import '../gaze_fixation.dart';
import 'ui_sandbox.dart';

/// Record of an autonomous [UIAction] with digital-twin [prediction] and outcome.
final class ActionMemory {
  const ActionMemory({
    required this.action,
    required this.recordedAtMs,
    required this.prediction,
    required this.actualSuccess,
    this.fixationAtExecute,
    this.smoothGazeXAtExecute,
  });

  final UIAction action;
  final int recordedAtMs;
  final SandboxSimulation prediction;
  final bool actualSuccess;
  final FixationState? fixationAtExecute;
  final double? smoothGazeXAtExecute;
}
