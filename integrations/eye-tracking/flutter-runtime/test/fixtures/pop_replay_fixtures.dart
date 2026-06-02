import 'package:eye_tracking_app/replay/pop_replay_types.dart';

/// Steady gaze on LEFT band with calibration bounds.
List<PopReplayFrame> buildLeftBandWarmup({
  int frameCount = 48,
  int spacingMs = 80,
  double gazeX = -0.35,
}) {
  return List.generate(
    frameCount,
    (i) => PopReplayFrame(
      tMs: i * spacingMs,
      gazeX: gazeX,
      gazeY: 0.02,
      blink: false,
      faceDetected: true,
      liveLandmarks: true,
    ),
  );
}

/// LEFT dwell sequence + single blink frame for zone commit.
List<PopReplayFrame> buildLeftDwellThenBlinkSelect({
  int warmupFrames = 48,
  int spacingMs = 80,
}) {
  final frames = buildLeftBandWarmup(
    frameCount: warmupFrames,
    spacingMs: spacingMs,
  );
  final blinkAt = warmupFrames * spacingMs;
  frames.add(
    PopReplayFrame(
      tMs: blinkAt,
      gazeX: -0.35,
      gazeY: 0.02,
      blink: true,
      faceDetected: true,
      liveLandmarks: true,
    ),
  );
  return frames;
}

/// Dwell completes on held face, then blink with stale gaze (no live landmarks).
List<PopReplayFrame> buildLeftDwellStaleGazeBlink() {
  final frames = buildLeftBandWarmup(frameCount: 48, spacingMs: 80);
  final base = 48 * 80;
  for (var i = 1; i <= 5; i++) {
    frames.add(
      PopReplayFrame(
        tMs: base + i * 80,
        gazeX: -0.35,
        gazeY: 0.02,
        blink: false,
        liveLandmarks: false,
      ),
    );
  }
  frames.add(
    PopReplayFrame(
      tMs: base + 6 * 80,
      gazeX: -0.35,
      gazeY: 0.02,
      blink: true,
      liveLandmarks: false,
    ),
  );
  return frames;
}

/// Face drops mid-sequence — pipeline and dwell reset.
List<PopReplayFrame> buildFaceLossReset() {
  final frames = buildLeftBandWarmup(frameCount: 20, spacingMs: 80);
  frames.add(
    const PopReplayFrame(
      tMs: 20 * 80,
      gazeX: 0,
      gazeY: 0,
      faceDetected: false,
      liveLandmarks: false,
    ),
  );
  return frames;
}
