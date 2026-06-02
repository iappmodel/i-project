import 'package:eye_tracking_app/core/intent_os/action_context.dart';
import 'package:eye_tracking_app/core/intent_os/governance_kernel.dart';
import 'package:eye_tracking_app/core/intent_os/ui_action_type.dart';
import 'package:eye_tracking_app/gaze_fixation.dart';
import 'package:flutter_test/flutter_test.dart';

ActionContext _ctx({
  FixationState fixation = FixationState.fixation,
  double confidence = 0.95,
  double risk = 0.2,
  double trust = 0.5,
  double dwell = 1.0,
  int sinceLast = 601,
  bool reversible = true,
  double governanceMinConfidence = 0.85,
}) =>
    ActionContext(
      actionType: UIActionType.tap,
      target: 'center',
      confidence: confidence,
      governanceMinConfidence: governanceMinConfidence,
      riskScore: risk,
      userTrust: trust,
      fixationState: fixation,
      dwellProgress: dwell,
      dwellMs: 1200,
      timeSinceLastActionMs: sinceLast,
      recentActionsLast1s: 0,
      isReversible: reversible,
      timestampMs: 0,
      autonomyLevel: 1.0,
      stabilityVariance: 0.0,
    );

void main() {
  group('GovernanceKernel', () {
    const kernel = GovernanceKernel();

    test('approve when all gates pass', () {
      expect(kernel.approve(_ctx()), isTrue);
    });

    test('deny when confidence not above 0.85', () {
      expect(kernel.approve(_ctx(confidence: 0.85)), isFalse);
      expect(kernel.approve(_ctx(confidence: 0.84)), isFalse);
    });

    test('confidence gate honors explicit governanceMinConfidence floor', () {
      // CRITICAL-1: governance checks the real confidence against the action's
      // floor. A low-risk zone-select floor (0.65) admits mid-band confidence
      // that the default 0.85 floor would (correctly) reject for autonomous actions.
      expect(
        kernel.approve(_ctx(confidence: 0.70, governanceMinConfidence: 0.65)),
        isTrue,
      );
      expect(
        kernel.approve(_ctx(confidence: 0.70, governanceMinConfidence: 0.85)),
        isFalse,
      );
      // Floor is strict (>): a confidence exactly at the floor is denied.
      expect(
        kernel.approve(_ctx(confidence: 0.65, governanceMinConfidence: 0.65)),
        isFalse,
      );
    });

    test('deny when fixation or dwell below user-state gate', () {
      expect(
        kernel.approve(_ctx(confidence: 0.95, fixation: FixationState.saccade)),
        isFalse,
      );
      expect(
        kernel.approve(_ctx(confidence: 0.95, dwell: 0.8)),
        isFalse,
      );
      expect(
        kernel.approve(_ctx(confidence: 0.95, dwell: 0.801)),
        isTrue,
      );
    });

    test('deny when risk not strictly below 0.25', () {
      expect(kernel.approve(_ctx(risk: 0.25)), isFalse);
      expect(kernel.approve(_ctx(risk: 0.6)), isFalse);
      expect(kernel.approve(_ctx(risk: 0.24)), isTrue);
    });

    test('deny when rate limit not strictly above 600 ms', () {
      expect(kernel.approve(_ctx(sinceLast: 50)), isFalse);
      expect(kernel.approve(_ctx(sinceLast: 600)), isFalse);
      expect(kernel.approve(_ctx(sinceLast: 601)), isTrue);
    });

    test('reversibility required regardless of risk', () {
      expect(
        kernel.approve(_ctx(risk: 0.22, reversible: false)),
        isFalse,
      );
      expect(
        kernel.approve(_ctx(risk: 0.22, reversible: true)),
        isTrue,
      );
    });
  });
}
