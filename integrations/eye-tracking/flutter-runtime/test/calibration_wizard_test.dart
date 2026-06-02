import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/features/calibration/calibration_phase.dart';
import 'package:eye_tracking_app/features/onboarding/calibration_wizard.dart';

void main() {
  group('calibrationWizardStepFromSamples', () {
    const empty = GazeYawCalibrationSamples();

    test('requires consent first', () {
      expect(
        calibrationWizardStepFromSamples(
          consentAccepted: false,
          wizardMarkedComplete: false,
          gazeYaw: empty,
          leftOpenEar: null,
          rightOpenEar: null,
        ),
        CalibrationWizardStep.consent,
      );
    });

    test('walks L/R/yaw/ear then complete', () {
      expect(
        calibrationWizardStepFromSamples(
          consentAccepted: true,
          wizardMarkedComplete: false,
          gazeYaw: empty,
          leftOpenEar: null,
          rightOpenEar: null,
        ),
        CalibrationWizardStep.lookLeft,
      );
      expect(
        calibrationWizardStepFromSamples(
          consentAccepted: true,
          wizardMarkedComplete: false,
          gazeYaw: const GazeYawCalibrationSamples(gazeMeasuredLeft: -0.5),
          leftOpenEar: null,
          rightOpenEar: null,
        ),
        CalibrationWizardStep.lookRight,
      );
      expect(
        calibrationWizardStepFromSamples(
          consentAccepted: true,
          wizardMarkedComplete: false,
          gazeYaw: const GazeYawCalibrationSamples(
            gazeMeasuredLeft: -0.5,
            gazeMeasuredRight: 0.5,
          ),
          leftOpenEar: null,
          rightOpenEar: null,
        ),
        CalibrationWizardStep.neutralYaw,
      );
      expect(
        calibrationWizardStepFromSamples(
          consentAccepted: true,
          wizardMarkedComplete: false,
          gazeYaw: const GazeYawCalibrationSamples(
            gazeMeasuredLeft: -0.5,
            gazeMeasuredRight: 0.5,
            neutralHeadYaw: 0.0,
          ),
          leftOpenEar: null,
          rightOpenEar: null,
        ),
        CalibrationWizardStep.openEar,
      );
      expect(
        calibrationWizardStepFromSamples(
          consentAccepted: true,
          wizardMarkedComplete: false,
          gazeYaw: const GazeYawCalibrationSamples(
            gazeMeasuredLeft: -0.5,
            gazeMeasuredRight: 0.5,
            neutralHeadYaw: 0.0,
          ),
          leftOpenEar: 0.25,
          rightOpenEar: 0.26,
        ),
        CalibrationWizardStep.complete,
      );
    });
  });
}
