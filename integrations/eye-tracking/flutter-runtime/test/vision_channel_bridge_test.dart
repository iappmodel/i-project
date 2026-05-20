import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/features/vision/vision_frame.dart';
import 'package:eye_tracking_app/features/vision/vision_channel_bridge.dart';

// ---------------------------------------------------------------------------
// Helper: minimal valid raw map that VisionFrame.fromMap can parse.
// ---------------------------------------------------------------------------
Map<String, dynamic> _validRaw({
  List<dynamic>? landmarks,
  double? faceConfidence,
}) {
  return <String, dynamic>{
    'leftEAR': 0.3,
    'rightEAR': 0.4,
    'gazeX': 0.1,
    'gazeY': 0.05,
    'headYawRaw': 0.02,
    'headYaw': 0.01,
    'headPitch': -0.1,
    'headStable': true,
    'landmarks': landmarks ?? [1, 2, 3],
    'leftEye': [0.1, 0.2],
    'rightEye': [0.3, 0.4],
    'attentionScore': 72,
    'likelyFake': false,
    'fakeStaticGaze': false,
    'fakePerfectStability': false,
    'fakeNoBlink': false,
    'faceConfidence': faceConfidence ?? 0.85,
    'nativeDecodeMs': 5.0,
    'nativeProcessMs': 12.0,
    'nativeTotalMs': 17.0,
  };
}

