import 'package:flutter/foundation.dart';

import 'action_context.dart';
import 'action_decision.dart';
import 'action_pipeline_kernel.dart';
import 'governance_kernel.dart';
import 'kernel_evaluation_input.dart';
import 'external_os_control_policy.dart';
import 'high_risk_action_lane.dart';
import 'safety_kernel.dart';
import 'ui_action_type.dart';

/// Outcome of [AutonomousExecutionKernel.tryExecute] after ordered gates.
enum AutonomousActionGateResult {
  allowed,
  blockedEmergencyKillSwitch,
  blockedPrefilter,
  blockedHighRisk,
  blockedGovernance,
  blockedSafety,

  /// Reserved; twin risk is carried on [ActionContext.riskScore] and decided inside kernels.
  blockedSandbox,

  /// External/OS-capable action blocked ([kEnableExternalOsControl] off or no confirmation).
  blockedExternalOs,
}

/// Single runtime entry for autonomous side effects: prefilter → governance → safety → [execute].
final class AutonomousExecutionKernel {
  AutonomousExecutionKernel({
    ActionPipelineKernel? pipeline,
    GovernanceKernel? governance,
    SafetyKernel? safety,
    HighRiskActionLane? highRiskLane,
    this.emergencyKillSwitch = false,
  })  : pipeline = pipeline ?? const ActionPipelineKernel(),
        governance = governance ?? const GovernanceKernel(),
        safety = safety ?? const SafetyKernel(),
        highRiskLane = highRiskLane ?? const HighRiskActionLane();

  final ActionPipelineKernel pipeline;
  final GovernanceKernel governance;
  final SafetyKernel safety;
  final HighRiskActionLane highRiskLane;

  /// When true, [tryExecute] returns [AutonomousActionGateResult.blockedEmergencyKillSwitch] without running [execute].
  bool emergencyKillSwitch;

  /// Optional hook for tests or telemetry; defaults to [debugPrint] audit lines.
  void Function(
    UIActionType actionType,
    double confidence,
    AutonomousActionGateResult result,
    String? blockedGate,
  )? auditSink;

  static void _defaultAudit(
    UIActionType actionType,
    double confidence,
    AutonomousActionGateResult result,
    String? blockedGate,
  ) {
    debugPrint(
      '[ACTION_AUDIT] type=${actionType.name} confidence=${confidence.toStringAsFixed(3)} '
      'result=${result.name} gate=${blockedGate ?? 'none'}',
    );
  }

  /// Ordered gates: emergency kill switch → [ActionPipelineKernel.evaluateSafety] (prefilter only) →
  /// [GovernanceKernel.approve] → [SafetyKernel.finalGate] → [execute].
  AutonomousActionGateResult tryExecute(
    KernelEvaluationInput prefilterInput,
    ActionContext ctx,
    void Function() execute,
  ) {
    void audit(AutonomousActionGateResult r, {String? blockedGate}) {
      (auditSink ?? _defaultAudit).call(ctx.actionType, ctx.confidence, r, blockedGate);
    }

    if (emergencyKillSwitch) {
      audit(AutonomousActionGateResult.blockedEmergencyKillSwitch,
          blockedGate: 'emergencyKillSwitch');
      return AutonomousActionGateResult.blockedEmergencyKillSwitch;
    }
    if (pipeline.evaluateSafety(prefilterInput) != ActionDecision.allow) {
      audit(AutonomousActionGateResult.blockedPrefilter, blockedGate: 'ActionPipelineKernel');
      return AutonomousActionGateResult.blockedPrefilter;
    }
    final externalBlock = evaluateExternalOsControl(ctx);
    if (externalBlock != ExternalOsBlockReason.none) {
      audit(
        AutonomousActionGateResult.blockedExternalOs,
        blockedGate: 'ExternalOsControl:${externalBlock.name}',
      );
      return AutonomousActionGateResult.blockedExternalOs;
    }
    if (highRiskLane.blocks(ctx)) {
      audit(AutonomousActionGateResult.blockedHighRisk, blockedGate: 'HighRiskActionLane');
      return AutonomousActionGateResult.blockedHighRisk;
    }
    if (!governance.approve(ctx)) {
      audit(AutonomousActionGateResult.blockedGovernance, blockedGate: 'GovernanceKernel');
      return AutonomousActionGateResult.blockedGovernance;
    }
    if (!safety.finalGate(ctx)) {
      audit(AutonomousActionGateResult.blockedSafety, blockedGate: 'SafetyKernel');
      return AutonomousActionGateResult.blockedSafety;
    }
    audit(AutonomousActionGateResult.allowed);
    execute();
    return AutonomousActionGateResult.allowed;
  }
}
