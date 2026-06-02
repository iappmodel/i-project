import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'vision_frame.dart';

/// Thin wrapper around the `vision_channel` [MethodChannel].
///
/// Extracted from `lib/main.dart`. Error-handling contracts are preserved
/// exactly:
/// - [processFrame] propagates [PlatformException] so `main.dart` can set
///   `_visionChannelError`. Returns `null` for non-[Map] responses.
/// - [calibrateHeadPose] catches [PlatformException] internally (matching
///   the original `_requestHeadNeutralCalibration` behaviour).
final class VisionChannelBridge {
  static const String channelName = 'vision_channel';
  static const String _calibrateMethod = 'calibrateHeadPose';

  final MethodChannel _channel = const MethodChannel(channelName);

  /// Sends JPEG [bytes] to the native vision pipeline and returns a parsed
  /// [VisionFrame], or `null` when the native side returns a non-[Map] result.
  ///
  /// Throws [PlatformException] on channel errors — callers are responsible
  /// for setting error state.
  Future<VisionFrame?> processFrame(Uint8List bytes) async {
    return _invokeProcessFrame(bytes);
  }

  /// Experimental map payload (`y8` or `jpeg` format). Legacy [processFrame]
  /// with [Uint8List] remains the default production path.
  Future<VisionFrame?> processFramePayload(Map<String, Object> payload) async {
    return _invokeProcessFrame(payload);
  }

  Future<VisionFrame?> _invokeProcessFrame(Object arguments) async {
    final result =
        await _channel.invokeMethod<dynamic>('processFrame', arguments);
    if (result is! Map) return null;
    return VisionFrame.fromMap(result);
  }

  /// Tells the native side to capture the current head pose as the neutral
  /// baseline. No-op on platforms without native vision (web/desktop).
  ///
  /// [PlatformException] is caught and logged, mirroring the original
  /// `_requestHeadNeutralCalibration` behaviour.
  Future<void> calibrateHeadPose() async {
    if (defaultTargetPlatform != TargetPlatform.android &&
        defaultTargetPlatform != TargetPlatform.iOS) {
      return;
    }
    try {
      await _channel.invokeMethod<void>(_calibrateMethod);
      debugPrint('Head yaw neutral: next frame will capture baseline.');
    } on PlatformException catch (e) {
      debugPrint('calibrateHeadPose: ${e.message}');
    }
  }
}
