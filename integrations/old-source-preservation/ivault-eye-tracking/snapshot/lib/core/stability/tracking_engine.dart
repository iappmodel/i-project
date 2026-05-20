import 'dart:ui';

import 'tracking_state.dart';

class TrackingEngine {
  static const double _trackingEnterThreshold = 0.8;
  static const double _trackingExitThreshold = 0.65;
  static const double _lostEnterThreshold = 0.2;
  static const double _lostExitThreshold = 0.3;

  TrackingState state = TrackingState.lost;

  double confidence = 0.0;
  int consecutiveFailures = 0;
  Offset? lastGoodGaze;
  double lastGoodConfidence = 0.0;

  void update({required bool faceDetected, required double quality}) {
    final qualityClamped = quality.clamp(0.0, 1.0).toDouble();

    if (!faceDetected) {
      consecutiveFailures++;
      if (lastGoodGaze != null && consecutiveFailures < 10) {
        // stay in degraded mode instead of dropping to zero
        state = TrackingState.degraded;
        return;
      }
      state = TrackingState.lost;
      return;
    }

    consecutiveFailures = 0;
    confidence = qualityClamped;

    switch (state) {
      case TrackingState.tracking:
        if (confidence < _trackingExitThreshold) {
          state = confidence <= _lostEnterThreshold
              ? TrackingState.lost
              : TrackingState.degraded;
        }
        break;
      case TrackingState.degraded:
        if (confidence >= _trackingEnterThreshold) {
          state = TrackingState.tracking;
        } else if (confidence <= _lostEnterThreshold) {
          state = TrackingState.lost;
        }
        break;
      case TrackingState.lost:
        if (confidence >= _trackingEnterThreshold) {
          state = TrackingState.tracking;
        } else if (confidence >= _lostExitThreshold) {
          state = TrackingState.degraded;
        }
        break;
      case TrackingState.initializing:
      case TrackingState.recovering:
        if (confidence >= _trackingEnterThreshold) {
          state = TrackingState.tracking;
        } else if (confidence <= _lostEnterThreshold) {
          state = TrackingState.lost;
        } else {
          state = TrackingState.degraded;
        }
        break;
    }
  }
}
