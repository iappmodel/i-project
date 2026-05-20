import '../system_state.dart';

enum ActionDecision {
  allow,
  deny,
}

/// System-level autonomous gate before confidence vs autonomy blending.
ActionDecision decideAutonomousAction(SystemState system) {
  if (system.calibrationActive) return ActionDecision.deny;
  return ActionDecision.allow;
}
