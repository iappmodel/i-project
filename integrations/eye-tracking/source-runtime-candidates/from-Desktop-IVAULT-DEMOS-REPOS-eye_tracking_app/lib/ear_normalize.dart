/// `leftNorm = currentLeftEAR / leftOpenEAR`, same for right. Returns `null` if baselines invalid.
(double, double)? normalizedEarPair(
  double leftEar,
  double rightEar,
  double? leftOpenEar,
  double? rightOpenEar,
) {
  if (leftOpenEar == null || rightOpenEar == null) return null;
  if (leftOpenEar <= 1e-9 || rightOpenEar <= 1e-9) return null;
  return (leftEar / leftOpenEar, rightEar / rightOpenEar);
}
