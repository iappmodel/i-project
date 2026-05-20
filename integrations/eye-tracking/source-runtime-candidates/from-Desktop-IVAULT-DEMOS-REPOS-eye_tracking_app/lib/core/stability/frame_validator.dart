class FrameValidator {
  bool isValid({
    required bool faceDetected,
    required int width,
    required int height,
  }) {
    if (!faceDetected) return false;
    if (width <= 0 || height <= 0) return false;

    return true;
  }
}
