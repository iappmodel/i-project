import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/features/gaze/drift_adjusted_gaze.dart';

void main() {
  test('both raw finite and zero drift', () {
    final r = resolveDriftAdjustedGaze(
      gazeXRaw: 0.1,
      gazeYRaw: 0.2,
      calibrationDrift: 0.0,
    );
    expect(r.rawX, 0.1);
    expect(r.rawY, 0.2);
    expect(r.hasFiniteRawGaze, isTrue);
  });

  test('drift applied to x and y when both non-null', () {
    final r = resolveDriftAdjustedGaze(
      gazeXRaw: 0.5,
      gazeYRaw: 0.3,
      calibrationDrift: 0.1,
    );
    expect(r.rawX, 0.6);
    expect(r.rawY, 0.4);
    expect(r.hasFiniteRawGaze, isTrue);
  });

  test('null x makes hasFiniteRawGaze false', () {
    final r = resolveDriftAdjustedGaze(
      gazeXRaw: null,
      gazeYRaw: 0.2,
      calibrationDrift: 0.0,
    );
    expect(r.rawX, isNull);
    expect(r.rawY, 0.2);
    expect(r.hasFiniteRawGaze, isFalse);
  });

  test('null y makes hasFiniteRawGaze false', () {
    final r = resolveDriftAdjustedGaze(
      gazeXRaw: 0.1,
      gazeYRaw: null,
      calibrationDrift: 0.0,
    );
    expect(r.rawX, 0.1);
    expect(r.rawY, isNull);
    expect(r.hasFiniteRawGaze, isFalse);
  });

  test('non-finite x makes hasFiniteRawGaze false', () {
    final r = resolveDriftAdjustedGaze(
      gazeXRaw: double.nan,
      gazeYRaw: 0.2,
      calibrationDrift: 0.0,
    );
    expect(r.rawX, isNotNull);
    expect(r.rawY, 0.2);
    expect(r.hasFiniteRawGaze, isFalse);
  });

  test('non-finite y makes hasFiniteRawGaze false', () {
    final r = resolveDriftAdjustedGaze(
      gazeXRaw: 0.1,
      gazeYRaw: double.infinity,
      calibrationDrift: 0.0,
    );
    expect(r.rawX, 0.1);
    expect(r.rawY, double.infinity);
    expect(r.hasFiniteRawGaze, isFalse);
  });
}
