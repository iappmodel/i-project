/// Snapshot of global UI / session gates for [KernelEvaluationInput] and autonomy policy.
final class SystemState {
  const SystemState({
    this.calibrationActive = false,
    this.errorState = false,
    this.userIsDistracted = false,
  });

  final bool calibrationActive;
  final bool errorState;
  final bool userIsDistracted;
}
