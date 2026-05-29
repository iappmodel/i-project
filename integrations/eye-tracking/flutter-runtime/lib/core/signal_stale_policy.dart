/// Frame staleness and invalid-signal cancellation (Stage 4).
library;
const int kMaxHeldFaceAgeMs = 500;

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
