final class FramePerfMetrics {
  int windowStartMs = 0;
  int cameraInputCount = 0;
  int processedCount = 0;
  int droppedThrottle = 0;
  int droppedBusy = 0;
  int droppedInvalid = 0;

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
    encodeTotalMs = 0;
    encodeSamples = 0;
    channelTotalMs = 0;
    channelSamples = 0;
    postprocessTotalMs = 0;
    postprocessSamples = 0;
  }
}
