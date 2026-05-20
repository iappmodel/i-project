import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/features/vision/frame_perf_metrics.dart';

void main() {
  group('FramePerfMetrics', () {
    test('resetWindow clears window counters but not lastNative timings', () {
      final m = FramePerfMetrics();
      const t = 1_700_000_000_000;

      m.windowStartMs = 100;
      m.cameraInputCount = 5;
      m.processedCount = 4;
      m.droppedThrottle = 1;
      m.droppedBusy = 2;
      m.droppedInvalid = 3;
      m.encodeTotalMs = 10;
      m.encodeSamples = 2;
      m.channelTotalMs = 20;
      m.channelSamples = 2;
      m.postprocessTotalMs = 30;
      m.postprocessSamples = 2;
      m.lastNativeDecodeMs = 1.1;
      m.lastNativeProcessMs = 2.2;
      m.lastNativeTotalMs = 3.3;

      m.resetWindow(t);

      expect(m.windowStartMs, t);
      expect(m.cameraInputCount, 0);
      expect(m.processedCount, 0);
      expect(m.droppedThrottle, 0);
      expect(m.droppedBusy, 0);
      expect(m.droppedInvalid, 0);
      expect(m.encodeTotalMs, 0);
      expect(m.encodeSamples, 0);
      expect(m.channelTotalMs, 0);
      expect(m.channelSamples, 0);
      expect(m.postprocessTotalMs, 0);
      expect(m.postprocessSamples, 0);
      expect(m.lastNativeDecodeMs, 1.1);
      expect(m.lastNativeProcessMs, 2.2);
      expect(m.lastNativeTotalMs, 3.3);
    });
  });
}
