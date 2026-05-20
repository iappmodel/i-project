/// Parsed Android [VisionProcessor.process] map for one frame.
///
/// Extracted from `lib/main.dart`; field names, types, and [fromMap] key
/// strings are identical to the original private `_VisionFrame` class.
final class VisionFrame {
  const VisionFrame({
    required this.leftEar,
    required this.rightEar,
    required this.gazeX,
    required this.gazeY,
    required this.headYawRaw,
    required this.headYaw,
    required this.headPitch,
    required this.headStable,
    required this.landmarks,
    required this.leftEye,
    required this.rightEye,
    required this.hasFace,
    required this.attentionScore,
    required this.likelyFake,
    required this.fakeStaticGaze,
    required this.fakePerfectStability,
    required this.fakeNoBlink,
    required this.faceConfidence,
    this.nativeDecodeMs,
    this.nativeProcessMs,
    this.nativeTotalMs,
  });

  final double? leftEar;
  final double? rightEar;
  final double? gazeX;
  final num? gazeY;
  final double? headYawRaw;
  final double? headYaw;
  final double? headPitch;
  final bool? headStable;
  final List<dynamic> landmarks;
  final List<dynamic> leftEye;
  final List<dynamic> rightEye;
  final bool hasFace;

  /// Android [VisionProcessor] 0–100; may be combined with Flutter-side fatigue in [attentionWithFatigueBonus].
  final int attentionScore;

  /// Android anti-spoof heuristics (frozen / unnaturally still / no blinks).
  final bool likelyFake;
  final bool fakeStaticGaze;
  final bool fakePerfectStability;
  final bool fakeNoBlink;

  /// Android segmentation: fraction of category-mask pixels for person (`1`); `0.0` if missing or invalid.
  /// Raw `-1` (no mask) is clamped to `0.0` when parsing.
  final double faceConfidence;
  final double? nativeDecodeMs;
  final double? nativeProcessMs;
  final double? nativeTotalMs;

  factory VisionFrame.fromMap(Map<dynamic, dynamic> raw) {
    final leftEar = (raw['leftEAR'] as num?)?.toDouble();
    final rightEar = (raw['rightEAR'] as num?)?.toDouble();
    final gazeX = (raw['gazeX'] as num?)?.toDouble();
    final gazeY = raw['gazeY'];
    final headYawRaw = (raw['headYawRaw'] as num?)?.toDouble();
    final headYaw = (raw['headYaw'] as num?)?.toDouble();
    final headPitch = (raw['headPitch'] as num?)?.toDouble();
    final headStable = raw['headStable'] as bool?;
    final landmarks = raw['landmarks'];
    final allLandmarks = landmarks is List ? landmarks : <dynamic>[];
    final leftEyeRaw = raw['leftEye'];
    final rightEyeRaw = raw['rightEye'];
    final leftEye = leftEyeRaw is List ? leftEyeRaw : <dynamic>[];
    final rightEye = rightEyeRaw is List ? rightEyeRaw : <dynamic>[];
    final hasFace = landmarks is List && landmarks.isNotEmpty;
    final attentionScore = (raw['attentionScore'] as num?)?.toInt() ?? 0;
    final likelyFake = raw['likelyFake'] == true;
    final fakeStaticGaze = raw['fakeStaticGaze'] == true;
    final fakePerfectStability = raw['fakePerfectStability'] == true;
    final fakeNoBlink = raw['fakeNoBlink'] == true;
    final rawFaceConfidence =
        (raw['faceConfidence'] as num?)?.toDouble() ?? 0.0;
    final safeConfidence =
        rawFaceConfidence < 0 ? 0.0 : rawFaceConfidence;
    final nativeDecodeMs = (raw['nativeDecodeMs'] as num?)?.toDouble();
    final nativeProcessMs = (raw['nativeProcessMs'] as num?)?.toDouble();
    final nativeTotalMs = (raw['nativeTotalMs'] as num?)?.toDouble();
    return VisionFrame(
      leftEar: leftEar,
      rightEar: rightEar,
      gazeX: gazeX,
      gazeY: gazeY,
      headYawRaw: headYawRaw,
      headYaw: headYaw,
      headPitch: headPitch,
      headStable: headStable,
      landmarks: allLandmarks,
      leftEye: leftEye,
      rightEye: rightEye,
      hasFace: hasFace,
      attentionScore: attentionScore,
      likelyFake: likelyFake,
      fakeStaticGaze: fakeStaticGaze,
      fakePerfectStability: fakePerfectStability,
      fakeNoBlink: fakeNoBlink,
      faceConfidence: safeConfidence,
      nativeDecodeMs: nativeDecodeMs,
      nativeProcessMs: nativeProcessMs,
      nativeTotalMs: nativeTotalMs,
    );
  }
}
