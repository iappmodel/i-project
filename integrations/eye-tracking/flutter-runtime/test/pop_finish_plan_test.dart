import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import '../lib/core/intent_os/pop_action_executor.dart';
import '../lib/core/intent_os/ui_action_type.dart';
import '../lib/gaze_coordinate_space.dart';
import '../lib/core/signal_stale_policy.dart';

void main() {
  group('Stage 2 deletion manifest', () {
    final removedPaths = [
      'core/stability/smoothing.dart',
      'lib/vision/gaze_filter.dart',
      'lib/core/perception/frame_processor.dart',
      'lib/core/intent_os/intent_os.dart',
      'lib/core/intent_os/action_executor.dart',
      'lib/gaze_models.dart',
      'lib/human_state.dart',
    ];

    for (final path in removedPaths) {
      test('$path must not exist', () {
        expect(File(path).existsSync(), isFalse);
      });
    }

    test('ui_preloader survivors remain', () {
      expect(File('lib/ui_preloader.dart').existsSync(), isTrue);
      expect(File('lib/core/events/ui_preloader.dart').existsSync(), isTrue);
    });
  });

  group('gaze_coordinate_space', () {
    test('uses calibrated bounds when available', () {
      expect(
        resolveZoneFromGaze(
          pipelineSmoothedX: -0.5,
          measuredLeft: -0.8,
          measuredRight: 0.8,
          sessionSamples: 200,
        ),
        'LEFT',
      );
      expect(
        resolveZoneFromGaze(
          pipelineSmoothedX: 0.5,
          measuredLeft: -0.8,
          measuredRight: 0.8,
          sessionSamples: 200,
        ),
        'RIGHT',
      );
    });

    test('falls back to offset deadband without calibration', () {
      expect(
        resolveZoneFromGaze(
          pipelineSmoothedX: -0.2,
          measuredLeft: null,
          measuredRight: null,
        ),
        'LEFT',
      );
      expect(
        resolveZoneFromGaze(
          pipelineSmoothedX: 0.0,
          measuredLeft: null,
          measuredRight: null,
        ),
        'CENTER',
      );
    });

    test('GazeSample pipeline path matches resolveZoneFromGaze', () {
      const sample = GazeSample(
        x: -0.35,
        y: 0,
        space: GazeCoordinateSpace.pipelineSmoothed,
      );
      expect(
        resolveZoneFromGazeSample(
          sample,
          measuredLeft: -0.4,
          measuredRight: 0.4,
          sessionSamples: 200,
        ),
        resolveZoneFromGaze(
          pipelineSmoothedX: -0.35,
          measuredLeft: -0.4,
          measuredRight: 0.4,
          sessionSamples: 200,
        ),
      );
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
