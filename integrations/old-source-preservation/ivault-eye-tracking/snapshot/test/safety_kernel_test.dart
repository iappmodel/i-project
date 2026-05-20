import 'package:eye_tracking_app/core/intent_os/action_context.dart';
import 'package:eye_tracking_app/core/intent_os/safety_kernel.dart';
import 'package:eye_tracking_app/core/intent_os/ui_action_type.dart';
import 'package:eye_tracking_app/gaze_fixation.dart';
import 'package:flutter_test/flutter_test.dart';

ActionContext _ctx({
  double confidence = 0.9,
  double risk = 0.2,
  double trust = 0.5,
  double dwell = 0.9,
  int sinceLast = 700,
  int recentActionsLast1s = 0,
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
      isReversible: true,
      timestampMs: 0,
      autonomyLevel: 1.0,
      stabilityVariance: 0.0,
    );

void main() {
  group('SafetyKernel.finalGate', () {
    const kernel = SafetyKernel();

    test('passes when all checks pass', () {
      expect(kernel.finalGate(_ctx()), isTrue);
    });

    test('fails sanity checks for non-finite core signals', () {
      expect(kernel.finalGate(_ctx(confidence: double.nan)), isFalse);
      expect(kernel.finalGate(_ctx(risk: double.infinity)), isFalse);
      expect(kernel.finalGate(_ctx(trust: double.nan)), isFalse);
    });

    test('fails anomaly check for low confidence with extreme dwell', () {
      expect(kernel.finalGate(_ctx(confidence: 0.29, dwell: 0.91)), isFalse);
      expect(kernel.finalGate(_ctx(confidence: 0.29, dwell: 0.9)), isTrue);
      expect(kernel.finalGate(_ctx(confidence: 0.3, dwell: 0.99)), isTrue);
    });

    test('fails burst detection when too fast', () {
      expect(kernel.finalGate(_ctx(recentActionsLast1s: 3)), isFalse);
      expect(kernel.finalGate(_ctx(recentActionsLast1s: 4)), isFalse);
      expect(kernel.finalGate(_ctx(recentActionsLast1s: 2)), isTrue);
    });

    test('fails twin risk envelope at or above 0.5 (UISandbox-fed ctx.riskScore)', () {
      expect(kernel.finalGate(_ctx(risk: 0.5)), isFalse);
      expect(kernel.finalGate(_ctx(risk: 0.51)), isFalse);
      expect(kernel.finalGate(_ctx(risk: 0.49)), isTrue);
    });
  });
}