void main() {
  // -------------------------------------------------------------------------
  // VisionFrame.fromMap — pure-Dart unit tests (no binding / mock needed)
  // -------------------------------------------------------------------------
  group('VisionFrame.fromMap', () {
    test('parses all fields from a complete valid map', () {
      final frame = VisionFrame.fromMap(_validRaw());

      expect(frame.leftEar, closeTo(0.3, 1e-9));
      expect(frame.rightEar, closeTo(0.4, 1e-9));
      expect(frame.gazeX, closeTo(0.1, 1e-9));
      expect(frame.gazeY, 0.05);
      expect(frame.headYawRaw, closeTo(0.02, 1e-9));
      expect(frame.headYaw, closeTo(0.01, 1e-9));
      expect(frame.headPitch, closeTo(-0.1, 1e-9));
      expect(frame.headStable, isTrue);
      expect(frame.hasFace, isTrue);
      expect(frame.landmarks, hasLength(3));
      expect(frame.leftEye, hasLength(2));
      expect(frame.rightEye, hasLength(2));
      expect(frame.attentionScore, 72);
      expect(frame.likelyFake, isFalse);
      expect(frame.fakeStaticGaze, isFalse);
      expect(frame.fakePerfectStability, isFalse);
      expect(frame.fakeNoBlink, isFalse);
      expect(frame.faceConfidence, closeTo(0.85, 1e-9));
      expect(frame.nativeDecodeMs, closeTo(5.0, 1e-9));
      expect(frame.nativeProcessMs, closeTo(12.0, 1e-9));
      expect(frame.nativeTotalMs, closeTo(17.0, 1e-9));
    });

    test('hasFace is false when landmarks is empty list', () {
      final frame = VisionFrame.fromMap(_validRaw(landmarks: []));
      expect(frame.hasFace, isFalse);
      expect(frame.landmarks, isEmpty);
    });

    test('hasFace is false when landmarks key is absent / non-list', () {
      final raw = _validRaw();
      raw.remove('landmarks');
      final frame = VisionFrame.fromMap(raw);
      expect(frame.hasFace, isFalse);
      expect(frame.landmarks, isEmpty);
    });

    test('faceConfidence -1 (no mask) is clamped to 0.0', () {
      final frame = VisionFrame.fromMap(_validRaw(faceConfidence: -1.0));
      expect(frame.faceConfidence, 0.0);
    });

    test('faceConfidence 0.0 stays 0.0', () {
      final frame = VisionFrame.fromMap(_validRaw(faceConfidence: 0.0));
      expect(frame.faceConfidence, 0.0);
    });

    test('null optional fields are handled gracefully', () {
      final raw = <String, dynamic>{
        'landmarks': <dynamic>[],
        'faceConfidence': 0.0,
      };
      final frame = VisionFrame.fromMap(raw);

      expect(frame.leftEar, isNull);
      expect(frame.rightEar, isNull);
      expect(frame.gazeX, isNull);
      expect(frame.gazeY, isNull);
      expect(frame.headYawRaw, isNull);
      expect(frame.headYaw, isNull);
      expect(frame.headPitch, isNull);
      expect(frame.headStable, isNull);
      expect(frame.hasFace, isFalse);
      expect(frame.attentionScore, 0);
      expect(frame.likelyFake, isFalse);
      expect(frame.fakeStaticGaze, isFalse);
      expect(frame.fakePerfectStability, isFalse);
      expect(frame.fakeNoBlink, isFalse);
      expect(frame.faceConfidence, 0.0);
      expect(frame.nativeDecodeMs, isNull);
      expect(frame.nativeProcessMs, isNull);
      expect(frame.nativeTotalMs, isNull);
    });

    test('anti-spoof booleans parse true correctly', () {
      final raw = _validRaw();
      raw['likelyFake'] = true;
      raw['fakeStaticGaze'] = true;
      raw['fakePerfectStability'] = true;
      raw['fakeNoBlink'] = true;
      final frame = VisionFrame.fromMap(raw);
      expect(frame.likelyFake, isTrue);
      expect(frame.fakeStaticGaze, isTrue);
      expect(frame.fakePerfectStability, isTrue);
      expect(frame.fakeNoBlink, isTrue);
    });

    test('leftEye and rightEye fall back to empty list when missing', () {
      final raw = _validRaw();
      raw.remove('leftEye');
      raw.remove('rightEye');
      final frame = VisionFrame.fromMap(raw);
      expect(frame.leftEye, isEmpty);
      expect(frame.rightEye, isEmpty);
    });
  });

  // -------------------------------------------------------------------------
  // VisionChannelBridge — channel name constant
  // -------------------------------------------------------------------------
  group('VisionChannelBridge constants', () {
    test('channelName matches the native channel', () {
      expect(VisionChannelBridge.channelName, 'vision_channel');
    });
  });

  // -------------------------------------------------------------------------
  // VisionChannelBridge.processFrame — mock-channel tests
  // -------------------------------------------------------------------------
  group('VisionChannelBridge.processFrame', () {
    // Initialise the test binding so we can register mock handlers.
    setUpAll(TestWidgetsFlutterBinding.ensureInitialized);

    const channel = MethodChannel(VisionChannelBridge.channelName);

    tearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    test('returns VisionFrame when channel returns a valid map', () async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (MethodCall call) async {
        if (call.method == 'processFrame') return _validRaw();
        return null;
      });

      final bridge = VisionChannelBridge();
      final frame = await bridge.processFrame(Uint8List(0));

      expect(frame, isNotNull);
      expect(frame!.hasFace, isTrue);
      expect(frame.attentionScore, 72);
    });

    test('returns null when channel returns a non-Map result', () async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (MethodCall call) async {
        if (call.method == 'processFrame') return 'not_a_map';
        return null;
      });

      final bridge = VisionChannelBridge();
      final frame = await bridge.processFrame(Uint8List(0));
      expect(frame, isNull);
    });

    test('returns null when channel returns null', () async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (MethodCall call) async => null);

      final bridge = VisionChannelBridge();
      final frame = await bridge.processFrame(Uint8List(0));
      expect(frame, isNull);
    });

    test('propagates PlatformException (caller sets _visionChannelError)', () {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (MethodCall call) async {
        throw PlatformException(code: 'VISION_ERROR', message: 'mock error');
      });

      final bridge = VisionChannelBridge();
      expect(
        () => bridge.processFrame(Uint8List(0)),
        throwsA(isA<PlatformException>()),
      );
    });
  });

  // -------------------------------------------------------------------------
  // VisionChannelBridge.calibrateHeadPose — non-Android guard
  //
  // On the test host (non-Android) calibrateHeadPose must return without
  // touching the channel at all.
  // -------------------------------------------------------------------------
  group('VisionChannelBridge.calibrateHeadPose', () {
    setUpAll(TestWidgetsFlutterBinding.ensureInitialized);

    const channel = MethodChannel(VisionChannelBridge.channelName);

    tearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    test('completes without throwing when channel returns normally', () async {
      // The test environment defaults to TargetPlatform.android, so the channel
      // IS invoked. Install a mock handler so the call succeeds.
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (MethodCall call) async => null);

      final bridge = VisionChannelBridge();
      await expectLater(bridge.calibrateHeadPose(), completes);
    });

    test('swallows PlatformException (does not propagate to caller)', () async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (MethodCall call) async {
        throw PlatformException(code: 'CAL_ERROR', message: 'mock cal error');
      });

      final bridge = VisionChannelBridge();
      // calibrateHeadPose catches PlatformException internally — must not throw.
      await expectLater(bridge.calibrateHeadPose(), completes);
    });
  });
}
