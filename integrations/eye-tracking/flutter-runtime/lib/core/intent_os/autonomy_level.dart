/// How strongly the shell may initiate behavior without explicit confirmation.
enum AutonomyLevel {
  /// Suggests only; no automatic execution.
  assistive,

  /// Preps and highlights; does not fire primary actions on its own.
  semiAuto,

  /// May execute simple actions when prediction, fixation, dwell, and safety gates pass.
  auto,
}
