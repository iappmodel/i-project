/// Calibration FSM labels and capture gates ([main] Cal L/R/N/EAR buttons).
///
/// **Calibration tuning:** sample acceptance (multi-frame, fixation) and operator
/// feedback — see docs/technical/CALIBRATION_TUNING_PLAN.md.
enum CalibrationPhase {
  idle,
  samplingLeft,
  samplingRight,
  samplingNeutralYaw,
  samplingOpenEar,
  ready,
}

/// Which capture the user started ([main] calibration buttons).
enum CalibrationBeginCaptureKind { leftGaze, rightGaze, neutralHeadYaw }

/// Pure intent for starting gaze/neutral capture; null pending slots must not be written in [setState].
final class CalibrationBeginCapturePlan {
  const CalibrationBeginCapturePlan({
    required this.phase,
    this.pendingCaptureLeft,
    this.pendingCaptureRight,
    this.pendingCaptureNeutralYaw,
  });

  final CalibrationPhase phase;
  final bool? pendingCaptureLeft;
  final bool? pendingCaptureRight;
  final bool? pendingCaptureNeutralYaw;
}

/// Matches prior `_beginLeftCalibration` / `_beginRightCalibration` / `_requestNeutralYawAndSample` [setState] assignments.
CalibrationBeginCapturePlan calibrationBeginCapturePlan(
  CalibrationBeginCaptureKind kind,
) {
  switch (kind) {
    case CalibrationBeginCaptureKind.leftGaze:
      return const CalibrationBeginCapturePlan(
        phase: CalibrationPhase.samplingLeft,
        pendingCaptureLeft: true,
      );
    case CalibrationBeginCaptureKind.rightGaze:
      return const CalibrationBeginCapturePlan(
        phase: CalibrationPhase.samplingRight,
        pendingCaptureRight: true,
      );
    case CalibrationBeginCaptureKind.neutralHeadYaw:
      return const CalibrationBeginCapturePlan(
        phase: CalibrationPhase.samplingNeutralYaw,
        pendingCaptureNeutralYaw: true,
      );
  }
}

/// Debug / overlay label for [CalibrationPhase] (must match prior [main] strings).
String calibrationPhaseLabel(CalibrationPhase phase) {
  switch (phase) {
    case CalibrationPhase.idle:
      return 'idle';
    case CalibrationPhase.samplingLeft:
      return 'sampling-left';
    case CalibrationPhase.samplingRight:
      return 'sampling-right';
    case CalibrationPhase.samplingNeutralYaw:
      return 'sampling-neutral';
    case CalibrationPhase.samplingOpenEar:
      return 'sampling-ear';
    case CalibrationPhase.ready:
      return 'ready';
  }
}

/// Immutable gaze + neutral head-yaw calibration captures ([main] fields only; no open-EAR).
final class GazeYawCalibrationSamples {
  const GazeYawCalibrationSamples({
    this.gazeMeasuredLeft,
    this.gazeMeasuredRight,
    this.neutralHeadYaw,
  });

  final double? gazeMeasuredLeft;
  final double? gazeMeasuredRight;
  final double? neutralHeadYaw;
}

/// True when look-left, look-right, and neutral yaw samples are all captured.
bool isGazeYawCalibrationComplete(GazeYawCalibrationSamples samples) =>
    samples.gazeMeasuredLeft != null &&
    samples.gazeMeasuredRight != null &&
    samples.neutralHeadYaw != null;

/// Full calibration readiness: gaze/yaw samples plus open-EAR baselines (same as [isCalibrationReady]).
bool isCalibrationReadyFromSamples({
  required GazeYawCalibrationSamples gazeYaw,
  required double? leftOpenEar,
  required double? rightOpenEar,
}) =>
    isGazeYawCalibrationComplete(gazeYaw) &&
    leftOpenEar != null &&
    rightOpenEar != null;

/// True when all gaze, head-yaw, and open-EAR samples exist (matches prior [main] `_isCalibrationReady`).
bool isCalibrationReady({
  double? gazeMeasuredLeft,
  double? gazeMeasuredRight,
  double? neutralHeadYaw,
  double? leftOpenEar,
  double? rightOpenEar,
}) => isCalibrationReadyFromSamples(
  gazeYaw: GazeYawCalibrationSamples(
    gazeMeasuredLeft: gazeMeasuredLeft,
    gazeMeasuredRight: gazeMeasuredRight,
    neutralHeadYaw: neutralHeadYaw,
  ),
  leftOpenEar: leftOpenEar,
  rightOpenEar: rightOpenEar,
);

/// True when [phase] is actively sampling (not [CalibrationPhase.idle] or [CalibrationPhase.ready]).
bool isCalibrationBusy(CalibrationPhase phase) =>
    phase != CalibrationPhase.idle && phase != CalibrationPhase.ready;

/// True when a look-left gaze sample should be taken this frame ([main] `_normalize` gate).
bool shouldApplyLeftGazeSample({
  required bool pendingLeft,
  required double? gazeX,
}) => pendingLeft && gazeX != null;

/// True when a look-right gaze sample should be taken this frame ([main] `_normalize` gate).
bool shouldApplyRightGazeSample({
  required bool pendingRight,
  required double? gazeX,
}) => pendingRight && gazeX != null;

/// True when neutral head yaw should be captured this frame ([main] `_normalize` gate).
bool shouldApplyNeutralHeadYawSample({
  required bool pendingNeutral,
  required double? headYawRaw,
}) => pendingNeutral && headYawRaw != null && headYawRaw.isFinite;

/// Mean open-EAR baseline when both calibrated values exist ([main] `rawMeanBaseline` / blink UI).
double? rawMeanOpenEarBaseline(double? left, double? right) {
  if (left == null || right == null) return null;
  return (left + right) / 2;
}

/// True when open-ear calibrator should accept a frame ([main] `_refreshLandmarksAndEarBaselines` gate).
bool shouldApplyOpenEarCalibratorFrame({
  required bool openEarCalibrating,
  required bool hasFace,
  required double? leftEar,
  required double? rightEar,
}) => openEarCalibrating && hasFace && leftEar != null && rightEar != null;
