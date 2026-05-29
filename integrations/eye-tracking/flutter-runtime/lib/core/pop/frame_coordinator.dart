import '../signal_stale_policy.dart';

/// Lightweight per-session frame timing coordinator (Stage 2).
final class PopFrameCoordinator {
  int? lastProcessedFrameMs;
  int droppedAdaptiveSkip = 0;

  /// Returns true when this frame should be skipped due to native backpressure.
  bool shouldAdaptiveSkip({
    required double? nativeTotalMs,
    required double budgetMs,
  }) {
    if (nativeTotalMs == null || !nativeTotalMs.isFinite) return false;
    return nativeTotalMs > budgetMs;
  }

  void markProcessed(int nowMs) {
    lastProcessedFrameMs = nowMs;
  }

  bool isStale(int nowMs) => shouldCancelStaleTracking(
        lastProcessedFrameMs: lastProcessedFrameMs,
        nowMs: nowMs,
      );

  void reset() {
    lastProcessedFrameMs = null;
    droppedAdaptiveSkip = 0;
  }
}
