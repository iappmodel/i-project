import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/features/camera/camera_session_controller.dart';

void main() {
  group('canStreamCameraImages', () {
    test('android is true', () {
      expect(canStreamCameraImages(TargetPlatform.android), isTrue);
    });

    test('iOS is true', () {
      expect(canStreamCameraImages(TargetPlatform.iOS), isTrue);
    });

    test('macOS is false', () {
      expect(canStreamCameraImages(TargetPlatform.macOS), isFalse);
    });

    test('windows is false', () {
      expect(canStreamCameraImages(TargetPlatform.windows), isFalse);
    });
  });

  group('CameraSessionController — session contract', () {
    test('sessionResolutionPreset is medium', () {
      expect(
        CameraSessionController.sessionResolutionPreset,
        ResolutionPreset.medium,
      );
    });

    test('sessionImageFormatGroup is yuv420', () {
      expect(
        CameraSessionController.sessionImageFormatGroup,
        ImageFormatGroup.yuv420,
      );
    });
  });

  group('CameraSessionController — open / controller', () {
    test('controller getter asserts before open()', () {
      final session = CameraSessionController();
      expect(() => session.controller, throwsA(isA<AssertionError>()));
    });

    // open() requires Permission.camera + availableCameras(); verify on device
    // or integration tests only.
  });
}
