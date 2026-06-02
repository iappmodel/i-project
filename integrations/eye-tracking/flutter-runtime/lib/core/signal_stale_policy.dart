/// Frame staleness and invalid-signal cancellation (Stage 4).
library;
const int kMaxHeldFaceAgeMs = 500;

/// During face-hold, gaze used for commits must be no older than this (ms).
const int kMaxGazeFreshnessDuringHoldMs = 200;

/// Maximum gap (ms) between processed frames before dwell/intent state should cancel.
const int kMaxFrameGapMs = 350;

/// Returns true when [frameAgeMs] exceeds the held-face hold window.
bool isHeldFaceExpired(int frameAgeMs) => frameAgeMs > kMaxHeldFaceAgeMs;

/// Returns true when inter-frame gap implies stale tracking — caller should reset dwell/intent.
bool shouldCancelStaleTracking({
  required int? lastProcessedFrameMs,
  required int nowMs,
}) {
  if (lastProcessedFrameMs == null) return false;
  return (nowMs - lastProcessedFrameMs) > kMaxFrameGapMs;
}

/// Returns true when gaze values are unusable for commits.
bool isInvalidGaze(double? x, double? y) {
  if (x == null || y == null) return true;
  return !x.isFinite || !y.isFinite;
}

/// True when a commit may proceed: fresh gaze, or hold window not using stale gaze.
bool isGazeFreshForCommit({
  required int lastFreshGazeMs,
  required int nowMs,
}) {
  if (lastFreshGazeMs <= 0) return false;
  return (nowMs - lastFreshGazeMs) <= kMaxGazeFreshnessDuringHoldMs;
}
