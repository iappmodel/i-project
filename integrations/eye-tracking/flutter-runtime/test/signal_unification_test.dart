import 'package:eye_tracking_app/engine/gaze_pipeline.dart';
import 'package:eye_tracking_app/gaze_fixation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Phase 2 signal unification', () {
    test('valid gaze produces smoothed canonical output', () {
      final pipeline = GazePipeline();
      final now = DateTime.now().millisecondsSinceEpoch;

      final out = pipeline.update(
        x: 0.42,
        y: 0.51,
        valid: true,
        now: now,
        blink: false,
        headYaw: 0,
        headPitch: 0,
        filterAlpha: 0.25,
      );

      expect(out.valid, isTrue);
      expect(out.x, isNotNull);
      expect(out.y, isNotNull);
      expect(out.quality, isNotNull);
      expect(out.varX, isNotNull);
      expect(out.varY, isNotNull);
    });

    test('invalid gaze returns degraded output', () {
      final pipeline = GazePipeline();
      final out = pipeline.update(
        x: 0.0,
        y: 0.0,
        valid: false,
        now: 0,
        blink: false,
        headYaw: 0,
        headPitch: 0,
        filterAlpha: 0.2,
      );

      expect(out.valid, isFalse);
      expect(out.x, isNull);
      expect(out.y, isNull);
      expect(out.quality, isNull);
    });

    test('fixation transition works from unstable to fixation', () {
      final pipeline = GazePipeline();
      final fixation = GazeFixation();
      final start = 1_000;
      FixationState state = FixationState.unstable;

      for (var i = 0; i < 30; i++) {
        final t = start + (i * 40);
        final out = pipeline.update(
          x: 0.50,
          y: 0.50,
          valid: true,
          now: t,
          blink: false,
          headYaw: 0,
          headPitch: 0,
          filterAlpha: 0.3,
        );
        state = fixation.update(
          buffer: pipeline.buffer,
          varX: out.varX ?? 1,
          varY: out.varY ?? 1,
          now: t,
        );
      }

      expect(state, FixationState.fixation);
    });

    test('variance thresholds stay in stable range for steady gaze', () {
      final pipeline = GazePipeline();
      final start = 2_000;

      GazePipelineOutput out = const GazePipelineOutput.invalid();
      for (var i = 0; i < 12; i++) {
        out = pipeline.update(
          x: 0.33,
          y: 0.66,
          valid: true,
          now: start + (i * 16),
          blink: false,
          headYaw: 0,
          headPitch: 0,
          filterAlpha: 0.25,
        );
      }

      expect(out.valid, isTrue);
      expect(out.varX, isNotNull);
      expect(out.varY, isNotNull);
      expect(out.varX!, lessThan(0.00003));
      expect(out.varY!, lessThan(0.00003));
    });
  });
}
