/// Observe-only pipeline stage instrumentation for promoted Android runtime.
///
/// Rolling-window aggregates for camera → encode → channel → native → Dart post.
/// Does not alter frame processing, verification, or native behavior.
library;

import 'dart:math';

/// Drop / backpressure signals observable from Dart.
enum PipelineDropKind {
  throttle,
  busy,
  invalid,
  /// Proxy when a frame is skipped while [_processingFrame] is true (ImageStreamReader pressure).
  bufferPressure,
}

/// Pipeline stage labels for bottleneck reporting.
enum PipelineBottleneckStage {
  none('—'),
  capture('capture'),
  encode('encode'),
  channel('channel'),
  nativeDecode('nativeDecode'),
  nativeProcess('nativeProcess'),
  nativeTotal('nativeTotal'),
  dartPost('dartPost'),
  total('total');

  const PipelineBottleneckStage(this.label);
  final String label;
}

/// Per-processed-frame timings (one sample per completed handler path).
final class PipelineProcessedFrameSample {
  const PipelineProcessedFrameSample({
    required this.timestampMs,
    this.captureMs,
    required this.encodeMs,
    required this.channelMs,
    this.nativeDecodeMs,
    this.nativeProcessMs,
    this.nativeTotalMs,
    this.dartPostMs,
    this.totalMs,
    required this.validFrame,
  });

  final int timestampMs;
  final double? captureMs;
  final double encodeMs;
  final double channelMs;
  final double? nativeDecodeMs;
  final double? nativeProcessMs;
  final double? nativeTotalMs;
  final double? dartPostMs;
  final double? totalMs;
  final bool validFrame;
}

/// Immutable snapshot for HUD / logs (derived from rolling window).
final class PipelinePerformanceSnapshot {
  const PipelinePerformanceSnapshot({
    required this.windowMs,
    required this.sampleCount,
    required this.cameraInputCount,
    required this.validFrameCount,
    required this.invalidFrameCount,
    required this.throttledCount,
    required this.busyDropCount,
    required this.bufferPressureMarkers,
    required this.avgEncodeMs,
    required this.avgChannelMs,
    required this.avgNativeProcessMs,
    required this.avgNativeTotalMs,
    required this.avgDartPostMs,
    required this.avgTotalMs,
    required this.avgCaptureMs,
    required this.processedFps,
    required this.cameraFps,
    required this.invalidRatio,
    required this.bottleneckStage,
    required this.bottleneckReason,
  });

  final int windowMs;
  final int sampleCount;
  final int cameraInputCount;
  final int validFrameCount;
  final int invalidFrameCount;
  final int throttledCount;
  final int busyDropCount;
  final int bufferPressureMarkers;
  final double avgEncodeMs;
  final double avgChannelMs;
  final double avgNativeProcessMs;
  final double avgNativeTotalMs;
  final double avgDartPostMs;
  final double avgTotalMs;
  final double avgCaptureMs;
  final double processedFps;
  final double cameraFps;
  final double invalidRatio;
  final PipelineBottleneckStage bottleneckStage;
  final String bottleneckReason;

  static const PipelinePerformanceSnapshot empty = PipelinePerformanceSnapshot(
    windowMs: 0,
    sampleCount: 0,
    cameraInputCount: 0,
    validFrameCount: 0,
    invalidFrameCount: 0,
    throttledCount: 0,
    busyDropCount: 0,
    bufferPressureMarkers: 0,
    avgEncodeMs: 0,
    avgChannelMs: 0,
    avgNativeProcessMs: 0,
    avgNativeTotalMs: 0,
    avgDartPostMs: 0,
    avgTotalMs: 0,
    avgCaptureMs: 0,
    processedFps: 0,
    cameraFps: 0,
    invalidRatio: 0,
    bottleneckStage: PipelineBottleneckStage.none,
    bottleneckReason: 'warming window',
  );

  /// Compact multi-line block for debug HUD.
  String get hudLines {
    if (sampleCount == 0 && cameraInputCount == 0) {
      return 'warming…';
    }
    final bn = bottleneckStage == PipelineBottleneckStage.none
        ? '—'
        : bottleneckStage.label;
    return 'enc=${avgEncodeMs.toStringAsFixed(0)}ms '
        'ch=${avgChannelMs.toStringAsFixed(0)}ms '
        'nat=${avgNativeProcessMs.toStringAsFixed(0)}ms '
        'tot=${avgTotalMs.toStringAsFixed(0)}ms\n'
        'fps proc=${processedFps.toStringAsFixed(1)} '
        'cam=${cameraFps.toStringAsFixed(1)} '
        'inv=${(invalidRatio * 100).toStringAsFixed(0)}%\n'
        'bn: $bn — $bottleneckReason\n'
        'drop T/B/I/buf=${throttledCount}/${busyDropCount}/'
        '${invalidFrameCount}/${bufferPressureMarkers}';
  }
}

