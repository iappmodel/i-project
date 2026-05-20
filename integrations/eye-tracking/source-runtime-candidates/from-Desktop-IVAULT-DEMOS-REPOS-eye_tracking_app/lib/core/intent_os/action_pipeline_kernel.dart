import 'action_decision.dart';
import 'kernel_evaluation_input.dart';

/// Layer 1 — safety: system gates + confidence floor (no simulation / fixation here).
final class ActionPipelineKernel {
  const ActionPipelineKernel();

  /// Safety kernel only: [ActionDecision.allow] when calibration/errors/confidence pass.
  ActionDecision evaluateSafety(KernelEvaluationInput input) {
    if (decideAutonomousAction(input.system) == ActionDecision.deny) {
      return ActionDecision.deny;
    }
    final autonomy = input.autonomyLevel.clamp(0.0, 1.0);
    final effectiveThreshold = 0.85 * (0.5 + 0.5 * autonomy);
    if (input.confidence < effectiveThreshold) {
      return ActionDecision.deny;
    }
    return ActionDecision.allow;
  }
}
