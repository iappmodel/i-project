import '../../gaze_fixation.dart' show FixationState;
import 'ui_action_type.dart';

/// Signals around one intent decision for policy layers (e.g. [GovernanceKernel]).
final class ActionContext {
  const ActionContext({
    required this.actionType,
    required this.target,
    required this.confidence,
    required this.riskScore,
    required this.userTrust,
    required this.fixationState,
    required this.dwellProgress,
    required this.dwellMs,
    required this.timeSinceLastActionMs,
    required this.recentActionsLast1s,
    required this.isReversible,
    required this.timestampMs,
    required this.autonomyLevel,
    required this.stabilityVariance,
    this.governanceMinConfidence = 0.85,
    this.fromGazeOnly = true,
    this.explicitConfirmationGranted = false,
    this.gazeFreshForCommit = true,
    this.logicalActionName,
  });

  /// Optional caller convention for “no prior action” (e.g. logging). [GovernanceKernel]
  /// rate limiting uses [timeSinceLastActionMs] > 600 — use a large elapsed ms when the
  /// first action should pass that gate (e.g. time since session start).
  static const int noPriorActionTimeSentinel = -1;

  final UIActionType actionType;
  final String target;
  final double confidence;
  final double riskScore;
  final double userTrust;
  final FixationState fixationState;
  final double dwellProgress;

  /// Dwell duration in milliseconds backing [dwellProgress] (same basis as [KernelEvaluationInput.dwellMs]).
  final int dwellMs;

  final int timeSinceLastActionMs;
  final int recentActionsLast1s;
  final bool isReversible;

  /// Wall-clock ms when this context was built (commit / evaluation instant).
  final int timestampMs;

  /// Policy autonomy / trust blend, \([0,1]\) — same semantics as [KernelEvaluationInput.autonomyLevel].
  final double autonomyLevel;

  /// Gaze pipeline stability (e.g. [GazePipeline.varianceX]) for audit / downstream policy.
  final double stabilityVariance;

  /// Confidence floor [GovernanceKernel] enforces against the real [confidence].
  ///
  /// Defaults to 0.85 (autonomous / high-risk path). Low-risk reversible control
  /// (manual gaze zone select) sets this to the explicit zone-commit floor
  /// (`kMinZoneCommitConfidence`) so governance honestly checks the true confidence
  /// instead of being neutralized by a floored value.
  final double governanceMinConfidence;

  /// True when the trigger is gaze/blink (not touch or confirmed second step).
  final bool fromGazeOnly;

  /// Second-blink confirm, touch confirm, or preview OK for high-risk actions.
  final bool explicitConfirmationGranted;

  /// False during face-hold when gaze is older than [kMaxGazeFreshnessDuringHoldMs].
  final bool gazeFreshForCommit;

  /// Agent/JSON action name when not represented by [UIActionType] alone (e.g. `open_external`).
  final String? logicalActionName;
}
