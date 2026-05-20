import '../../debug_state.dart';

/// Emitted on blink onset (e.g. mean-EAR closed edge) for intent OS / analytics.
class BlinkEvent {
  const BlinkEvent({
    required this.type,
    required this.timestamp,
    required this.confidence,
  });

  final EyeMotionState type;
  final int timestamp;
  final double confidence;
}
