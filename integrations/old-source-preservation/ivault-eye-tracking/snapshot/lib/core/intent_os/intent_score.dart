/// Heuristic intent channel scores from gaze motion and fixation ramps.
class IntentScore {
  const IntentScore({
    required this.hover,
    required this.focus,
    required this.dwell,
    required this.select,
    required this.cancel,
  });

  /// Frame-to-frame stability (same basis as motion-derived stability score).
  final double hover;

  /// Fixation-duration focus ramp (e.g. ms / 600 capped).
  final double focus;

  /// Combined focus + stability for dwell readiness.
  final double dwell;

  /// Selection readiness minus blink penalty (clamped).
  final double select;

  /// Post-blink penalty magnitude (0 or ~0.4 within cooldown).
  final double cancel;
}
