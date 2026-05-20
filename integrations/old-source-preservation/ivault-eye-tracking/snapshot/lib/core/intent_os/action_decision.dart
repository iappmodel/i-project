import '../system_state.dart';
import 'ui_action.dart';

enum ActionDecision {
  allow,
  deny,
  requireConfirmation,
}

/// Per-action policy before [ActionExecutor] runs side effects.
ActionDecision decideAction(UIAction action) {
  return ActionDecision.allow;
}

/// Gates autonomous [ActionExecutor] work when calibration or errors disallow it.
ActionDecision decideAutonomousAction(SystemState system) {
  if (system.calibrationActive) return ActionDecision.deny;
  if (system.errorState) return ActionDecision.deny;
  return ActionDecision.allow;
}
