import 'package:flutter/material.dart';

import '../../gaze_fixation.dart' show FixationState;

/// Frame-level interaction snapshot combining gaze geometry and intent state.
final class InteractionFrame {
  const InteractionFrame({
    required this.gaze,
    required this.zone,
    required this.fixation,
    required this.stability,
    required this.timestamp,
  });

  final Offset gaze;
  final String zone;
  final FixationState fixation;
  final double stability;
  final int timestamp;
}
