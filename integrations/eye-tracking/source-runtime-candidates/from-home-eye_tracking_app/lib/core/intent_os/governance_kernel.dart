import '../../gaze_fixation.dart' show FixationState;
import 'action_context.dart';

/// Policy approval after the pipeline prefilter passes.
final class GovernanceKernel {
  const GovernanceKernel();

  /// `true` when fixation, dwell, confidence, risk, rate limit, and reversibility gates pass.
  ///
  /// Thresholds are strict inequalities to match `test/governance_kernel_test.dart`
  /// and `AGENTS.md` (confidence > 0.85, risk < 0.25, dwell > 0.8, spacing > 600 ms).
  bool approve(ActionContext ctx) {
    if (ctx.confidence <= 0.85) return false;
    if (ctx.fixationState != FixationState.fixation) return false;
    if (ctx.dwellProgress <= 0.8) return false;
    if (ctx.riskScore >= 0.25) return false;
    if (ctx.timeSinceLastActionMs <= 600) return false;
    if (!ctx.isReversible) return false;
    return true;
  }
}
