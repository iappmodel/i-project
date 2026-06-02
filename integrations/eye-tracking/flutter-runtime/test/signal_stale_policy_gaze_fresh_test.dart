import 'package:eye_tracking_app/core/signal_stale_policy.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('isGazeFreshForCommit', () {
    test('false when never had fresh gaze', () {
      expect(
        isGazeFreshForCommit(lastFreshGazeMs: 0, nowMs: 1000),
        isFalse,
      );
    });

    test('true within hold freshness window', () {
      expect(
        isGazeFreshForCommit(lastFreshGazeMs: 1000, nowMs: 1150),
        isTrue,
      );
    });

    test('false beyond hold freshness window', () {
      expect(
        isGazeFreshForCommit(lastFreshGazeMs: 1000, nowMs: 1300),
        isFalse,
      );
    });
  });
}
