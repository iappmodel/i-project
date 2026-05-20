/// Inter-eye–normalized head pose limit (matches native `headYaw` / `headPitch` scale).
const double kHeadPoseLimit = 0.8;

/// Soft confidence in \([0, 1]\) from head yaw/pitch: 1 at center, 0 when either axis
/// reaches [kHeadPoseLimit]. Uses independent linear margins multiplied (stricter than min).
double headConfidence(double yaw, double pitch) {
  if (!yaw.isFinite || !pitch.isFinite) return 0.0;
  final yawScore = 1.0 - (yaw.abs() / kHeadPoseLimit);
  final pitchScore = 1.0 - (pitch.abs() / kHeadPoseLimit);
  return (yawScore * pitchScore).clamp(0.0, 1.0);
}

/// Single-frame tracking confidence in \([0, 1]\): mean EAR (clamped) × [headConf].
///
/// Raw face EAR is often well below 1.0; if you need “eye openness” in \([0,1]\),
/// normalize by an open-eye baseline (e.g. from calibration) before calling, or scale
/// [leftEar] / [rightEar] upstream.
double computeConfidence({
  required bool hasLandmarks,
  required double leftEar,
  required double rightEar,
  required double headConf,
}) {
  if (!hasLandmarks) return 0.0;

  final earScore = ((leftEar + rightEar) / 2.0).clamp(0.0, 1.0);

  return (earScore * headConf).clamp(0.0, 1.0);
}

/// EMA blend factor for gaze smoothing: **0.1** (low confidence, heavy smoothing) … **0.4** (high confidence).
double smoothingAlphaFromConfidence(double confidence) {
  final c = confidence.clamp(0.0, 1.0);
  return 0.1 + c * 0.3;
}
