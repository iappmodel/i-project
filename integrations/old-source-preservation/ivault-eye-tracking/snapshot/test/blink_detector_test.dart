import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/blink_detector.dart';
import 'package:eye_tracking_app/ear_calibration.dart';

Map<String, Object?> _snap(
  bool blinking,
  int count, [
  bool? dom,
  double? lDrop,
  double? rDrop,
]) =>
    {
      'isBlinking': blinking,
      'blinkCount': count,
      'isRightDominant': dom,
      'leftDrop': lDrop,
      'rightDrop': rDrop,
    };

void main() {
  test('full cycle: closing → closed → reopen after >80ms counts once (raw)', () {
    final d = BlinkDetector();
    expect(d.updateEar(0.25, 0.25, clockMs: 1_000_000), _snap(false, 0));
    expect(d.updateEar(0.07, 0.07, clockMs: 1_000_001), _snap(true, 0));
    expect(d.updateEar(0.04, 0.04, clockMs: 1_000_002), _snap(true, 0));
    expect(d.updateEar(0.25, 0.25, clockMs: 1_000_090), _snap(false, 1));
  });

  test('multiple closed frames then reopen counts once per cycle', () {
    final d = BlinkDetector();
    expect(d.updateEar(0.25, 0.25, clockMs: 1_000_000), _snap(false, 0));
    expect(d.updateEar(0.07, 0.07, clockMs: 1_000_001), _snap(true, 0));
    expect(d.updateEar(0.06, 0.06, clockMs: 1_000_002), _snap(true, 0));
    expect(d.updateEar(0.05, 0.05, clockMs: 1_000_003), _snap(true, 0));
    expect(d.updateEar(0.25, 0.25, clockMs: 1_000_100), _snap(false, 1));
    expect(d.updateEar(0.25, 0.25, clockMs: 1_000_101), _snap(false, 1));
    expect(
      d.updateEar(0.07, 0.07, clockMs: 1_000_000 + BlinkDetector.BLINK_COOLDOWN_MS + 100),
      _snap(true, 1),
    );
    expect(
      d.updateEar(0.04, 0.04, clockMs: 1_000_000 + BlinkDetector.BLINK_COOLDOWN_MS + 101),
      _snap(true, 1),
    );
    expect(
      d.updateEar(0.25, 0.25, clockMs: 1_000_000 + BlinkDetector.BLINK_COOLDOWN_MS + 200),
      _snap(false, 2),
    );
  });

  test('cooldown suppresses second increment within cooldown window', () {
    final d = BlinkDetector();
    const t0 = 1_000_000;
    expect(d.updateEar(0.25, 0.25, clockMs: t0), _snap(false, 0));
    expect(d.updateEar(0.07, 0.07, clockMs: t0 + 1), _snap(true, 0));
    expect(d.updateEar(0.04, 0.04, clockMs: t0 + 2), _snap(true, 0));
    const firstReopen = t0 + 90;
    expect(d.updateEar(0.25, 0.25, clockMs: firstReopen), _snap(false, 1));
    // Second full blink starts before cooldown expires → count stays 1.
    expect(d.updateEar(0.07, 0.07, clockMs: firstReopen + 1), _snap(true, 1));
    expect(d.updateEar(0.04, 0.04, clockMs: firstReopen + 2), _snap(true, 1));
    expect(d.updateEar(0.25, 0.25, clockMs: firstReopen + 90), _snap(false, 1));
    // After cooldown from last counted blink, a new blink increments.
    final afterCooldown = firstReopen + BlinkDetector.BLINK_COOLDOWN_MS + 1;
    expect(d.updateEar(0.07, 0.07, clockMs: afterCooldown), _snap(true, 1));
    expect(d.updateEar(0.04, 0.04, clockMs: afterCooldown + 1), _snap(true, 1));
    expect(
      d.updateEar(0.25, 0.25, clockMs: afterCooldown + 90),
      _snap(false, 2),
    );
  });

  test('EAR 0.08 does not enter closing (strict < closeThreshold)', () {
    final d = BlinkDetector();
    expect(d.updateEar(0.25, 0.25, clockMs: 1_000_000), _snap(false, 0));
    expect(d.updateEar(0.08, 0.08, clockMs: 1_000_001), _snap(false, 0));
    expect(d.updateEar(0.079, 0.079, clockMs: 1_000_002), _snap(true, 0));
  });

  test('reopen too fast (<81ms) does not increment blinkCount', () {
    final d = BlinkDetector();
    expect(d.updateEar(0.25, 0.25, clockMs: 1_000_000), _snap(false, 0));
    expect(d.updateEar(0.07, 0.07, clockMs: 1_000_001), _snap(true, 0));
    expect(d.updateEar(0.04, 0.04, clockMs: 1_000_002), _snap(true, 0));
    expect(d.updateEar(0.25, 0.25, clockMs: 1_000_080), _snap(false, 0));
  });

  test('noise cancel: closing spikes above openThreshold returns open without count',
      () {
    final d = BlinkDetector();
    expect(d.updateEar(0.25, 0.25, clockMs: 1_000_000), _snap(false, 0));
    expect(d.updateEar(0.07, 0.07, clockMs: 1_000_001), _snap(true, 0));
    expect(d.updateEar(0.25, 0.25, clockMs: 1_000_002), _snap(false, 0));
  });

  test('reset clears count and allows a new blink', () {
    final d = BlinkDetector();
    expect(d.updateEar(0.25, 0.25, clockMs: 1_000_000), _snap(false, 0));
    expect(d.updateEar(0.07, 0.07, clockMs: 1_000_001), _snap(true, 0));
    expect(d.updateEar(0.04, 0.04, clockMs: 1_000_002), _snap(true, 0));
    expect(d.updateEar(0.25, 0.25, clockMs: 1_000_090), _snap(false, 1));
    d.reset();
    expect(d.updateEar(0.25, 0.25, clockMs: 2_000_000), _snap(false, 0));
    expect(d.updateEar(0.07, 0.07, clockMs: 2_000_001), _snap(true, 0));
    expect(d.updateEar(0.04, 0.04, clockMs: 2_000_002), _snap(true, 0));
    expect(d.updateEar(0.25, 0.25, clockMs: 2_000_090), _snap(false, 1));
  });

  test('null ear does not change state', () {
    final d = BlinkDetector();
    d.updateEar(0.25, 0.25, clockMs: 1_000_000);
    d.updateEar(0.07, 0.07, clockMs: 1_000_001);
    expect(d.updateEar(null, null), _snap(true, 0));
    d.updateEar(0.04, 0.04, clockMs: 1_000_002);
    expect(d.updateEar(0.25, 0.25, clockMs: 1_000_090), _snap(false, 1));
  });

  test('normalized mean: open ~1.0, deep blink then reopen sets dominance', () {
    const openL = 0.30;
    const openR = 0.28;
    final d = BlinkDetector();
    expect(
      d.updateEar(0.30, 0.28,
          leftOpenBaseline: openL,
          rightOpenBaseline: openR,
          clockMs: 1_000_000),
      _snap(false, 0),
    );
    expect(
      d.updateEar(0.10, 0.10,
          leftOpenBaseline: openL,
          rightOpenBaseline: openR,
          clockMs: 1_000_001),
      _snap(true, 0),
    );
    expect(
      d.updateEar(0.08, 0.08,
          leftOpenBaseline: openL,
          rightOpenBaseline: openR,
          clockMs: 1_000_002),
      _snap(true, 0),
    );
    final r = d.updateEar(0.30, 0.28,
        leftOpenBaseline: openL,
        rightOpenBaseline: openR,
        clockMs: 1_000_100);
    expect(r['isBlinking'], false);
    expect(r['blinkCount'], 1);
    expect(r['isRightDominant'], false);
    expect(r['leftDrop'], closeTo(0.22, 1e-9));
    expect(r['rightDrop'], closeTo(0.20, 1e-9));
  });

  test('dominance: right deeper blink → isRightDominant true', () {
    const openL = 0.30;
    const openR = 0.28;
    final d = BlinkDetector();
    d.updateEar(0.30, 0.28,
        leftOpenBaseline: openL,
        rightOpenBaseline: openR,
        clockMs: 1_000_000);
    d.updateEar(0.12, 0.02,
        leftOpenBaseline: openL,
        rightOpenBaseline: openR,
        clockMs: 1_000_001);
    d.updateEar(0.10, 0.02,
        leftOpenBaseline: openL,
        rightOpenBaseline: openR,
        clockMs: 1_000_002);
    final after = d.updateEar(0.30, 0.28,
        leftOpenBaseline: openL,
        rightOpenBaseline: openR,
        clockMs: 1_000_100);
    expect(after['isBlinking'], false);
    expect(after['isRightDominant'], true);
    expect(after['leftDrop'], closeTo(0.20, 1e-9));
    expect(after['rightDrop'], closeTo(0.26, 1e-9));
  });

  test('dominance: left deeper blink → isRightDominant false', () {
    const openL = 0.30;
    const openR = 0.28;
    final d = BlinkDetector();
    d.updateEar(0.30, 0.28,
        leftOpenBaseline: openL,
        rightOpenBaseline: openR,
        clockMs: 1_000_000);
    d.updateEar(0.02, 0.14,
        leftOpenBaseline: openL,
        rightOpenBaseline: openR,
        clockMs: 1_000_001);
    d.updateEar(0.02, 0.12,
        leftOpenBaseline: openL,
        rightOpenBaseline: openR,
        clockMs: 1_000_002);
    final after = d.updateEar(0.30, 0.28,
        leftOpenBaseline: openL,
        rightOpenBaseline: openR,
        clockMs: 1_000_100);
    expect(after['isRightDominant'], false);
    expect(after['leftDrop'], closeTo(0.28, 1e-9));
    expect(after['rightDrop'], closeTo(0.16, 1e-9));
  });

  test('dynamic raw: mean baseline drives close ≈ 0.7×mean', () {
    const openL = 0.30;
    const openR = 0.28;
    final mean = (openL + openR) / 2;
    final d = BlinkDetector();
    expect(
      d.updateEar(
        0.30,
        0.28,
        leftOpenBaseline: openL,
        rightOpenBaseline: openR,
        rawMeanBaseline: mean,
        clockMs: 1_000_000,
      ),
      _snap(false, 0),
    );
    final closeTh = mean * rawDynamicCloseFraction;
    final dip = (closeTh - 1e-3).clamp(0.01, 1.0);
    expect(
      d.updateEar(
        dip,
        dip,
        leftOpenBaseline: openL,
        rightOpenBaseline: openR,
        rawMeanBaseline: mean,
        clockMs: 1_000_001,
      ),
      _snap(true, 0),
    );
  });

  test('raw blink without baselines clears dominance on reopen', () {
    final d = BlinkDetector();
    d.updateEar(0.25, 0.25, clockMs: 1_000_000);
    d.updateEar(0.07, 0.07, clockMs: 1_000_001);
    d.updateEar(0.04, 0.04, clockMs: 1_000_002);
    final after = d.updateEar(0.25, 0.25, clockMs: 1_000_100);
    expect(after['isRightDominant'], isNull);
    expect(after['leftDrop'], isNull);
    expect(after['rightDrop'], isNull);
  });
}
