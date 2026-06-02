import 'package:eye_tracking_app/core/intent_os/action_context.dart';
import 'package:eye_tracking_app/core/intent_os/autonomous_execution_kernel.dart';
import 'package:eye_tracking_app/core/intent_os/high_risk_action_lane.dart';
import 'package:eye_tracking_app/core/intent_os/ui_action_type.dart';
import 'package:eye_tracking_app/gaze_fixation.dart';
import 'package:flutter_test/flutter_test.dart';

ActionContext _ctx({
  UIActionType type = UIActionType.tap,
  bool fromGazeOnly = true,
  bool explicitConfirmationGranted = false,
  bool gazeFreshForCommit = true,
}) =>
    ActionContext(
      actionType: type,
      target: 'CENTER',
      confidence: 0.95,
      riskScore: 0.1,
      userTrust: 0.9,
      fixationState: FixationState.fixation,
      dwellProgress: 1.0,
      dwellMs: 1200,
      timeSinceLastActionMs: 1000,
      recentActionsLast1s: 0,
      isReversible: true,
      timestampMs: 0,
      autonomyLevel: 0.9,
      stabilityVariance: 0.01,
      fromGazeOnly: fromGazeOnly,
      explicitConfirmationGranted: explicitConfirmationGranted,
      gazeFreshForCommit: gazeFreshForCommit,
    );

void main() {
  group('HighRiskActionLane', () {
    const lane = HighRiskActionLane();

    test('blocks tap from gaze without explicit confirmation', () {
      expect(lane.blocks(_ctx(type: UIActionType.tap)), isTrue);
    });

    test('allows tap after explicit confirmation', () {
      expect(
        lane.blocks(
          _ctx(
            type: UIActionType.tap,
            explicitConfirmationGranted: true,
          ),
        ),
        isFalse,
      );
    });

    test('allows openZone from gaze (medium risk, dwell path)', () {
      expect(lane.blocks(_ctx(type: UIActionType.openZone)), isFalse);
    });

    test('blocks scroll from gaze only', () {
      expect(lane.blocks(_ctx(type: UIActionType.scroll)), isTrue);
    });

    test('does not block when trigger is not gaze-only', () {
      expect(lane.blocks(_ctx(fromGazeOnly: false)), isFalse);
    });

    test('blocks when gaze is stale during face hold', () {
      expect(lane.blocks(_ctx(gazeFreshForCommit: false)), isTrue);
    });
  });
}