/// Rolling-window monitor (~2s default) for pipeline stage performance.
final class PipelinePerformanceMonitor {
  PipelinePerformanceMonitor({this.windowDurationMs = 2000});

  final int windowDurationMs;
  final List<PipelineProcessedFrameSample> _samples =
      <PipelineProcessedFrameSample>[];
  final List<_DropEvent> _drops = <_DropEvent>[];
  final List<int> _cameraInputTimestamps = <int>[];
  int _windowAnchorMs = 0;
  PipelinePerformanceSnapshot _snapshot = PipelinePerformanceSnapshot.empty;

  PipelinePerformanceSnapshot get snapshot => _snapshot;

  void reset() {
    _samples.clear();
    _drops.clear();
    _cameraInputTimestamps.clear();
    _windowAnchorMs = 0;
    _snapshot = PipelinePerformanceSnapshot.empty;
  }

  /// One camera callback (includes throttled frames).
  void recordCameraInput(int timestampMs) {
    _ensureWindow(timestampMs);
    _cameraInputTimestamps.add(timestampMs);
    _prune(timestampMs);
    _recompute(timestampMs);
  }

  void recordDrop(PipelineDropKind kind, int timestampMs) {
    _ensureWindow(timestampMs);
    _drops.add(_DropEvent(timestampMs: timestampMs, kind: kind));
    if (kind == PipelineDropKind.busy) {
      _drops.add(
        _DropEvent(
          timestampMs: timestampMs,
          kind: PipelineDropKind.bufferPressure,
        ),
      );
    }
    _prune(timestampMs);
    _recompute(timestampMs);
  }

  /// Adds a completed frame timing sample.
  PipelinePerformanceSnapshot ingest(PipelineProcessedFrameSample sample) {
    _ensureWindow(sample.timestampMs);
    _samples.add(sample);
    _prune(sample.timestampMs);
    _recompute(sample.timestampMs);
    return _snapshot;
  }

  void _ensureWindow(int nowMs) {
    if (_windowAnchorMs == 0) {
      _windowAnchorMs = nowMs;
    }
  }

  void _prune(int nowMs) {
    final cutoff = nowMs - windowDurationMs;
    while (_samples.isNotEmpty && _samples.first.timestampMs < cutoff) {
      _samples.removeAt(0);
    }
    while (_drops.isNotEmpty && _drops.first.timestampMs < cutoff) {
      _drops.removeAt(0);
    }
    while (_cameraInputTimestamps.isNotEmpty &&
        _cameraInputTimestamps.first < cutoff) {
      _cameraInputTimestamps.removeAt(0);
    }
    _windowAnchorMs = _earliestTimestamp(nowMs);
  }

  int _earliestTimestamp(int nowMs) {
    final candidates = <int>[
      if (_samples.isNotEmpty) _samples.first.timestampMs,
      if (_drops.isNotEmpty) _drops.first.timestampMs,
      if (_cameraInputTimestamps.isNotEmpty) _cameraInputTimestamps.first,
    ];
    if (candidates.isEmpty) return nowMs;
    return candidates.reduce(min);
  }

  void _recompute(int nowMs) {
    final hasData = _samples.isNotEmpty ||
        _drops.isNotEmpty ||
        _cameraInputTimestamps.isNotEmpty;
    final windowMs = !hasData
        ? 0
        : (nowMs - _windowAnchorMs).clamp(1, windowDurationMs);
    final secs = windowMs / 1000.0;

    var throttled = 0;
    var busy = 0;
    var invalid = 0;
    var bufferMarkers = 0;
    for (final d in _drops) {
      switch (d.kind) {
        case PipelineDropKind.throttle:
          throttled++;
        case PipelineDropKind.busy:
          busy++;
        case PipelineDropKind.invalid:
          invalid++;
        case PipelineDropKind.bufferPressure:
          bufferMarkers++;
      }
    }

    final validCount = _samples.where((s) => s.validFrame).length;
    final invalidSamples = _samples.length - validCount;
    final totalInvalid = invalid + invalidSamples;
    final processedCount = _samples.length;
    final denom = processedCount + totalInvalid;
    final invalidRatio = denom == 0 ? 0.0 : totalInvalid / denom;

    final avgEncode = _avg(_samples.map((s) => s.encodeMs));
    final avgChannel = _avg(_samples.map((s) => s.channelMs));
    final avgNativeProcess = _avg(
      _samples
          .map((s) => s.nativeProcessMs)
          .whereType<double>()
          .where((v) => v.isFinite),
    );
    final avgNativeTotal = _avg(
      _samples
          .map((s) => s.nativeTotalMs)
          .whereType<double>()
          .where((v) => v.isFinite),
    );
    final avgDartPost = _avg(
      _samples
          .map((s) => s.dartPostMs)
          .whereType<double>()
          .where((v) => v.isFinite),
    );
    final avgTotal = _avg(
      _samples
          .map((s) => s.totalMs)
          .whereType<double>()
          .where((v) => v.isFinite),
    );
    final avgCapture = _avg(
      _samples
          .map((s) => s.captureMs)
          .whereType<double>()
          .where((v) => v.isFinite),
    );

    final processedFps = processedCount / secs;
    final cameraFps = _cameraInputTimestamps.length / secs;

    final bottleneck = _resolveBottleneck(
      avgCapture: avgCapture,
      avgEncode: avgEncode,
      avgChannel: avgChannel,
      avgNativeDecode: _avg(
        _samples
            .map((s) => s.nativeDecodeMs)
            .whereType<double>()
            .where((v) => v.isFinite),
      ),
      avgNativeProcess: avgNativeProcess,
      avgNativeTotal: avgNativeTotal,
      avgDartPost: avgDartPost,
      avgTotal: avgTotal,
      sampleCount: processedCount,
    );

    _snapshot = PipelinePerformanceSnapshot(
      windowMs: windowMs,
      sampleCount: processedCount,
      cameraInputCount: _cameraInputTimestamps.length,
      validFrameCount: validCount,
      invalidFrameCount: totalInvalid,
      throttledCount: throttled,
      busyDropCount: busy,
      bufferPressureMarkers: bufferMarkers,
      avgEncodeMs: avgEncode,
      avgChannelMs: avgChannel,
      avgNativeProcessMs: avgNativeProcess,
      avgNativeTotalMs: avgNativeTotal,
      avgDartPostMs: avgDartPost,
      avgTotalMs: avgTotal,
      avgCaptureMs: avgCapture,
      processedFps: processedFps,
      cameraFps: cameraFps,
      invalidRatio: invalidRatio,
      bottleneckStage: bottleneck.$1,
      bottleneckReason: bottleneck.$2,
    );
  }

