import 'package:eye_tracking_app/replay/pop_replay_driver.dart';
import 'package:eye_tracking_app/replay/pop_replay_types.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fixtures/pop_replay_fixtures.dart';

void main() {
  const config = PopReplayConfig(
    measuredLeft: -0.4,
    measuredRight: 0.4,
    zoneDwellMs: 1200,
    dwellReleaseMs: 200,
  );

  group('PopReplayDriver', () {
    test('left band warmup reaches tracking and fixation', () {
      final result = PopReplayDriver(config: config).run(
        buildLeftBandWarmup(frameCount: 48),
      );

      expect(result.lastZone, 'LEFT');
      expect(result.lastFixation, 'fixation');
      expect(result.lastTrackingState, 'tracking');
      expect(
        result.milestones.any((m) => m.line.startsWith('zone=LEFT@')),
        isTrue,
      );
    });

    test('golden: left dwell then blink selects zone once', () {
      final result = PopReplayDriver(config: config).run(
        buildLeftDwellThenBlinkSelect(),
      );

      expect(result.zoneCommitCount, 1);
      expect(
        result.milestones.any((m) => m.line.contains('dwell_satisfied=LEFT@')),
        isTrue,
      );
      final commit = result.milestones
          .where((m) => m.line.startsWith('commit@'))
          .map((m) => m.line)
          .toList();
      expect(commit.length, 1);
      expect(commit.single, contains('gate=allowed'));
      expect(commit.single, contains('ok=true'));
      expect(commit.single, contains('zone=LEFT'));

      // Lock digest shape (update intentionally when pipeline behavior changes).
      expect(result.digest(), contains('zone=LEFT@'));
      expect(result.digest(), contains('dwell_satisfied=LEFT@'));
      expect(result.digest(), contains('commit@'));
    });

    test('stale gaze during hold blocks commit', () {
      final result = PopReplayDriver(config: config).run(
        buildLeftDwellStaleGazeBlink(),
      );

      expect(result.zoneCommitCount, 0);
      final commit = result.milestones
          .where((m) => m.line.startsWith('commit@'))
          .map((m) => m.line)
          .single;
      expect(commit, contains('gate=blockedHighRisk'));
      expect(commit, contains('ok=false'));
      expect(commit, contains('fresh=false'));
    });

    test('face loss emits milestone and prevents commit', () {
      final result = PopReplayDriver(config: config).run(
        buildFaceLossReset(),
      );

      expect(
        result.milestones.any((m) => m.line.startsWith('face_lost@')),
        isTrue,
      );
      expect(result.zoneCommitCount, 0);
    });
  });
}
