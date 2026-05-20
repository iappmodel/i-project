import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/features/calibration/calibration_phase.dart';

void main() {
  group('calibrationPhaseLabel', () {
    test('matches legacy main.dart strings for every phase', () {
      expect(calibrationPhaseLabel(CalibrationPhase.idle), 'idle');
      expect(
        calibrationPhaseLabel(CalibrationPhase.samplingLeft),
        'sampling-left',
      );
      expect(
        calibrationPhaseLabel(CalibrationPhase.samplingRight),
        'sampling-right',
      );
      expect(
        calibrationPhaseLabel(CalibrationPhase.samplingNeutralYaw),
        'sampling-neutral',
      );
      expect(
        calibrationPhaseLabel(CalibrationPhase.samplingOpenEar),
        'sampling-ear',
      );
      expect(calibrationPhaseLabel(CalibrationPhase.ready), 'ready');
    });
  });

  group('isCalibrationReady', () {
    test('false when any field is null', () {
      expect(
        isCalibrationReady(
          gazeMeasuredLeft: null,
          gazeMeasuredRight: 0,
          neutralHeadYaw: 0,
          leftOpenEar: 0,
          rightOpenEar: 0,
        ),
        false,
      );
      expect(
        isCalibrationReady(
          gazeMeasuredLeft: 0,
          gazeMeasuredRight: null,
          neutralHeadYaw: 0,
          leftOpenEar: 0,
          rightOpenEar: 0,
        ),
        false,
      );
      expect(
        isCalibrationReady(
          gazeMeasuredLeft: 0,
          gazeMeasuredRight: 0,
          neutralHeadYaw: null,
          leftOpenEar: 0,
          rightOpenEar: 0,
        ),
        false,
      );
      expect(
        isCalibrationReady(
          gazeMeasuredLeft: 0,
          gazeMeasuredRight: 0,
          neutralHeadYaw: 0,
          leftOpenEar: null,
          rightOpenEar: 0,
        ),
        false,
      );
      expect(
        isCalibrationReady(
          gazeMeasuredLeft: 0,
          gazeMeasuredRight: 0,
          neutralHeadYaw: 0,
          leftOpenEar: 0,
          rightOpenEar: null,
        ),
        false,
      );
    });

    test('true when all fields are non-null', () {
      expect(
        isCalibrationReady(
          gazeMeasuredLeft: 0,
          gazeMeasuredRight: 0,
          neutralHeadYaw: 0,
          leftOpenEar: 0,
          rightOpenEar: 0,
        ),
        true,
      );
    });
  });

  group('isCalibrationReadyFromSamples', () {
    const completeGazeYaw = GazeYawCalibrationSamples(
      gazeMeasuredLeft: 0,
      gazeMeasuredRight: 0,
      neutralHeadYaw: 0,
    );

    test('false when gaze/yaw incomplete even if open-ear set', () {
      expect(
        isCalibrationReadyFromSamples(
          gazeYaw: const GazeYawCalibrationSamples(
            gazeMeasuredLeft: null,
            gazeMeasuredRight: 0,
            neutralHeadYaw: 0,
          ),
          leftOpenEar: 0,
          rightOpenEar: 0,
        ),
        false,
      );
    });

    test('false when gaze/yaw complete but either open-ear null', () {
      expect(
        isCalibrationReadyFromSamples(
          gazeYaw: completeGazeYaw,
          leftOpenEar: null,
          rightOpenEar: 0,
        ),
        false,
      );
      expect(
        isCalibrationReadyFromSamples(
          gazeYaw: completeGazeYaw,
          leftOpenEar: 0,
          rightOpenEar: null,
        ),
        false,
      );
    });

    test('true when gaze/yaw complete and both open-ear non-null', () {
      expect(
        isCalibrationReadyFromSamples(
          gazeYaw: completeGazeYaw,
          leftOpenEar: 0,
          rightOpenEar: 0,
        ),
        true,
      );
    });

    test('matches isCalibrationReady for same arguments', () {
      const gl = 0.1;
      const gr = 0.2;
      const ny = 0.3;
      const lo = 0.4;
      const ro = 0.5;
      expect(
        isCalibrationReadyFromSamples(
          gazeYaw: const GazeYawCalibrationSamples(
            gazeMeasuredLeft: gl,
            gazeMeasuredRight: gr,
            neutralHeadYaw: ny,
          ),
          leftOpenEar: lo,
          rightOpenEar: ro,
        ),
        isCalibrationReady(
          gazeMeasuredLeft: gl,
          gazeMeasuredRight: gr,
          neutralHeadYaw: ny,
          leftOpenEar: lo,
          rightOpenEar: ro,
        ),
      );
    });
  });

  group('isGazeYawCalibrationComplete', () {
    test('false when any gaze/yaw field is null', () {
      expect(
        isGazeYawCalibrationComplete(
          const GazeYawCalibrationSamples(
            gazeMeasuredLeft: null,
            gazeMeasuredRight: 0,
            neutralHeadYaw: 0,
          ),
        ),
        false,
      );
      expect(
        isGazeYawCalibrationComplete(
          const GazeYawCalibrationSamples(
            gazeMeasuredLeft: 0,
            gazeMeasuredRight: null,
            neutralHeadYaw: 0,
          ),
        ),
        false,
      );
      expect(
        isGazeYawCalibrationComplete(
          const GazeYawCalibrationSamples(
            gazeMeasuredLeft: 0,
            gazeMeasuredRight: 0,
            neutralHeadYaw: null,
          ),
        ),
        false,
      );
    });

    test('true when all three are non-null', () {
      expect(
        isGazeYawCalibrationComplete(
          const GazeYawCalibrationSamples(
            gazeMeasuredLeft: 0,
            gazeMeasuredRight: 0,
            neutralHeadYaw: 0,
          ),
        ),
        true,
      );
    });
  });

  group('isCalibrationBusy', () {
    test('false for idle and ready', () {
      expect(isCalibrationBusy(CalibrationPhase.idle), false);
      expect(isCalibrationBusy(CalibrationPhase.ready), false);
    });

    test('true for every sampling phase', () {
      expect(isCalibrationBusy(CalibrationPhase.samplingLeft), true);
      expect(isCalibrationBusy(CalibrationPhase.samplingRight), true);
      expect(isCalibrationBusy(CalibrationPhase.samplingNeutralYaw), true);
      expect(isCalibrationBusy(CalibrationPhase.samplingOpenEar), true);
    });
  });

  group('shouldApplyLeftGazeSample', () {
    test('truth table matches _normalize gate', () {
      expect(shouldApplyLeftGazeSample(pendingLeft: false, gazeX: 0), false);
      expect(shouldApplyLeftGazeSample(pendingLeft: true, gazeX: null), false);
      expect(shouldApplyLeftGazeSample(pendingLeft: true, gazeX: 0), true);
    });
  });

  group('shouldApplyRightGazeSample', () {
    test('truth table matches _normalize gate', () {
      expect(shouldApplyRightGazeSample(pendingRight: false, gazeX: 0), false);
      expect(
        shouldApplyRightGazeSample(pendingRight: true, gazeX: null),
        false,
      );
      expect(shouldApplyRightGazeSample(pendingRight: true, gazeX: 0), true);
    });
  });

  group('shouldApplyNeutralHeadYawSample', () {
    test('truth table matches _normalize gate', () {
      expect(
        shouldApplyNeutralHeadYawSample(pendingNeutral: true, headYawRaw: null),
        false,
      );
      expect(
        shouldApplyNeutralHeadYawSample(
          pendingNeutral: true,
          headYawRaw: double.nan,
        ),
        false,
      );
      expect(
        shouldApplyNeutralHeadYawSample(
          pendingNeutral: true,
          headYawRaw: double.infinity,
        ),
        false,
      );
      expect(
        shouldApplyNeutralHeadYawSample(pendingNeutral: true, headYawRaw: 0.1),
        true,
      );
      expect(
        shouldApplyNeutralHeadYawSample(pendingNeutral: false, headYawRaw: 0.1),
        false,
      );
    });
  });

  group('rawMeanOpenEarBaseline', () {
    test('null when either operand is null', () {
      expect(rawMeanOpenEarBaseline(null, 0.2), isNull);
      expect(rawMeanOpenEarBaseline(0.1, null), isNull);
      expect(rawMeanOpenEarBaseline(null, null), isNull);
    });

    test('returns mean when both non-null', () {
      expect(rawMeanOpenEarBaseline(0.1, 0.3), 0.2);
      expect(rawMeanOpenEarBaseline(0.0, 0.0), 0.0);
    });
  });

  group('shouldApplyOpenEarCalibratorFrame', () {
    test('true only when calibrating, hasFace, and both EARs non-null', () {
      expect(
        shouldApplyOpenEarCalibratorFrame(
          openEarCalibrating: true,
          hasFace: true,
          leftEar: 0.1,
          rightEar: 0.2,
        ),
        true,
      );
    });

    test('false when not calibrating', () {
      expect(
        shouldApplyOpenEarCalibratorFrame(
          openEarCalibrating: false,
          hasFace: true,
          leftEar: 0.1,
          rightEar: 0.2,
        ),
        false,
      );
    });

    test('false when no face', () {
      expect(
        shouldApplyOpenEarCalibratorFrame(
          openEarCalibrating: true,
          hasFace: false,
          leftEar: 0.1,
          rightEar: 0.2,
        ),
        false,
      );
    });

    test('false when either EAR is null', () {
      expect(
        shouldApplyOpenEarCalibratorFrame(
          openEarCalibrating: true,
          hasFace: true,
          leftEar: null,
          rightEar: 0.2,
        ),
        false,
      );
      expect(
        shouldApplyOpenEarCalibratorFrame(
          openEarCalibrating: true,
          hasFace: true,
          leftEar: 0.1,
          rightEar: null,
        ),
        false,
      );
    });
  });

  group('calibrationBeginCapturePlan', () {
    test('leftGaze sets phase and only left pending', () {
      final p = calibrationBeginCapturePlan(
        CalibrationBeginCaptureKind.leftGaze,
      );
      expect(p.phase, CalibrationPhase.samplingLeft);
      expect(p.pendingCaptureLeft, true);
      expect(p.pendingCaptureRight, isNull);
      expect(p.pendingCaptureNeutralYaw, isNull);
    });

    test('rightGaze sets phase and only right pending', () {
      final p = calibrationBeginCapturePlan(
        CalibrationBeginCaptureKind.rightGaze,
      );
      expect(p.phase, CalibrationPhase.samplingRight);
      expect(p.pendingCaptureLeft, isNull);
      expect(p.pendingCaptureRight, true);
      expect(p.pendingCaptureNeutralYaw, isNull);
    });

    test('neutralHeadYaw sets phase and only neutral pending', () {
      final p = calibrationBeginCapturePlan(
        CalibrationBeginCaptureKind.neutralHeadYaw,
      );
      expect(p.phase, CalibrationPhase.samplingNeutralYaw);
      expect(p.pendingCaptureLeft, isNull);
      expect(p.pendingCaptureRight, isNull);
      expect(p.pendingCaptureNeutralYaw, true);
    });
  });
}
