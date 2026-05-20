import 'collective_stats.dart';
import '../ui_action.dart';

class LearningSignal {
  final bool actionTaken;
  final bool correctAction;
  final double dwellTime;
  final double successScore;
  final double stabilityScore;
  final double blinkLoad;

  const LearningSignal({
    required this.actionTaken,
    required this.correctAction,
    required this.dwellTime,
    required this.successScore,
    required this.stabilityScore,
    required this.blinkLoad,
  });
}

class LearningEngine {
  static const double _initialDwellThreshold = 600;
  static const double _initialSmoothingAlpha = 0.2;
  static const double _initialBlinkSensitivity = 1.0;

  double dwellThreshold = _initialDwellThreshold;
  double smoothingAlpha = _initialSmoothingAlpha;
  double blinkSensitivity = _initialBlinkSensitivity;

  /// Reset tunables so [_refitFromActionHistory] / full replay starts from a cold prior.
  void reset() {
    dwellThreshold = _initialDwellThreshold;
    smoothingAlpha = _initialSmoothingAlpha;
    blinkSensitivity = _initialBlinkSensitivity;
  }

  void learn(LearningSignal signal) {
    _adaptDwell(signal);
    _adaptSmoothing(signal);
    _adaptBlink(signal);
  }

  /// Ingest outcome from the action pipeline (e.g. after recording [ActionMemory]).
  ///
  /// [success] is true when the gate allowed execution and the action ran; false on hold.
  /// [predictedRisk] is the sandbox risk score in \[0,1\].
  void ingest({
    required UIAction action,
    required double predictedRisk,
    required bool success,
  }) {
    final r = predictedRisk.clamp(0.0, 1.0);
    learn(
      LearningSignal(
        actionTaken: success,
        correctAction: success,
        dwellTime: dwellThreshold,
        successScore: success ? 1.0 : 0.0,
        stabilityScore: 1.0 - r,
        blinkLoad: 0.0,
      ),
    );
  }

  /// Blend local parameters toward cohort priors when the user has few local samples.
  ///
  /// Prefer `ClusterPriors.clusterStats` / `ClusterPriors.priorsForBehavior` in
  /// `user_type.dart` over a single global prior.
  void applyCollective(CollectiveStats global, int samples) {
    final w = computeLocalWeight(samples);

    dwellThreshold = merge(dwellThreshold, global.avgDwell, w);
    smoothingAlpha = merge(smoothingAlpha, global.avgStability, w);

    dwellThreshold = dwellThreshold.clamp(300, 1200).toDouble();
    smoothingAlpha = smoothingAlpha.clamp(0.05, 0.4).toDouble();
  }

  /// Local trust in \([0,1]\): more samples → keep local values more.
  double computeLocalWeight(int samples) {
    if (samples <= 0) return 0.0;
    return (samples / (samples + 30)).clamp(0.0, 1.0);
  }

  /// Convex blend: `local * w + global * (1 - w)`.
  double merge(double local, double global, double w) {
    return local * w + global * (1.0 - w);
  }

  void _adaptDwell(LearningSignal signal) {
    if (!signal.actionTaken) return;

    if (signal.correctAction) {
      dwellThreshold = _lerp(dwellThreshold, signal.dwellTime * 0.9, 0.1);
    } else {
      dwellThreshold = _lerp(dwellThreshold, dwellThreshold + 100, 0.2);
    }

    dwellThreshold = dwellThreshold.clamp(300, 1200).toDouble();
  }

  void _adaptSmoothing(LearningSignal signal) {
    if (signal.stabilityScore < 0.5) {
      smoothingAlpha = _lerp(smoothingAlpha, 0.1, 0.1);
    } else {
      smoothingAlpha = _lerp(smoothingAlpha, 0.3, 0.1);
    }

    smoothingAlpha = smoothingAlpha.clamp(0.05, 0.4).toDouble();
  }

  void _adaptBlink(LearningSignal signal) {
    if (!signal.actionTaken) return;

    if (!signal.correctAction) {
      blinkSensitivity *= 0.95;
    } else {
      blinkSensitivity *= 1.02;
    }

    blinkSensitivity = blinkSensitivity.clamp(0.5, 2.0).toDouble();
  }

  double _lerp(double from, double to, double t) {
    return from + (to - from) * t;
  }
}
