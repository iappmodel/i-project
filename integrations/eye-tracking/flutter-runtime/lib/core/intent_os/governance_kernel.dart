import '../../gaze_fixation.dart' show FixationState;
import 'action_context.dart';

/// Cross-cutting policy on [ActionContext] (confidence, risk, gaze user state, rate limit, reversibility).
///
/// Complements [ActionPipelineKernel] / [KernelEvaluationInput], which handle system
/// gates and confidence vs autonomy. [_intentValid] enforces the real [ActionContext.confidence]
/// against [ActionContext.governanceMinConfidence] (defaults to 0.85 for the high-risk /
/// autonomous path; low-risk reversible control passes its explicit zone-commit floor).
/// [_userStateValid] requires fixation and sufficient dwell progress; [_rateLimitValid]
/// requires [ActionContext.timeSinceLastActionMs] > 600.
final class GovernanceKernel {
  const GovernanceKernel();

  bool approve(ActionContext ctx) {
    return _intentValid(ctx) &&
        _riskValid(ctx) &&
        _userStateValid(ctx) &&
        _rateLimitValid(ctx) &&
        _reversibilityValid(ctx);
  }

  bool _intentValid(ActionContext ctx) =>
      ctx.confidence > ctx.governanceMinConfidence;

  bool _riskValid(ActionContext ctx) => ctx.riskScore < 0.25;

  bool _userStateValid(ActionContext ctx) =>
      ctx.fixationState == FixationState.fixation &&
      ctx.dwellProgress > 0.8;

  bool _rateLimitValid(ActionContext ctx) => ctx.timeSinceLastActionMs > 600;

  bool _reversibilityValid(ActionContext ctx) => ctx.isReversible;
}
