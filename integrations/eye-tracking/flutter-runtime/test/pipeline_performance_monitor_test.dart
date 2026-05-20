import 'package:eye_tracking_app/performance/pipeline_performance_monitor.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('PipelinePerformanceMonitor', () {
    test('empty monitor returns warming snapshot', () {
      final m = PipelinePerformanceMonitor();
      expect(m.snapshot.bottleneckReason, 'warming window');
      expect(m.snapshot.hudLines, 'warming…');
    });

    test('encode-heavy samples report encode bottleneck', () {
      final m = PipelinePerformanceMonitor(windowDurationMs: 2000);
      for (var i = 0; i < 8; i++) {
        m.ingest(
          PipelineProcessedFrameSample(
            timestampMs: 1000 + i * 100,
            encodeMs: 60,
            channelMs: 25,
            nativeProcessMs: 10,
            nativeTotalMs: 14,
            dartPostMs: 5,
            totalMs: 100,
            validFrame: true,
          ),
        );
      }
      expect(m.snapshot.avgEncodeMs, closeTo(60, 0.01));
      expect(m.snapshot.avgChannelMs, closeTo(25, 0.01));
      expect(m.snapshot.bottleneckStage, PipelineBottleneckStage.encode);
      expect(m.snapshot.bottleneckReason, contains('JPEG encode'));
    });

    test('invalid drops raise invalid ratio', () {
      final m = PipelinePerformanceMonitor(windowDurationMs: 2000);
      for (var i = 0; i < 5; i++) {
        m.recordDrop(PipelineDropKind.invalid, 2000 + i * 50);
      }
      m.ingest(
        PipelineProcessedFrameSample(
          timestampMs: 2200,
          encodeMs: 40,
          channelMs: 30,
          validFrame: false,
        ),
      );
      expect(m.snapshot.invalidFrameCount, greaterThanOrEqualTo(5));
      expect(m.snapshot.invalidRatio, greaterThan(0.5));
    });

    test('busy drop marks buffer pressure proxy', () {
      final m = PipelinePerformanceMonitor();
      m.recordDrop(PipelineDropKind.busy, 3000);
      expect(m.snapshot.busyDropCount, 1);
      expect(m.snapshot.bufferPressureMarkers, 1);
    });

    test('prunes samples outside window', () {
      final m = PipelinePerformanceMonitor(windowDurationMs: 1000);
      m.ingest(
        PipelineProcessedFrameSample(
          timestampMs: 0,
          encodeMs: 99,
          channelMs: 1,
          validFrame: true,
        ),
      );
      m.ingest(
        PipelineProcessedFrameSample(
          timestampMs: 2500,
          encodeMs: 10,
          channelMs: 50,
          validFrame: true,
        ),
      );
      expect(m.snapshot.sampleCount, 1);
      expect(m.snapshot.avgEncodeMs, closeTo(10, 0.01));
    });

    test('camera input drives camera fps', () {
      final m = PipelinePerformanceMonitor(windowDurationMs: 2000);
      for (var i = 0; i < 20; i++) {
        m.recordCameraInput(5000 + i * 50);
      }
      expect(m.snapshot.cameraFps, greaterThan(8));
    });

    test('reset clears state', () {
      final m = PipelinePerformanceMonitor();
      m.ingest(
        PipelineProcessedFrameSample(
          timestampMs: 1000,
          encodeMs: 50,
          channelMs: 30,
          validFrame: true,
        ),
      );
      m.reset();
      expect(m.snapshot, PipelinePerformanceSnapshot.empty);
    });
  });
}
