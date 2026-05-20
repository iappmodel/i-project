import '../../gaze_fixation.dart';
import 'autonomous_action.dart';
import 'intent_influence_pipeline.dart';
import 'kernel_evaluation_input.dart';
import 'safety_kernel.dart';
import 'ui_action.dart';
import 'ui_action_type.dart';

/// Autonomous UI proposals from prediction + fixation + dwell; [decide] does not execute.
///
/// [tryExecute] runs [canExecuteAutonomously], [implicitConfirmed], optional [SafetyKernel.validate],
/// then optional callbacks.
class AutonomousAgent {
  const AutonomousAgent({
    this.onTap,
    this.onScroll,
    this.onOpenZone,
  });

  final void Function(String zone)? onTap;
  final void Function(String zone)? onScroll;
  final void Function(String zone)? onOpenZone;

  UIAction? decide({
    required IntentPrediction prediction,
    required FixationState state,
    required double dwellProgress,
  }) {
    if (state != FixationState.fixation) return null;

    if (prediction.probability < 0.85) return null;

    if (dwellProgress < 0.7) return null;

    return UIAction(
      type: UIActionType.tap,
      targetZone: prediction.zone,
      confidence: prediction.probability,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    );
  }

  void tryExecute({
    required AutonomousAction action,
    required bool implicitConfirmed,
    SafetyKernel? safetyKernel,
    KernelEvaluationInput? safetyInput,
  }) {
    if (!canExecuteAutonomously(action)) return;
    if (!implicitConfirmed) return;
    if (safetyInput != null) {
      final safe =
          (safetyKernel ?? const SafetyKernel()).validate(safetyInput);
      if (!safe) return;
    }
    _execute(action);
  }

  void _execute(AutonomousAction action) {
    switch (action.type) {
      case UIActionType.tap:
        onTap?.call(action.targetZone);
      case UIActionType.scroll:
        onScroll?.call(action.targetZone);
      case UIActionType.openZone:
        onOpenZone?.call(action.targetZone);
      case UIActionType.longPress:
      case UIActionType.closeZone:
      case UIActionType.highlight:
      case UIActionType.preload:
        break;
    }
  }
}
