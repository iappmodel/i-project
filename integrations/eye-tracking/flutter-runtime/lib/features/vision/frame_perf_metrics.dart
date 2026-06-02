/// Rolling frame perf counters for POP runtime (Stage 7 HUD + debug).
library;

final class FramePerfMetrics {
  int windowStartMs = 0;
  int cameraInputCount = 0;
  int processedCount = 0;
  int droppedThrottle = 0;
  int droppedBusy = 0;
  int droppedInvalid = 0;
  int droppedAdaptiveSkip = 0;

  double encodeTotalMs = 0;
  int encodeSamples = 0;
  double channelTotalMs = 0;
  int channelSamples = 0;
  double postprocessTotalMs = 0;
  int postprocessSamples = 0;

  double lastNativeDecodeMs = 0;
  double lastNativeProcessMs = 0;
  double lastNativeTotalMs = 0;

  void resetWindow(int nowMs) {
    windowStartMs = nowMs;
    cameraInputCount = 0;
    processedCount = 0;
    droppedThrottle = 0;
    droppedBusy = 0;
    droppedInvalid = 0;
    droppedAdaptiveSkip = 0;
    encodeTotalMs = 0;
    encodeSamples = 0;
    channelTotalMs = 0;
    channelSamples = 0;
    postprocessTotalMs = 0;
    postprocessSamples = 0;
  }

  FramePerfSnapshot snapshot({required int nowMs}) {
    final windowMs = (nowMs - windowStartMs).clamp(1, 60000);
    final secs = windowMs / 1000.0;
    return FramePerfSnapshot(
      windowSecs: secs,
      cameraFps: cameraInputCount / secs,
      processedFps: processedCount / secs,
      droppedThrottle: droppedThrottle,
      droppedBusy: droppedBusy,
      droppedInvalid: droppedInvalid,
      droppedAdaptiveSkip: droppedAdaptiveSkip,
      avgEncodeMs: encodeSamples == 0 ? 0 : encodeTotalMs / encodeSamples,
      avgChannelMs: channelSamples == 0 ? 0 : channelTotalMs / channelSamples,
      avgPostMs: postprocessSamples == 0 ? 0 : postprocessTotalMs / postprocessSamples,
      lastNativeTotalMs: lastNativeTotalMs,
    );
  }
}

final class FramePerfSnapshot {
  const FramePerfSnapshot({
    required this.windowSecs,
    required this.cameraFps,
    required this.processedFps,
    required this.droppedThrottle,
    required this.droppedBusy,
    required this.droppedInvalid,
    required this.droppedAdaptiveSkip,
    required this.avgEncodeMs,
    required this.avgChannelMs,
    required this.avgPostMs,
    required this.lastNativeTotalMs,
  });

  final double windowSecs;
  final double cameraFps;
  final double processedFps;
  final int droppedThrottle;
  final int droppedBusy;
  final int droppedInvalid;
  final int droppedAdaptiveSkip;
  final double avgEncodeMs;
  final double avgChannelMs;
  final double avgPostMs;
  final double lastNativeTotalMs;

  String get hudLine =>
      'fps cam=${cameraFps.toStringAsFixed(1)} proc=${processedFps.toStringAsFixed(1)} '
      'drop T/B/I/A=$droppedThrottle/$droppedBusy/$droppedInvalid/$droppedAdaptiveSkip '
      'ms enc=${avgEncodeMs.toStringAsFixed(1)} ch=${avgChannelMs.toStringAsFixed(1)} '
      'post=${avgPostMs.toStringAsFixed(1)} native=${lastNativeTotalMs.toStringAsFixed(1)}';
}
