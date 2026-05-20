class ConfidenceModel {
  double compute({
    required bool faceDetected,
    required double landmarkStability,
    required double headMovement,
  }) {
    if (!faceDetected) return 0.0;

    double score = 1.0;

    score -= headMovement * 0.4;
    score -= (1.0 - landmarkStability) * 0.5;

    return score.clamp(0.0, 1.0);
  }
}
