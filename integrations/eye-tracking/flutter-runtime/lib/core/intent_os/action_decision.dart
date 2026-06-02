import '../system_state.dart';
import 'action_risk_policy.dart';
import 'ui_action.dart';

enum ActionDecision {
  allow,
  deny,
  requireConfirmation,
}

/// Per-action policy before side effects (legacy [UIAction] path).
ActionDecision decideAction(UIAction action) {
  if (requiresExplicitConfirmation(action.type)) {
    return ActionDecision.requireConfirmation;
  }
  if (requiresExplicitConfirmationByName(action.type.name)) {
    return ActionDecision.requireConfirmation;
  }
  return ActionDecision.allow;
}

/// Gates autonomous [ActionExecutor] work when calibration or errors disallow it.
ActionDecision decideAutonomousAction(SystemState system) {
  if (system.calibrationActive) return ActionDecision.deny;
  if (system.errorState) return ActionDecision.deny;
  return ActionDecision.allow;
}
