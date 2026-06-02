import 'package:eye_tracking_app/core/intent_os/action_context.dart';
import 'package:eye_tracking_app/core/intent_os/autonomous_execution_kernel.dart';
import 'package:eye_tracking_app/core/intent_os/kernel_evaluation_input.dart';
import 'package:eye_tracking_app/core/intent_os/ui_action_type.dart';
import 'package:eye_tracking_app/core/system_state.dart';
import 'package:eye_tracking_app/gaze_fixation.dart';
import 'package:flutter_test/flutter_test.dart';

KernelEvaluationInput _prefilter({
  double confidence = 0.9,
  double autonomy = 1.0,
  SystemState system = const SystemState(),
}) =>
    KernelEvaluationInput(
      type: UIActionType.tap,
      targetZone: 'center',
      confidence: confidence,
      timestamp: 0,
      dwellMs: 900,
      autonomyLevel: autonomy,
      system: system,
    );

ActionContext _ctx({
  double confidence = 0.9,
  double risk = 0.2,
  double trust = 0.5,
  double dwell = 0.85,
  int sinceLast = 700,
  int recentActionsLast1s = 0,
  bool reversible = true,
  bool explicitConfirmationGranted = true,
  bool fromGazeOnly = true,
}) =>
    ActionContext(
      actionType: UIActionType.tap,
      target: 'center',
      confidence: confidence,
      riskScore: risk,
      userTrust: trust,
      fixationState: FixationState.fixation,
      dwellProgress: dwell,
      dwellMs: 900,
      timeSinceLastActionMs: sinceLast,
      recentActionsLast1s: recentActionsLast1s,
      isReversible: reversible,
      timestampMs: 0,
      autonomyLevel: 1.0,
      stabilityVariance: 0.0,
      explicitConfirmationGranted: explicitConfirmationGranted,
      fromGazeOnly: fromGazeOnly,
    );

void main() {
  group('AutonomousExecutionKernel.tryExecute', () {
    final kernel = AutonomousExecutionKernel();

    test('allows execution only when prefilter, governance, and safety pass', () {
      var called = false;
      final ok = kernel.tryExecute(_prefilter(), _ctx(), () {
        called = true;
      });

      expect(ok, AutonomousActionGateResult.allowed);
      expect(called, isTrue);
    });

    test('blocks execution when governance gate fails', () {
      var called = false;
      final ok = kernel.tryExecute(_prefilter(), _ctx(confidence: 0.2), () {
        called = true;
      });

      expect(ok, AutonomousActionGateResult.blockedGovernance);
      expect(called, isFalse);
    });

    test('blocks execution when safety gate fails', () {
      var called = false;
      final ok = kernel.tryExecute(_prefilter(), _ctx(recentActionsLast1s: 3), () {
        called = true;
      });

      expect(ok, AutonomousActionGateResult.blockedSafety);
      expect(called, isFalse);
    });

    test('blocks execution when emergency kill switch is enabled', () {
      final k = AutonomousExecutionKernel()..emergencyKillSwitch = true;
      var called = false;
      final ok = k.tryExecute(_prefilter(), _ctx(), () {
        called = true;
      });

      expect(ok, AutonomousActionGateResult.blockedEmergencyKillSwitch);
      expect(called, isFalse);
    });

    test('blocks tap from gaze without explicit confirmation', () {
      var called = false;
      final ok = kernel.tryExecute(
        _prefilter(),
        _ctx(explicitConfirmationGranted: false),
        () {
          called = true;
        },
      );

      expect(ok, AutonomousActionGateResult.blockedHighRisk);
      expect(called, isFalse);
    });

    test('blocks at prefilter when system disallows autonomous actions', () {
      var called = false;
      final ok = kernel.tryExecute(
        _prefilter(
          system: const SystemState(calibrationActive: true),
        ),
        _ctx(),
        () {
          called = true;
        },
      );

      expect(ok, AutonomousActionGateResult.blockedPrefilter);
      expect(called, isFalse);
    });
  });
}
