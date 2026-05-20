import 'gaze_buffer.dart';
import 'gaze_velocity.dart';

enum FixationState { fixation, saccade, unstable }

class GazeFixation {
  static const double velThresh = 0.002;
  static const double varThresh = 0.00008;
  static const int timeThreshMs = 200;

  int _fixStart = 0;

  FixationState update({
    required GazeTraceBuffer buffer,
    required double varX,
    required double varY,
    required int now,
  }) {
    if (!buffer.hasEnough) return FixationState.unstable;

    final vel = GazeVelocity.compute(buffer.samples);

    final stable =
        vel < velThresh && varX < varThresh && varY < varThresh;

    if (stable) {
      if (_fixStart == 0) _fixStart = now;

      if (now - _fixStart > timeThreshMs) {
        return FixationState.fixation;
      }

      return FixationState.unstable;
    } else {
      _fixStart = 0;
      return FixationState.saccade;
    }
  }

  void reset() {
    _fixStart = 0;
  }
}
