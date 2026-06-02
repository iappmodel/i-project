import 'package:eye_tracking_app/features/calibration/calibration_phase.dart';

/// Guided first-run calibration steps (POP Stage 8).
enum CalibrationWizardStep {
  consent,
  lookLeft,
  lookRight,
  neutralYaw,
  openEar,
  complete,
}

/// Derives wizard step from consent flag and captured samples.
CalibrationWizardStep calibrationWizardStepFromSamples({
  required bool consentAccepted,
  required bool wizardMarkedComplete,
  required GazeYawCalibrationSamples gazeYaw,
  required double? leftOpenEar,
  required double? rightOpenEar,
}) {
  if (wizardMarkedComplete) return CalibrationWizardStep.complete;
  if (!consentAccepted) return CalibrationWizardStep.consent;
  if (gazeYaw.gazeMeasuredLeft == null) return CalibrationWizardStep.lookLeft;
  if (gazeYaw.gazeMeasuredRight == null) return CalibrationWizardStep.lookRight;
  if (gazeYaw.neutralHeadYaw == null) return CalibrationWizardStep.neutralYaw;
  if (leftOpenEar == null || rightOpenEar == null) {
    return CalibrationWizardStep.openEar;
  }
  return CalibrationWizardStep.complete;
}

bool calibrationWizardBlocksInteraction(CalibrationWizardStep step) =>
    step != CalibrationWizardStep.complete;

String calibrationWizardTitle(CalibrationWizardStep step) {
  switch (step) {
    case CalibrationWizardStep.consent:
      return 'Proof of Presence';
    case CalibrationWizardStep.lookLeft:
      return 'Step 1 of 5 — Look left';
    case CalibrationWizardStep.lookRight:
      return 'Step 2 of 5 — Look right';
    case CalibrationWizardStep.neutralYaw:
      return 'Step 3 of 5 — Face forward';
    case CalibrationWizardStep.openEar:
      return 'Step 4 of 5 — Open eyes';
    case CalibrationWizardStep.complete:
      return 'Ready';
  }
}

String calibrationWizardBody(CalibrationWizardStep step) {
  switch (step) {
    case CalibrationWizardStep.consent:
      return 'Camera gaze is used to verify attention for rewards. '
          'We send derived scores only — never raw video or face meshes.';
    case CalibrationWizardStep.lookLeft:
      return 'Hold your gaze on the LEFT zone until the sample locks.';
    case CalibrationWizardStep.lookRight:
      return 'Hold your gaze on the RIGHT zone until the sample locks.';
    case CalibrationWizardStep.neutralYaw:
      return 'Look straight at the camera so we can capture neutral head pose.';
    case CalibrationWizardStep.openEar:
      return 'Keep eyes open with a natural blink rate for EAR baselines.';
    case CalibrationWizardStep.complete:
      return 'Calibration complete. Dwell, then blink to select zones.';
  }
}

/// Which manual capture the wizard should start for this step (null = none / done).
CalibrationBeginCaptureKind? calibrationWizardCaptureKind(
  CalibrationWizardStep step,
) {
  switch (step) {
    case CalibrationWizardStep.lookLeft:
      return CalibrationBeginCaptureKind.leftGaze;
    case CalibrationWizardStep.lookRight:
      return CalibrationBeginCaptureKind.rightGaze;
    case CalibrationWizardStep.neutralYaw:
      return CalibrationBeginCaptureKind.neutralHeadYaw;
    default:
      return null;
  }
}

bool calibrationWizardNeedsOpenEar(CalibrationWizardStep step) =>
    step == CalibrationWizardStep.openEar;
