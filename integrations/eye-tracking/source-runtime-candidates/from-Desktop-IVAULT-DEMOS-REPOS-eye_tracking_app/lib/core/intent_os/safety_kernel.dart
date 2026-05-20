import 'action_decision.dart';
import 'action_context.dart';
import 'action_pipeline_kernel.dart';
import 'kernel_evaluation_input.dart';

/// Layer 1 safety facade over [ActionPipelineKernel.evaluateSafety].
///
/// [ActionContext.riskScore] should be the UISandbox twin risk (same value as
/// `SandboxSimulation.riskScore`). [finalGate] enforces the legacy twin ceiling here.
final class SafetyKernel {
  const SafetyKernel([
    this._pipeline = const ActionPipelineKernel(),
  ]);

  final ActionPipelineKernel _pipeline;

  /// `true` when the pipeline allows the intent (system gates + confidence vs autonomy).
  bool validate(KernelEvaluationInput action) =>
      _pipeline.evaluateSafety(action) == ActionDecision.allow;

  bool finalGate(ActionContext ctx) {
    if (!_sanityChecks(ctx)) return false;
    if (!_twinRiskEnvelope(ctx)) return false;
    if (!_anomalyCheck(ctx)) return false;
    if (!_burstDetection(ctx)) return false;
    return true;
  }

  /// Same envelope the app used with UISandbox before twin risk fed the kernel (`riskScore < 0.5`).
  bool _twinRiskEnvelope(ActionContext ctx) => ctx.riskScore < 0.5;

  bool _sanityChecks(ActionContext ctx) {
    return ctx.confidence.isFinite &&
        ctx.riskScore.isFinite &&
        ctx.userTrust.isFinite;
  }

  bool _anomalyCheck(ActionContext ctx) {
    return !(ctx.confidence < 0.3 && ctx.dwellProgress > 0.9);
  }

  bool _burstDetection(ActionContext ctx) {
    return ctx.recentActionsLast1s < 3;
  }
}
