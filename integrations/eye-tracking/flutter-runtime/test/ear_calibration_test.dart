import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/ear_calibration.dart';

void main() {
  test('earFatigueLevel is baseline mean minus current mean', () {
    expect(earFatigueLevel(0.30, 0.28), closeTo(0.02, 1e-9));
    expect(earFatigueLevel(0.30, 0.32), closeTo(-0.02, 1e-9));
  });

  test('dynamicEarCloseThreshold is 0.7 × baseline mean', () {
    expect(dynamicEarCloseThreshold(0.30), closeTo(0.21, 1e-9));
  });

  test('rawMeanEarDynamicThresholds keeps min < close < open', () {
    final t = rawMeanEarDynamicThresholds(0.29);
    expect(t.minTh, lessThan(t.closeTh));
    expect(t.closeTh, lessThan(t.openTh));
    expect(t.closeTh, closeTo(0.29 * rawDynamicCloseFraction, 1e-9));
  });
}
