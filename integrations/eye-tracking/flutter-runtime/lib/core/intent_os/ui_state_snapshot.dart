import 'package:flutter/material.dart';

import '../../gaze_fixation.dart' show FixationState;

/// Frozen UI + gaze context for sandbox simulation and kernel evaluation.
final class UIStateSnapshot {
  const UIStateSnapshot({
    required this.gaze,
    required this.activeZone,
    required this.motionState,
    required this.stability,
  });

  final Offset gaze;

  /// Last dwell/selection band label, or current band; may be empty when unknown.
  final String activeZone;

  final FixationState motionState;

  /// Lower is steadier (e.g. filter variance on X); same scale as [GazePipeline] / filter.
  final double stability;
}
