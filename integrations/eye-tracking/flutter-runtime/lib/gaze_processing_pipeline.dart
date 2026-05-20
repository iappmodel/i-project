import 'gaze_filter.dart';

/// Deprecated parallel pipeline kept for compatibility during Phase 2 rollout.
/// Runtime signal authority is now `engine/gaze_pipeline.dart` + `gaze_fixation.dart`.
@Deprecated(
  'Use GazePipeline + GazeFixation. This legacy parallel path is kept temporarily.',
)
final class GazeProcessingPipeline {
  GazeProcessingPipeline();

  final GazeFilter _filter = GazeFilter();

  /// When [valid] is false or gaze is non-finite, returns `{ "valid": false }`.
  /// Otherwise returns smoothed `x` / `y`, `valid: true`, and a `state` string
  /// (`fixation` | `saccade` | `unstable`) from rolling variance.
  Map<String, Object?> update({
    required double? x,
    required double? y,
    required bool valid,
    required int now,
  }) {
    // Reserved for temporal gating / debounce; keeps call-site shape stable.
    final _ = now;

    if (!valid) {
      return <String, Object?>{'valid': false};
    }
    final gx = x;
    final yVal = y;
    if (gx == null || !gx.isFinite || yVal == null || !yVal.isFinite) {
      return <String, Object?>{'valid': false};
    }
    final smoothed = _filter.update(gx, yVal.toDouble());
    final varX = _filter.varianceX();
    final String state;
    if (!_filter.hasEnoughSamples) {
      state = 'unstable';
    } else if (varX < 0.000025) {
      state = 'fixation';
    } else {
      state = 'saccade';
    }
    return <String, Object?>{
      'valid': true,
      'x': smoothed.dx,
      'y': smoothed.dy,
      'state': state,
    };
  }

  bool get hasEnoughSamples => _filter.hasEnoughSamples;

  double varianceX() => _filter.varianceX();

  double varianceY() => _filter.varianceY();

  void reset() => _filter.reset();
}
