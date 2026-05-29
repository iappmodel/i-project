import 'package:flutter_test/flutter_test.dart';

import '../lib/core/intent_os/pop_action_executor.dart';
import '../lib/core/intent_os/ui_action_type.dart';
import '../lib/gaze_coordinate_space.dart';
import '../lib/core/signal_stale_policy.dart';

void main() {
  group('gaze_coordinate_space', () {
    test('uses calibrated bounds when available', () {
      expect(
        resolveZoneFromGaze(rawGazeX: -0.5, measuredLeft: -0.8, measuredRight: 0.8),
        'LEFT',
      );
      expect(
        resolveZoneFromGaze(rawGazeX: 0.5, measuredLeft: -0.8, measuredRight: 0.8),
        'RIGHT',
      );
    });

    test('falls back to raw deadband without calibration', () {
      expect(resolveZoneFromGaze(rawGazeX: -0.2, measuredLeft: null, measuredRight: null), 'LEFT');
      expect(resolveZoneFromGaze(rawGazeX: 0.0, measuredLeft: null, measuredRight: null), 'CENTER');
    });
  });

  group('signal_stale_policy', () {
    test('cancels stale tracking after gap', () {
      expect(
        shouldCancelStaleTracking(lastProcessedFrameMs: 1000, nowMs: 1500),
        isTrue,
      );
      expect(
        shouldCancelStaleTracking(lastProcessedFrameMs: 1000, nowMs: 1200),
        isFalse,
      );
    });
  });

  group('PopActionExecutor high-risk', () {
    test('blocks high-risk action types from gaze-only path', () {
      expect(PopActionExecutor.isHighRiskFromGazeOnly(UIActionType.longPress), isTrue);
      expect(PopActionExecutor.isHighRiskFromGazeOnly(UIActionType.openZone), isFalse);
    });
  });
}
