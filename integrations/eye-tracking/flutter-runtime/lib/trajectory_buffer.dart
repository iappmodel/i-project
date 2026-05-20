import 'gaze_buffer.dart';

/// Rolling (x, y, t) history for trajectory-based prediction or analytics.
///
/// Uses a longer window than the default [GazeTraceBuffer] for polyline-style use.
final class TrajectoryBuffer {
  TrajectoryBuffer({int maxSize = 64}) : _trace = GazeTraceBuffer(maxSize: maxSize);

  final GazeTraceBuffer _trace;

  void add(double x, double y, int t) => _trace.add(x, y, t);

  void clear() => _trace.clear();

  bool get hasEnough => _trace.hasEnough;

  List<GazeTracePoint> get points => _trace.samples;

  GazeTraceBuffer get trace => _trace;
}
