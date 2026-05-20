import 'user_profile.dart';
import 'feedback_buffer.dart';

class IntentLearner {
  final UserProfile profile;
  final FeedbackBuffer feedback;

  IntentLearner(this.profile, this.feedback);

  void adapt() {
    final success = feedback.successRate();

    if (success < 0.6) {
      profile.dwellThresholdMs += 40;
      profile.fixationThresholdMs += 15;
      profile.gazeNoiseFactor += 0.05;
      profile.blinkSensitivity += 0.03;
      profile.calibrationDrift =
          (profile.calibrationDrift + 0.002).clamp(-0.05, 0.05);
    }

    if (success > 0.85) {
      profile.dwellThresholdMs -= 20;
      profile.fixationThresholdMs -= 8;
      profile.gazeNoiseFactor -= 0.025;
      profile.blinkSensitivity -= 0.015;
      profile.calibrationDrift =
          (profile.calibrationDrift - 0.001).clamp(-0.05, 0.05);
    }

    profile.dwellThresholdMs = profile.dwellThresholdMs.clamp(200, 2000);
    profile.fixationThresholdMs =
        profile.fixationThresholdMs.clamp(120, 600);
    profile.gazeNoiseFactor = profile.gazeNoiseFactor.clamp(0.5, 2.0);
    profile.blinkSensitivity = profile.blinkSensitivity.clamp(0.5, 2.0);
  }
}
