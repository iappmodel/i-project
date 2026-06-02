import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/core/intent_os/action_context.dart';
import 'package:eye_tracking_app/core/intent_os/autonomous_execution_kernel.dart';
import 'package:eye_tracking_app/core/intent_os/external_os_control_policy.dart';
import 'package:eye_tracking_app/core/intent_os/kernel_evaluation_input.dart';
import 'package:eye_tracking_app/core/intent_os/ui_action_type.dart';
import 'package:eye_tracking_app/core/pop/pop_runtime_config.dart';
import 'package:eye_tracking_app/core/system_state.dart';
import 'package:eye_tracking_app/gaze_fixation.dart';

ActionContext _ctx({
  bool fromGazeOnly = true,
  bool explicitConfirmationGranted = false,
  String? logicalActionName,
}) {
  return ActionContext(
    actionType: UIActionType.tap,
    target: 'external',
    confidence: 0.95,
    riskScore: 0.1,
    userTrust: 0.9,
    fixationState: FixationState.fixation,
    dwellProgress: 1.0,
    dwellMs: 1200,
    timeSinceLastActionMs: 5000,
    recentActionsLast1s: 0,
    isReversible: false,
    timestampMs: 1000,
    autonomyLevel: 0.9,
    stabilityVariance: 0.01,
    fromGazeOnly: fromGazeOnly,
    explicitConfirmationGranted: explicitConfirmationGranted,
    logicalActionName: logicalActionName,
  );
}

void main() {
  test('kEnableExternalOsControl defaults false in tests', () {
    expect(kEnableExternalOsControl, isFalse);
  });

  test('open_external is external-capable', () {
    expect(isExternalOsCapableByName('open_external'), isTrue);
    expect(isExternalOsCapableByName('openZone'), isFalse);
  });

  test('blocks when product flag off', () {
    expect(
      evaluateExternalOsControl(_ctx(logicalActionName: 'open_external')),
      ExternalOsBlockReason.disabledByProductFlag,
    );
    expect(blocksExternalOsControl(_ctx(logicalActionName: 'withdraw')), isTrue);
  });

  test('in-app zone select is not external-capable', () {
    expect(blocksExternalOsControl(_ctx()), isFalse);
  });

  group('AutonomousExecutionKernel', () {
    test('agent open_external blocked with blockedExternalOs', () {
      final kernel = AutonomousExecutionKernel();
      var ran = false;
      final gate = kernel.tryExecute(
        KernelEvaluationInput(
          type: UIActionType.tap,
          targetZone: 'pay',
          confidence: 0.95,
          timestamp: 1000,
          dwellMs: 1200,
          autonomyLevel: 0.9,
          system: const SystemState(
            calibrationActive: false,
            errorState: false,
            userIsDistracted: false,
          ),
        ),
        _ctx(
          logicalActionName: 'open_external',
          fromGazeOnly: false,
          explicitConfirmationGranted: true,
        ),
        () => ran = true,
      );
      expect(gate, AutonomousActionGateResult.blockedExternalOs);
      expect(ran, isFalse);
    });
  });
}
