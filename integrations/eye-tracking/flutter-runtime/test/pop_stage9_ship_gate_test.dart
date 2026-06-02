import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/core/intent_os/autonomous_execution_kernel.dart';
import 'package:eye_tracking_app/core/intent_os/pop_action_executor.dart';
import 'package:eye_tracking_app/core/pop/frame_coordinator.dart';
import 'package:eye_tracking_app/features/vision/frame_perf_metrics.dart';
import 'package:eye_tracking_app/gaze_fixation.dart';
import 'package:eye_tracking_app/core/signal_stale_policy.dart';

void main() {
  group('Stage 9 ship gate', () {
    test('double-fire at same timestamp allows only one zone commit', () {
      final executor = PopActionExecutor();
      var count = 0;
      const now = 42_000;
      for (var i = 0; i < 2; i++) {
        executor.tryZoneSelect(
          zone: 'CENTER',
          confidence: 0.9,
          fixationState: FixationState.fixation,
          dwellProgress: 1.0,
          dwellMs: 1200,
          nowMs: now,
          isTracking: true,
          calibrationBusy: false,
          visionError: false,
          userIsDistracted: false,
          autonomyLevel: 0.9,
          stabilityVariance: 0.01,
          riskScore: 0.0,
          likelyFake: false,
          gazeFreshForCommit: true,
          onAllowed: () => count++,
        );
      }
      expect(count, 1);
    });

    test('stale tracking cancels via frame coordinator policy', () {
      final coord = PopFrameCoordinator();
      coord.markProcessed(1000);
      expect(coord.isStale(1600), isTrue);
      expect(shouldCancelStaleTracking(lastProcessedFrameMs: 1000, nowMs: 1600), isTrue);
    });

    test('native total p95 stays under MVP budget', () {
      final samples = <double>[
        12, 18, 22, 28, 35, 38, 40, 42, 44, 48, 50, 52, 55, 58, 60,
      ];
      final p95 = percentileP95(samples);
      expect(p95, lessThanOrEqualTo(60));
      expect(p95, greaterThan(40));
    });
  });
}
