import '../system_state.dart';
import 'autonomous_action.dart';
import 'ui_action_type.dart';

/// Inputs for [ActionPipelineKernel.evaluateSafety] (layer 1 only); distinct from queued [ActionRequest].
final class KernelEvaluationInput {
  const KernelEvaluationInput({
    required this.type,
    required this.targetZone,
    required this.confidence,
    required this.timestamp,
    required this.dwellMs,
    required this.autonomyLevel,
    required this.system,
  });

  final UIActionType type;
  final String targetZone;
  final double confidence;
  final int timestamp;
  final int dwellMs;

  /// \([0,1]\) user trust / policy blend — use [BehaviorProfile.userTrustScore].
  final double autonomyLevel;

  final SystemState system;

  /// Bridge [AutonomousAction] + frame policy fields into the kernel input shape.
  factory KernelEvaluationInput.fromAutonomous(
    AutonomousAction autonomous, {
    required int timestamp,
    required int dwellMs,
    required double autonomyLevel,
    required SystemState system,
  }) =>
      KernelEvaluationInput(
        type: autonomous.type,
        targetZone: autonomous.targetZone,
        confidence: autonomous.confidence,
        timestamp: timestamp,
        dwellMs: dwellMs,
        autonomyLevel: autonomyLevel,
        system: system,
      );
}
