import 'package:eye_tracking_app/features/gaze/pipeline_frame_confidence.dart';
import 'package:eye_tracking_app/head_confidence.dart' as hc;
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'yaw and pitch null yields headConfidence 1.0; EAR drives confidence',
    () {
      final r = resolvePipelineFrameConfidence(
        headYaw: null,
        headPitch: null,
        hasLandmarks: true,
        leftEar: 0.8,
        rightEar: 0.8,
      );
      expect(r.headConfidence, 1.0);
      expect(r.confidence, 0.8);
      expect(r.filterAlpha, closeTo(0.1 + 0.8 * 0.3, 1e-9));
    },
  );

  test('yaw and pitch at center yields high headConfidence and alpha', () {
    final r = resolvePipelineFrameConfidence(
      headYaw: 0.0,
      headPitch: 0.0,
      hasLandmarks: true,
      leftEar: 0.5,
      rightEar: 0.5,
    );
    expect(r.headConfidence, 1.0);
    expect(r.confidence, 0.5);
    expect(r.filterAlpha, closeTo(0.1 + 0.5 * 0.3, 1e-9));
  });

  test('no landmarks yields confidence 0 and min alpha', () {
    final r = resolvePipelineFrameConfidence(
      headYaw: 0.0,
      headPitch: 0.0,
      hasLandmarks: false,
      leftEar: 0.9,
      rightEar: 0.9,
    );
    expect(r.confidence, 0.0);
    expect(r.filterAlpha, 0.1);
  });

  test(
    'non-finite yaw yields head confidence 0 and minimum smoothing alpha',
    () {
      final r = resolvePipelineFrameConfidence(
        headYaw: double.nan,
        headPitch: 0.0,
        hasLandmarks: true,
        leftEar: 1.0,
        rightEar: 1.0,
      );
      expect(r.headConfidence, 0.0);
      expect(r.confidence, 0.0);
      expect(r.filterAlpha, 0.1);
    },
  );

  test('one of yaw or pitch null yields headConfidence 1.0 (same as main)', () {
    final r = resolvePipelineFrameConfidence(
      headYaw: 0.1,
      headPitch: null,
      hasLandmarks: true,
      leftEar: 0.4,
      rightEar: 0.4,
    );
    expect(r.headConfidence, 1.0);
    expect(r.confidence, 0.4);
  });

  test('parity with manual head_confidence chain', () {
    const yaw = 0.05;
    const pitch = -0.03;
    const hasLandmarks = true;
    const leftEar = 0.7;
    const rightEar = 0.5;

    final headConf = hc.headConfidence(yaw, pitch);
    final confidence = hc.computeConfidence(
      hasLandmarks: hasLandmarks,
      leftEar: leftEar,
      rightEar: rightEar,
      headConf: headConf,
    );
    final alpha = hc.smoothingAlphaFromConfidence(confidence);

    final r = resolvePipelineFrameConfidence(
      headYaw: yaw,
      headPitch: pitch,
      hasLandmarks: hasLandmarks,
      leftEar: leftEar,
      rightEar: rightEar,
    );

    expect(r.headConfidence, headConf);
    expect(r.confidence, confidence);
    expect(r.filterAlpha, alpha);
  });
}
