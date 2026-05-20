/// Native **raw** [gazeX] from vision (pre-[normalizeGazeX]): symmetric deadband ±0.10.
///
/// **Calibration tuning:** adjust deadband after SM-S928U gazeX sweep; consider
/// [getGazeZone] when user L/R samples exist — see CALIBRATION_TUNING_PLAN.md.
String getZone(double x) {
  if (x < -0.10) return 'LEFT';
  if (x > 0.10) return 'RIGHT';
  return 'CENTER';
}

/// [normalized] is [normalizeGazeX] output: \((gazeX - min) / (max - min)\).
///
/// Prefer [getZone] on raw [gazeX] for UI dwell when calibration is optional.
String getGazeZone(double normalized) {
  if (normalized > 0.66) return 'RIGHT';
  if (normalized < 0.33) return 'LEFT';
  return 'CENTER';
}
