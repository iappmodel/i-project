import 'action_context.dart';
import 'action_risk_policy.dart';
import 'external_os_control_policy.dart';
import 'risk_tier.dart';
import 'ui_action_type.dart';

/// Blocks gaze/blink-only execution of high-risk and external/OS-capable actions.
///
/// External/OS control stays behind [kEnableExternalOsControl] (default off). MVP
/// ships in-app zone control only; this lane still rejects financial-grade
/// actions from biometric triggers regardless of the flag.
final class HighRiskActionLane {
  const HighRiskActionLane();

  /// Returns true when the action must not execute on this path.
  bool blocks(ActionContext ctx) {
    if (!ctx.fromGazeOnly) {
      return false;
    }
    if (!ctx.gazeFreshForCommit) {
      return true;
    }
    if (requiresExplicitConfirmation(ctx.actionType) &&
        !ctx.explicitConfirmationGranted) {
      return true;
    }
    if (_legacyGazeOnlyBlockedTypes(ctx.actionType)) {
      return true;
    }
    if (getRisk(ctx.actionType) == RiskTier.high &&
        !ctx.explicitConfirmationGranted) {
      return true;
    }
    if (blocksExternalOsControl(ctx)) {
      return true;
    }
    return false;
  }

  /// Pre–high-risk-lane gaze-only blocks (scroll, longPress, closeZone).
  static bool _legacyGazeOnlyBlockedTypes(UIActionType type) {
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
}
