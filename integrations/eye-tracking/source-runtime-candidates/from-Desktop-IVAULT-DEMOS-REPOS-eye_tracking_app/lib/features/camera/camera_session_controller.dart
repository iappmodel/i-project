import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';

/// True when the camera plugin supports live image streaming (Android / iOS).
bool canStreamCameraImages(TargetPlatform platform) =>
    platform == TargetPlatform.android || platform == TargetPlatform.iOS;

/// Owns camera permission, front-camera selection, [CameraController]
/// initialization, flash setup, and image-stream start.
///
/// No [CameraController.dispose]: the prior runtime did not dispose the
/// controller; behavior is preserved.
final class CameraSessionController {
  CameraController? _controller;

  /// Preset used for [CameraController]; must stay [ResolutionPreset.medium].
  static const ResolutionPreset sessionResolutionPreset =
      ResolutionPreset.medium;

  /// Format used for [CameraController]; must stay [ImageFormatGroup.yuv420].
  static const ImageFormatGroup sessionImageFormatGroup =
      ImageFormatGroup.yuv420;

  /// The initialized [CameraController]. Only valid after [open] completes.
  CameraController get controller {
    assert(
      _controller != null,
      'open() must complete before accessing controller.',
    );
    return _controller!;
  }

  /// Requests permission, finds the front camera, constructs and initializes
  /// [CameraController], and sets flash mode (torch / always fallback).
  ///
  /// Same logic as former `_FrontCameraScreenState._openFrontCamera`.
  Future<CameraController> open() async {
    final permission = await Permission.camera.request();
    if (!permission.isGranted) {
      throw StateError('Camera permission denied.');
    }

    final cameras = await availableCameras();
    final fronts = cameras
        .where((c) => c.lensDirection == CameraLensDirection.front)
        .toList();
    if (fronts.isEmpty) {
      throw StateError('No front camera available.');
    }
    final front = fronts.first;

    final cam = CameraController(
      front,
      sessionResolutionPreset,
      enableAudio: false,
      imageFormatGroup: sessionImageFormatGroup,
    );
    await cam.initialize();
    try {
      await cam.setFlashMode(FlashMode.torch);
    } on CameraException catch (e) {
      debugPrint('setFlashMode(torch): $e');
      try {
        await cam.setFlashMode(FlashMode.always);
      } on CameraException catch (e2) {
        debugPrint('setFlashMode(always): $e2');
      }
    }
    _controller = cam;
    return cam;
  }

  /// Starts the image stream when supported and the controller is ready.
  ///
  /// Same logic as former `_FullScreenPreviewState._startImageStream` (without
  /// [State.mounted]; caller invokes only after the session future completes).
  Future<void> startStream(void Function(CameraImage) onFrame) async {
    if (!canStreamCameraImages(defaultTargetPlatform)) return;
    final c = _controller;
    if (c == null) return;
    if (!c.value.isInitialized || c.value.isStreamingImages) return;
    try {
      await c.startImageStream(onFrame);
    } on CameraException catch (e) {
      debugPrint('startImageStream failed: $e');
    }
  }
}
