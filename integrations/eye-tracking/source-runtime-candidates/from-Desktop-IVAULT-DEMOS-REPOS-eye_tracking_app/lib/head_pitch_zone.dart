/// Nose pitch vs eye midline (scaled by inter-eye distance), from native `headPitch`.
///
/// Returns `null` when tilt is within the dead band between thresholds.
String? getHeadPitchBand(double pitch) {
  if (pitch > 0.2) return 'DOWN';
  if (pitch < -0.2) return 'UP';
  return null;
}
