/// Cross-cutting flags for safety gates and autonomous actions.
final class SystemState {
  const SystemState({
    this.userIsDistracted = false,
    this.calibrationActive = false,
    this.errorState = false,
  });

  final bool userIsDistracted;
  final bool calibrationActive;
  final bool errorState;
}
