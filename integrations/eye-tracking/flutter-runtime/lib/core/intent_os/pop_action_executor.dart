import '../../gaze_fixation.dart' show FixationState;
import '../pop/pop_runtime_config.dart';
import '../system_state.dart';
import 'action_context.dart';
import 'autonomous_execution_kernel.dart';
import 'kernel_evaluation_input.dart';
import 'ui_action_type.dart';

/// Unified POP action executor — all zone/control commits pass safety gates (Stage 2–3).
final class PopActionExecutor {
  PopActionExecutor({AutonomousExecutionKernel? kernel})
      : _kernel = kernel ?? AutonomousExecutionKernel();

  final AutonomousExecutionKernel _kernel;

  int? _lastCommitMs;
  final List<int> _commitWindowMs = [];

  AutonomousExecutionKernel get kernel => _kernel;

  /// Gaze-only paths must never execute high-risk UI operations directly.
  static bool isHighRiskFromGazeOnly(UIActionType type) {
    switch (type) {
      case UIActionType.tap:
      case UIActionType.openZone:
      case UIActionType.highlight:
      case UIActionType.preload:
        return false;
      case UIActionType.longPress:
      case UIActionType.scroll:
      case UIActionType.closeZone:
        return true;
    }
  }

  int _timeSinceLastCommitMs(int nowMs) {
    final last = _lastCommitMs;
    if (last == null) return 1 << 30;
    return (nowMs - last).clamp(0, 1 << 30);
  }

  int _recentCommitsLast1s(int nowMs) {
    _commitWindowMs.removeWhere((t) => nowMs - t > 1000);
    return _commitWindowMs.length;
  }

  void _recordCommit(int nowMs) {
    _lastCommitMs = nowMs;
    _commitWindowMs.add(nowMs);
  }

  /// Attempt zone selection through prefilter → governance → safety → [onAllowed].
  ///
  /// Returns gate result; [onAllowed] runs only when allowed.
  AutonomousActionGateResult tryZoneSelect({
    required String zone,
    required double confidence,
    required FixationState fixationState,
    required double dwellProgress,
    required int dwellMs,
    required int nowMs,
    required bool isTracking,
    required bool calibrationBusy,
    required bool visionError,
    required bool userIsDistracted,
    required double autonomyLevel,
    required double stabilityVariance,
    required double riskScore,
    required bool likelyFake,
    required void Function() onAllowed,
  }) {
    if (!isTracking) {
      return AutonomousActionGateResult.blockedPrefilter;
    }
    if (kBlockOnLikelyFake && likelyFake) {
      return AutonomousActionGateResult.blockedPrefilter;
    }
    if (confidence < kMinZoneCommitConfidence) {
      return AutonomousActionGateResult.blockedPrefilter;
    }

    const actionType = UIActionType.openZone;
    if (isHighRiskFromGazeOnly(actionType)) {
      return AutonomousActionGateResult.blockedGovernance;
    }

    // Feeds ONLY the autonomy-scaled prefilter (ActionPipelineKernel). The real
    // confidence is carried on ActionContext below so governance/safety and the audit
    // trail see the true value, not a floored constant (CRITICAL-1 honesty fix).
    final prefilterConfidence = confidence >= kMinGovernanceConfidence
        ? confidence
        : kMinGovernanceConfidence;

    final prefilter = KernelEvaluationInput(
      type: actionType,
      targetZone: zone,
      confidence: prefilterConfidence,
      timestamp: nowMs,
      dwellMs: dwellMs,
      autonomyLevel: autonomyLevel,
      system: SystemState(
        calibrationActive: calibrationBusy,
        errorState: visionError,
        userIsDistracted: userIsDistracted,
      ),
    );

    final ctx = ActionContext(
      actionType: actionType,
      target: zone,
      confidence: confidence,
      // Low-risk reversible zone select: governance honestly checks the real
      // confidence against the explicit zone-commit floor (not the generic 0.85).
      governanceMinConfidence: kMinZoneCommitConfidence,
      riskScore: riskScore,
      userTrust: autonomyLevel,
      fixationState: fixationState,
      dwellProgress: dwellProgress,
      dwellMs: dwellMs,
      timeSinceLastActionMs: _timeSinceLastCommitMs(nowMs),
      recentActionsLast1s: _recentCommitsLast1s(nowMs),
      isReversible: true,
      timestampMs: nowMs,
      autonomyLevel: autonomyLevel,
      stabilityVariance: stabilityVariance,
    );

    var allowed = false;
    final gate = _kernel.tryExecute(prefilter, ctx, () {
      onAllowed();
      allowed = true;
    });
    if (allowed) {
      _recordCommit(nowMs);
    }
    return gate;
  }

  void reset() {
    _lastCommitMs = null;
    _commitWindowMs.clear();
  }
}
