import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/core/stability/tracking_engine.dart';
import 'package:eye_tracking_app/core/stability/tracking_state.dart';
import 'package:eye_tracking_app/engine/gaze_pipeline.dart';
import 'package:eye_tracking_app/features/gaze/pipeline_tracking_coordinator.dart';

void _manualSequence({
  required GazePipeline pipeline,
  required TrackingEngine tracking,
  required double x,
  required double y,
  required int now,
  required bool blink,
  required double? headYaw,
  required double? headPitch,
  required double? filterAlpha,
  required bool faceDetected,
}) {
  final result = pipeline.update(
    x: x,
    y: y,
    valid: true,
    now: now,
    blink: blink,
    headYaw: headYaw,
    headPitch: headPitch,
    filterAlpha: filterAlpha,
  );
  final isValid = result.valid && result.x != null && result.y != null;
  final qualityClamped = (result.quality ?? 0.0).clamp(0.0, 1.0).toDouble();
  tracking.update(
    faceDetected: faceDetected,
    quality: isValid ? qualityClamped : 0.0,
  );
}

void main() {
  group('runPipelineAndTrackingTick', () {
    test('matches decomposed update+tracking on fresh instances', () {
      final pRef = GazePipeline();
      final refResult = pRef.update(
        x: 0.05,
        y: 0.04,
        valid: true,
        now: 1_000_000,
        blink: false,
        headYaw: 0.01,
        headPitch: 0.02,
        filterAlpha: 0.5,
      );
      final tRef = TrackingEngine();
      final isValidRef =
          refResult.valid && refResult.x != null && refResult.y != null;
      final qcRef = (refResult.quality ?? 0.0).clamp(0.0, 1.0).toDouble();
      tRef.update(faceDetected: true, quality: isValidRef ? qcRef : 0.0);

      final pCoord = GazePipeline();
      final tCoord = TrackingEngine();
      final tick = runPipelineAndTrackingTick(
        pipeline: pCoord,
        tracking: tCoord,
        x: 0.05,
        y: 0.04,
        now: 1_000_000,
        blink: false,
        headYaw: 0.01,
        headPitch: 0.02,
        filterAlpha: 0.5,
        faceDetected: true,
      );

      expect(tick.result.x, refResult.x);
      expect(tick.result.y, refResult.y);
      expect(tick.result.valid, refResult.valid);
      expect(tick.result.quality, refResult.quality);
      expect(tick.isValid, isValidRef);
      expect(tick.qualityClamped, qcRef);
      expect(tCoord.state, tRef.state);
      expect(tCoord.confidence, tRef.confidence);
      expect(tick.qualityClamped, inInclusiveRange(0.0, 1.0));
    });

    test('tick fields derive exactly from result', () {
      final p = GazePipeline();
      final t = TrackingEngine();
      final tick = runPipelineAndTrackingTick(
        pipeline: p,
        tracking: t,
        x: 0.1,
        y: -0.05,
        now: 2_000_000,
        blink: false,
        headYaw: null,
        headPitch: null,
        filterAlpha: 0.7,
        faceDetected: true,
      );
      final r = tick.result;
      expect(tick.isValid, r.valid && r.x != null && r.y != null);
      expect(
        tick.qualityClamped,
        (r.quality ?? 0.0).clamp(0.0, 1.0).toDouble(),
      );
    });

    test('faceDetected false matches manual tracking outcome', () {
      final pC = GazePipeline();
      final tC = TrackingEngine();
      final pM = GazePipeline();
      final tM = TrackingEngine();

      final tick = runPipelineAndTrackingTick(
        pipeline: pC,
        tracking: tC,
        x: 0.02,
        y: 0.03,
        now: 3_000_000,
        blink: false,
        headYaw: null,
        headPitch: null,
        filterAlpha: 0.6,
        faceDetected: false,
      );

      _manualSequence(
        pipeline: pM,
        tracking: tM,
        x: 0.02,
        y: 0.03,
        now: 3_000_000,
        blink: false,
        headYaw: null,
        headPitch: null,
        filterAlpha: 0.6,
        faceDetected: false,
      );

      expect(tC.state, tM.state);
      expect(tC.consecutiveFailures, tM.consecutiveFailures);
      expect(tick.isValid, isTrue);
      expect(tC.state, TrackingState.lost);
    });
  });
}
