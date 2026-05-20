import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/gaze_normalize.dart';
import 'package:eye_tracking_app/gaze_zone.dart';

void main() {
  const minX = 0.076;
  const maxX = 0.132;

  test('normalizeGazeX maps measured bounds to 0 and 1', () {
    expect(normalizeGazeX(minX, minX, maxX), 0.0);
    expect(normalizeGazeX(maxX, minX, maxX), 1.0);
    final mid = minX + (maxX - minX) / 2;
    expect(normalizeGazeX(mid, minX, maxX), closeTo(0.5, 1e-12));
  });

  test('normalizeGazeX swaps inverted left/right measurements', () {
    // Same numeric bounds as 0.076..0.132 but passed right-then-left.
    final mid = (0.076 + 0.132) / 2;
    expect(normalizeGazeX(mid, 0.132, 0.076), closeTo(0.5, 1e-9));
  });

  test('normalizeGazeX returns null until both sides measured', () {
    expect(normalizeGazeX(0.10, null, 0.132), isNull);
    expect(normalizeGazeX(0.10, 0.076, null), isNull);
  });

  test('getGazeZone uses 0.33 / 0.66 cutoffs on normalized gaze', () {
    expect(getGazeZone(0.32), 'LEFT');
    expect(getGazeZone(0.33), 'CENTER');
    expect(getGazeZone(0.5), 'CENTER');
    expect(getGazeZone(0.66), 'CENTER');
    expect(getGazeZone(0.67), 'RIGHT');
  });

  test('getZone uses ±0.10 deadband on raw gaze X', () {
    expect(getZone(-0.11), 'LEFT');
    expect(getZone(-0.10), 'CENTER');
    expect(getZone(0), 'CENTER');
    expect(getZone(0.10), 'CENTER');
    expect(getZone(0.11), 'RIGHT');
  });
}
