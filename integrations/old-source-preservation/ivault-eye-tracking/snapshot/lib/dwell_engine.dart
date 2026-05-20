class DwellState {
  DwellState({
    required this.targetId,
    this.durationMs = 0,
  });

  final String targetId;
  double durationMs;
}

class DwellEngine {
  DwellEngine({
    this.thresholdMs = 700,
  });

  final double thresholdMs;
  DwellState? _state;

  DwellState? get state => _state;

  double progressFor(String targetId) {
    final state = _state;
    if (state == null || state.targetId != targetId) {
      return 0;
    }
    return (state.durationMs / thresholdMs).clamp(0.0, 1.0);
  }

  bool update({
    required String targetId,
    required bool gazeInsideTarget,
    required double deltaMs,
  }) {
    if (!gazeInsideTarget || deltaMs <= 0) {
      reset();
      return false;
    }

    final state = _state;
    if (state == null || state.targetId != targetId) {
      _state = DwellState(targetId: targetId, durationMs: deltaMs);
    } else {
      state.durationMs += deltaMs;
    }

    return (_state?.durationMs ?? 0) > thresholdMs;
  }

  void reset() {
    _state = null;
  }
}
