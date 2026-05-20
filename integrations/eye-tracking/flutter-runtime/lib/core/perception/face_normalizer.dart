class FaceNormalizer {
  List<double> normalize({
    required double leftEyeX,
    required double rightEyeX,
    required double noseX,
    required double faceWidth,
    required double faceHeight,
  }) {
    // center anchor (nose-based normalization)
    final centerX = noseX / faceWidth;
    final eyeDistance = (rightEyeX - leftEyeX) / faceWidth;

    return [
      centerX,
      eyeDistance,
      faceWidth,
      faceHeight,
    ];
  }
}
