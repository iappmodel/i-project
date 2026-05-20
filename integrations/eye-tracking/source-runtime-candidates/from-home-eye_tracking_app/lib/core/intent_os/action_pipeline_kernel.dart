import 'action_decision.dart';
import 'kernel_evaluation_input.dart';

/// Layer-1 safety prefilter: system gates + confidence vs autonomy floor.
final class ActionPipelineKernel {
  const ActionPipelineKernel();

  /// Returns [ActionDecision.allow] only when autonomous operation is permitted
  /// and [confidence] meets the effective autonomy-scaled threshold.
  ActionDecision evaluateSafety(KernelEvaluationInput input) {
    if (decideAutonomousAction(input.system) == ActionDecision.deny) {
      return ActionDecision.deny;
    }
    final autonomy = input.autonomyLevel.clamp(0.0, 1.0);
    final effectiveThreshold = 0.85 * (0.5 + 0.5 * autonomy);
    if (input.confidence < effectiveThreshold) return ActionDecision.deny;
    return ActionDecision.allow;
  }
}
