import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/features/vision/frame_perf_metrics.dart'
    show FramePerfMetrics, percentileP95;

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
      expect(m.droppedAdaptiveSkip, 0);
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

    test('snapshot reports adaptive skip in hudLine', () {
      final m = FramePerfMetrics();
      m.resetWindow(1000);
      m.cameraInputCount = 12;
      m.processedCount = 8;
      m.droppedAdaptiveSkip = 2;
      m.lastNativeTotalMs = 44.0;
      final line = m.snapshot(nowMs: 2000).hudLine;
      expect(line, contains('0/0/0/2'));
      expect(line, contains('native=44.0'));
    });

    test('percentileP95 computes ship-gate threshold', () {
      final p95 = percentileP95([10, 20, 30, 40, 50, 60, 70]);
      expect(p95, greaterThanOrEqualTo(60));
      expect(p95, lessThanOrEqualTo(70));
    });
  });
}
