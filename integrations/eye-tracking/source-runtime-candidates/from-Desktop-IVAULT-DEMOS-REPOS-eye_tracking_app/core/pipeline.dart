import 'dart:ui';

import 'package:eye_tracking_app/core/stability/tracking_engine.dart';
import 'package:eye_tracking_app/core/stability/tracking_state.dart';

import 'calibration/adaptive_calibration_engine.dart';
import 'control/pointer_controller.dart';
import 'stability/smoothing.dart';

class Pipeline {
  static const double _enterTrackingThreshold = 0.35;
  static const double _exitTrackingThreshold = 0.25;

  Pipeline({
    required this.trackingEngine,
    required this.calibrationEngine,
    required this.smoothing,
    required this.pointerController,
  });

  final TrackingEngine trackingEngine;
  final AdaptiveCalibrationEngine calibrationEngine;
  final Smoothing smoothing;
  final PointerController pointerController;
  bool _faceDetectedStable = false;

  void processFrame({
    required bool faceDetected,
    required double quality,
    required List<double> features,
    required Offset rawGaze,
  }) {
    // Keep hysteresis at state boundaries only; do not reshape raw feature data.
    final qualityClamped = quality.clamp(0.0, 1.0).toDouble();

    // Use hysteresis to reduce state flicker around a single threshold.
    final stableFaceDetected = _applyFaceDetectionHysteresis(
      faceDetected: faceDetected,
      quality: qualityClamped,
    );

    trackingEngine.update(
      faceDetected: stableFaceDetected,
      quality: qualityClamped,
    );

    if (trackingEngine.state == TrackingState.tracking ||
        trackingEngine.state == TrackingState.degraded) {
      final calibrated = calibrationEngine.predict(features);
      final smooth = smoothing.apply(calibrated, 0.15);

      final stability = qualityClamped.clamp(0.0, 1.0);

      // ignore: unused_local_variable — use for overlay / hit-testing when wiring UI.
      final pointerPosition = pointerController.update(
        smooth,
        stability,
      );
    }
  }

  bool _applyFaceDetectionHysteresis({
    required bool faceDetected,
    required double quality,
  }) {
    if (!faceDetected) {
      _faceDetectedStable = false;
      return false;
    }

    if (_faceDetectedStable) {
      _faceDetectedStable = quality > _exitTrackingThreshold;
    } else {
      _faceDetectedStable = quality > _enterTrackingThreshold;
    }
    return _faceDetectedStable;
  }
}
