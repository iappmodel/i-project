import 'package:eye_tracking_app/gaze_normalize.dart';
import 'package:eye_tracking_app/trust_merge.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('merge', () {
    test('interpolates toward local by weight', () {
      expect(merge(10, 0, 0.0), 0.0);
      expect(merge(10, 0, 1.0), 10.0);
      expect(merge(10, 0, 0.5), 5.0);
      expect(merge(0, 100, 0.25), 75.0);
    });

    test('clamps weight', () {
      expect(merge(4, 6, -1.0), 6.0);
      expect(merge(4, 6, 2.0), 4.0);
    });
  });

  group('computeLocalWeight', () {
    test('zero or negative samples → trust global only', () {
      expect(computeLocalWeight(0), 0.0);
      expect(computeLocalWeight(-5), 0.0);
    });

    test('ramps to 1 over 200 samples', () {
      expect(computeLocalWeight(100), closeTo(0.5, 1e-9));
      expect(computeLocalWeight(200), 1.0);
      expect(computeLocalWeight(400), 1.0);
    });
  });

  group('effectiveGazeCalibrationBounds', () {
    test('no user calibration → population bounds', () {
      final b = effectiveGazeCalibrationBounds(
        measuredLeft: null,
        measuredRight: null,
        sessionSamples: 0,
      );
      expect(b.left, populationGazeXLeft);
      expect(b.right, populationGazeXRight);
    });

    test('session 0 with user bounds → full global', () {
      final b = effectiveGazeCalibrationBounds(
        measuredLeft: 0.05,
        measuredRight: 0.15,
        sessionSamples: 0,
      );
      expect(b.left, populationGazeXLeft);
      expect(b.right, populationGazeXRight);
    });

    test('session 200 → user bounds', () {
      const ml = 0.05;
      const mr = 0.15;
      final b = effectiveGazeCalibrationBounds(
        measuredLeft: ml,
        measuredRight: mr,
        sessionSamples: 200,
      );
      expect(b.left, ml);
      expect(b.right, mr);
    });
  });
}
