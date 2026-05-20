import 'dart:ui';

enum EyeMotionState {
  fixation,
  saccade,
  unstable,
  noFace,
}

class GazeSample {
  final double rawX;
  final double rawY;
  final double smoothedX;
  final double smoothedY;
  final double leftEar;
  final double rightEar;
  final double yaw;
  final double pitch;
  final bool hasFace;
  final int timestampMs;

  const GazeSample({
    required this.rawX,
    required this.rawY,
    required this.smoothedX,
    required this.smoothedY,
    required this.leftEar,
    required this.rightEar,
    required this.yaw,
    required this.pitch,
    required this.hasFace,
    required this.timestampMs,
  });
}

class CalibrationPoint {
  final Offset screenPoint;
  final Offset gazePoint;

  const CalibrationPoint({
    required this.screenPoint,
    required this.gazePoint,
  });
}
