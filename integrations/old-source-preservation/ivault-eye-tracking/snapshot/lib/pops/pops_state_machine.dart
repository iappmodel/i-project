import 'pops_models.dart';

/// Stage-1 finite-state transitions for P.O.P.S verification sessions.
final class PopsStateMachine {
  const PopsStateMachine();

  PopsSessionState transition({
    required PopsSessionState current,
    required bool degradeConfidence,
    required bool requireReverification,
    required bool hardDeny,
    required bool completed,
  }) {
    if (hardDeny) return PopsSessionState.denied;
    if (completed) return PopsSessionState.completed;
    if (requireReverification) return PopsSessionState.reverificationRequired;
    if (degradeConfidence && current == PopsSessionState.tracking) {
      return PopsSessionState.paused;
    }
    if (current == PopsSessionState.initializing) {
      return PopsSessionState.tracking;
    }
    return current;
  }
}
