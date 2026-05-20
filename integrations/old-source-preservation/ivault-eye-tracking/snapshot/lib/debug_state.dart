import 'package:flutter/foundation.dart';

/// UI / debug motion tag (includes blink); distinct from [gaze_models] sampling enum.
enum EyeMotionState { fixation, saccade, blink, noFace }

@immutable
class DebugState {
  const DebugState({
    required this.motion,
    required this.zone,
    required this.selected,
  });

  final EyeMotionState motion;
  final String zone;
  final String selected;

  DebugState copyWith({
    EyeMotionState? motion,
    String? zone,
    String? selected,
  }) {
    return DebugState(
      motion: motion ?? this.motion,
      zone: zone ?? this.zone,
      selected: selected ?? this.selected,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DebugState &&
          motion == other.motion &&
          zone == other.zone &&
          selected == other.selected;

  @override
  int get hashCode => Object.hash(motion, zone, selected);
}
