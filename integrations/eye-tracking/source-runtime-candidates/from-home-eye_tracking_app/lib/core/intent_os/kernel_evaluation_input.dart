import '../system_state.dart';
import 'ui_action_type.dart';

/// Prefilter payload for [ActionPipelineKernel.evaluateSafety].
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
  final double autonomyLevel;
  final SystemState system;
}
