import 'package:eye_tracking_app/core/intent_os/learning/behavior_profile.dart';
import 'package:eye_tracking_app/core/intent_os/learning/user_type.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('classify', () {
    test('stable when stability above 0.7', () {
      expect(
        classify(const UserModel(avgStability: 0.71, avgDwell: 200)),
        UserType.stable,
      );
    });

    test('fast when not stable and dwell under 400', () {
      expect(
        classify(const UserModel(avgStability: 0.5, avgDwell: 350)),
        UserType.fast,
      );
    });

    test('slow when not stable and dwell above 900', () {
      expect(
        classify(const UserModel(avgStability: 0.5, avgDwell: 950)),
        UserType.slow,
      );
    });

    test('shaky in the middle band', () {
      expect(
        classify(const UserModel(avgStability: 0.5, avgDwell: 600)),
        UserType.shaky,
      );
    });
  });

  group('ClusterPriors', () {
    test('priorsForBehavior matches classify + clusterStats', () {
      final b = BehaviorProfile()
        ..gazeStabilityIndex = 0.8
        ..avgDwellMs = 500;
      expect(
        ClusterPriors.priorsForBehavior(b),
        ClusterPriors.clusterStats(classify(UserModel.fromBehavior(b))),
      );
    });

    test('cluster priors differ by type', () {
      final s = ClusterPriors.clusterStats(UserType.stable).avgDwell;
      final f = ClusterPriors.clusterStats(UserType.fast).avgDwell;
      expect(f < s, isTrue);
    });
  });
}
