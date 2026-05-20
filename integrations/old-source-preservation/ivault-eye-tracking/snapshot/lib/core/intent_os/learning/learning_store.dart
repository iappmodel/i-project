import 'behavior_profile.dart';
import 'collective_memory.dart';
import 'collective_zone_stats.dart';
import 'user_profile.dart';

/// Exponential smoothing (α=0.4) of [UserProfile] fields toward observed behavior.
/// [behavior] supplies intent thresholds ([BehaviorProfile.avgFixationMs], [BehaviorProfile.avgDwellMs]).
class LearningStore {
  final UserProfile profile;
  final BehaviorProfile behavior;
  final CollectiveMemory memory;
  final CollectiveZoneStats collectiveZones;

  LearningStore({
    UserProfile? profile,
    BehaviorProfile? behavior,
    CollectiveMemory? memory,
    CollectiveZoneStats? collectiveZones,
  })
      : profile = profile ?? UserProfile(),
        behavior = behavior ?? BehaviorProfile(),
        memory = memory ?? CollectiveMemory(),
        collectiveZones = collectiveZones ?? CollectiveZoneStats();

  void updateFixation(double actualMs) {
    profile.fixationThresholdMs =
        profile.fixationThresholdMs * 0.6 + actualMs * 0.4;
  }

  void updateDwell(double actualMs) {
    profile.dwellThresholdMs =
        profile.dwellThresholdMs * 0.6 + actualMs * 0.4;
  }

  void updateBlink(double rate) {
    profile.blinkSensitivity =
        profile.blinkSensitivity * 0.6 + rate * 0.4;
  }

  void updateNoise(double jitter) {
    profile.gazeNoiseFactor =
        profile.gazeNoiseFactor * 0.6 + jitter * 0.4;
  }

  void updateCalibration(double errorX, double errorY) {
    profile.calibrationDrift =
        profile.calibrationDrift * 0.95 +
        (errorX.abs() + errorY.abs()) * 0.05;
  }
}
