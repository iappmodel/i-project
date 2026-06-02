/// Deterministic POP control-path replay types (Stage 1 harness).
library;

/// One recorded frame in a replay fixture.
final class PopReplayFrame {
  const PopReplayFrame({
    required this.tMs,
    required this.gazeX,
    required this.gazeY,
    this.blink = false,
    this.faceDetected = true,
    /// When true, updates gaze-freshness clock (live landmark frame).
    this.liveLandmarks = true,
    this.filterAlpha = 0.25,
  });

  final int tMs;
  final double gazeX;
  final double gazeY;
  final bool blink;
  final bool faceDetected;
  final bool liveLandmarks;
  final double filterAlpha;
}

/// Configuration for [PopReplayDriver].
final class PopReplayConfig {
  const PopReplayConfig({
    this.measuredLeft,
    this.measuredRight,
    this.sessionSamples = 200,
    this.zoneDwellMs = 1200,
    this.dwellReleaseMs = 200,
    this.avgDwellMs = 1200,
  });

  final double? measuredLeft;
  final double? measuredRight;
  /// Passed to [resolveZoneFromGaze] for [effectiveGazeCalibrationBounds] weighting.
  final int sessionSamples;
  final double zoneDwellMs;
  final int dwellReleaseMs;
  final double avgDwellMs;
}

/// Named milestone emitted during replay (golden digest lines).
final class PopReplayMilestone {
  const PopReplayMilestone(this.line);

  final String line;

  @override
  String toString() => line;
}

/// Outcome of a full replay run.
final class PopReplayResult {
  const PopReplayResult({
    required this.milestones,
    required this.zoneCommitCount,
    required this.lastZone,
    required this.lastFixation,
    required this.lastTrackingState,
  });

  final List<PopReplayMilestone> milestones;
  final int zoneCommitCount;
  final String lastZone;
  final String lastFixation;
  final String lastTrackingState;

  String digest() => milestones.map((m) => m.line).join('\n');
}
