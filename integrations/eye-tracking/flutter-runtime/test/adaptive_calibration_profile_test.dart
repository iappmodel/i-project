import 'dart:io';

import 'package:eye_tracking_app/calibration/adaptive_calibration_profile.dart';
import 'package:eye_tracking_app/calibration/calibration_profile_store.dart';
import 'package:eye_tracking_app/calibration/calibration_recalibration.dart';
import 'package:eye_tracking_app/gaze_coordinate_space.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AdaptiveCalibrationProfile', () {
    test('observeZoneSelection learns L/R bounds', () {
      var profile = AdaptiveCalibrationProfile();
      profile = profile.observeZoneSelection(
        zone: 'LEFT',
        gazeX: -0.35,
        timestampMs: 1000,
      );
      profile = profile.observeZoneSelection(
        zone: 'RIGHT',
        gazeX: 0.35,
        timestampMs: 2000,
      );
      profile = profile.recomputeConfidence();

      expect(profile.sessionGaze.leftBound, isNotNull);
      expect(profile.sessionGaze.rightBound, isNotNull);
      expect(profile.confidence.gazeLeftRight, greaterThan(0));
    });

    test('zoneMeasuredBounds prefers manual capture', () {
      final profile = AdaptiveCalibrationProfile(
        sessionGaze: const GazeThresholds(leftBound: -0.2, rightBound: 0.2),
      ).recomputeConfidence();

      final bounds = profile.zoneMeasuredBounds(
        manualLeft: -0.5,
        manualRight: 0.5,
      );
      expect(bounds.left, -0.5);
      expect(bounds.right, 0.5);
    });

    test('needsRecalibration on low pipeline quality', () {
      final profile = AdaptiveCalibrationProfile(sessionSampleCount: 40);
      expect(profile.needsRecalibration(pipelineQuality: 0.3), isTrue);
      expect(profile.needsRecalibration(pipelineQuality: 0.9), isFalse);
    });

    test('drift correction can move borderline gaze across zone bands', () {
      const left = 0.076;
      const right = 0.132;
      const pipelineX = 0.194;
      final without = resolveZoneFromGaze(
        pipelineSmoothedX: pipelineX,
        measuredLeft: left,
        measuredRight: right,
        sessionSamples: 200,
      );
      final withDrift = resolveZoneFromGaze(
        pipelineSmoothedX: pipelineX,
        measuredLeft: left,
        measuredRight: right,
        sessionSamples: 200,
        driftCorrectionX: 0.2,
      );
      expect(without, 'CENTER');
      expect(withDrift, 'RIGHT');
    });
  });

  group('CalibrationProfileStore', () {
    test('persists profile to disk', () async {
      final dir = await Directory.systemTemp.createTemp('cal-store-');
      final file = File('${dir.path}/calibration_profile.json');
      final store = CalibrationProfileStore(
        persistenceFile: file,
      );
      store.replace(
        AdaptiveCalibrationProfile(
          sessionGaze: const GazeThresholds(leftBound: -0.4, rightBound: 0.4),
          driftCorrectionX: 0.02,
        ).recomputeConfidence(),
      );
      await store.save();

      final reloaded = CalibrationProfileStore(persistenceFile: file);
      await reloaded.load();
      expect(reloaded.profile.sessionGaze.leftBound, closeTo(-0.4, 1e-9));
      expect(reloaded.profile.driftCorrectionX, closeTo(0.02, 1e-9));
    });
  });

  group('calibration_recalibration', () {
    test('shows prompt when recommended and not dismissed', () {
      expect(
        shouldShowRecalibrationPrompt(
          recommended: true,
          calibrationBusy: false,
          dismissedForSession: false,
        ),
        isTrue,
      );
      expect(
        shouldShowRecalibrationPrompt(
          recommended: true,
          calibrationBusy: true,
          dismissedForSession: false,
        ),
        isFalse,
      );
    });
  });
}
