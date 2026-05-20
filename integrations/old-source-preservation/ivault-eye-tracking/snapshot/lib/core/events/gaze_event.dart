import '../../gaze_fixation.dart';

/// Snapshot emitted each frame after [GazePipeline] output and fixation update.
class GazeEvent {
  const GazeEvent({
    required this.x,
    required this.y,
    required this.state,
    required this.timestamp,
    required this.confidence,
    this.gazeBand,
  });

  final double x;
  final double y;
  final FixationState state;
  final int timestamp;
  final double confidence;

  /// Raw horizontal band from [getZone] on smoothed gaze — drives collective zone intelligence.
  final String? gazeBand;
}