  static double _avg(Iterable<double> values) {
    final list = values.where((v) => v.isFinite && v >= 0).toList();
    if (list.isEmpty) return 0;
    return list.reduce((a, b) => a + b) / list.length;
  }

  static (PipelineBottleneckStage, String) _resolveBottleneck({
    required double avgCapture,
    required double avgEncode,
    required double avgChannel,
    required double avgNativeDecode,
    required double avgNativeProcess,
    required double avgNativeTotal,
    required double avgDartPost,
    required double avgTotal,
    required int sampleCount,
  }) {
    if (sampleCount == 0) {
      return (PipelineBottleneckStage.none, 'no processed samples');
    }

    // Exclude aggregate stages (total, nativeTotal) so the label names an optimizable substage.
    final candidates = <(PipelineBottleneckStage, double)>[
      if (avgCapture > 0) (PipelineBottleneckStage.capture, avgCapture),
      if (avgEncode > 0) (PipelineBottleneckStage.encode, avgEncode),
      if (avgChannel > 0) (PipelineBottleneckStage.channel, avgChannel),
      if (avgNativeDecode > 0)
        (PipelineBottleneckStage.nativeDecode, avgNativeDecode),
      if (avgNativeProcess > 0)
        (PipelineBottleneckStage.nativeProcess, avgNativeProcess),
      if (avgDartPost > 0) (PipelineBottleneckStage.dartPost, avgDartPost),
    ];
    if (candidates.isEmpty) {
      return (PipelineBottleneckStage.none, 'insufficient timing');
    }

    candidates.sort((a, b) => b.$2.compareTo(a.$2));
    final top = candidates.first;
    final second = candidates.length > 1 ? candidates[1] : null;

    final reason = switch (top.$1) {
      PipelineBottleneckStage.encode =>
        'JPEG encode avg ${top.$2.toStringAsFixed(1)}ms'
            '${second != null ? ' (next ${second.$1.label} ${second.$2.toStringAsFixed(1)}ms)' : ''}',
      PipelineBottleneckStage.channel =>
        'MethodChannel + native round-trip avg ${top.$2.toStringAsFixed(1)}ms',
      PipelineBottleneckStage.nativeProcess =>
        'Face Landmarker process avg ${top.$2.toStringAsFixed(1)}ms',
      PipelineBottleneckStage.nativeDecode =>
        'Native JPEG decode avg ${top.$2.toStringAsFixed(1)}ms',
      PipelineBottleneckStage.nativeTotal =>
        'Native vision total avg ${top.$2.toStringAsFixed(1)}ms',
      PipelineBottleneckStage.dartPost =>
        'Dart post-native path avg ${top.$2.toStringAsFixed(1)}ms',
      PipelineBottleneckStage.capture =>
        'Camera callback queue avg ${top.$2.toStringAsFixed(1)}ms',
      PipelineBottleneckStage.total =>
        'End-to-end frame handler avg ${top.$2.toStringAsFixed(1)}ms',
      PipelineBottleneckStage.none => 'unknown',
    };

    return (top.$1, reason);
  }
}

final class _DropEvent {
  const _DropEvent({required this.timestampMs, required this.kind});

  final int timestampMs;
  final PipelineDropKind kind;
}
