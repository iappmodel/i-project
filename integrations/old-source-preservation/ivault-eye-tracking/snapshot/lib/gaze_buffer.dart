import 'dart:collection';

/// Lightweight (x, y, time) point for velocity / short history buffers.
/// Distinct from [GazeSample] in `gaze_models.dart`.
class GazeTracePoint {
  final double x;
  final double y;
  final int t;

  const GazeTracePoint(this.x, this.y, this.t);
}

class GazeTraceBuffer {
  final int maxSize;
  final ListQueue<GazeTracePoint> _samples = ListQueue<GazeTracePoint>();

  GazeTraceBuffer({this.maxSize = 30});

  void add(double x, double y, int t) {
    _samples.addLast(GazeTracePoint(x, y, t));
    while (_samples.length > maxSize) {
      _samples.removeFirst();
    }
  }

  List<GazeTracePoint> get samples => List<GazeTracePoint>.unmodifiable(
        List<GazeTracePoint>.from(_samples),
      );

  bool get hasEnough => _samples.length >= 5;

  GazeTracePoint? get last => _samples.isEmpty ? null : _samples.last;

  void clear() => _samples.clear();
}

/// Alias for [GazeTraceBuffer] (snippet / pipeline naming).
typedef GazeBuffer = GazeTraceBuffer;
