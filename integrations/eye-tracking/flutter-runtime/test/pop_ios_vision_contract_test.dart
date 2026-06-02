import 'package:flutter_test/flutter_test.dart';

/// Android `VisionProcessor.kt` / iOS `VisionProcessor.swift` channel contract.
const kVisionProcessorPayloadKeys = <String>[
  'landmarks',
  'leftEye',
  'rightEye',
  'leftEAR',
  'rightEAR',
  'gazeX',
  'gazeY',
  'headYawRaw',
  'headYaw',
  'headPitch',
  'headStable',
  'isBlinking',
  'blinkCount',
  'attentionScore',
  'gazeDominantEye',
  'likelyFake',
  'fakeStaticGaze',
  'fakePerfectStability',
  'fakeNoBlink',
  'selfieQuality',
  'faceConfidence',
  'nativeProcessMs',
];

const kVisionChannelTimingKeys = <String>[
  'nativeDecodeMs',
  'nativeTotalMs',
];

void main() {
  test('iOS VisionProcessor payload keys match Android contract', () {
    expect(kVisionProcessorPayloadKeys, contains('gazeX'));
    expect(kVisionProcessorPayloadKeys, contains('attentionScore'));
    expect(kVisionProcessorPayloadKeys, contains('isBlinking'));
    expect(kVisionChannelTimingKeys, contains('nativeDecodeMs'));
  });
}
