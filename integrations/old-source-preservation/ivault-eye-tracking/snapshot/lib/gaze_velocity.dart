import 'dart:math';

import 'gaze_buffer.dart';

class GazeVelocity {
  /// Pixels per millisecond from the last two [GazeTracePoint]s in [samples].
  static double compute(List<GazeTracePoint> samples) {
    if (samples.length < 2) return 0;

    final a = samples[samples.length - 2];
    final b = samples.last;

    final dt = (b.t - a.t).clamp(1, 1000);
    final dx = b.x - a.x;
    final dy = b.y - a.y;

    final dist = sqrt(dx * dx + dy * dy);

    return dist / dt;
  }
}
