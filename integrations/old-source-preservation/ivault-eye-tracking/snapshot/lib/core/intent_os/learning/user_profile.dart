/// Tunable gaze and interaction parameters for intent learning and UI policy.
class UserProfile {
  /// Jitter tolerance multiplier (variance gates, smoothing).
  double gazeNoiseFactor;

  /// How long gaze must stay stable before counting as focused (ms).
  double fixationThresholdMs;

  /// How long user must hold gaze before dwell is satisfied (ms).
  double dwellThresholdMs;

  /// Blink frequency / EAR sensitivity model scale.
  double blinkSensitivity;

  /// Mapping stability offset for calibration drift (normalized space).
  double calibrationDrift;

  final Map<String, int> commandFrequency = {};

  UserProfile({
    this.gazeNoiseFactor = 1.0,
    this.fixationThresholdMs = 250,
    this.dwellThresholdMs = 1200,
    this.blinkSensitivity = 0.9,
    this.calibrationDrift = 0.0,
  });

  void recordCommand(String intent) {
    commandFrequency[intent] = (commandFrequency[intent] ?? 0) + 1;
  }

  String getMostUsedCommand() {
    if (commandFrequency.isEmpty) return "none";

    return commandFrequency.entries
        .reduce((a, b) => a.value > b.value ? a : b)
        .key;
  }
}
