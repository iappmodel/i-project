import '../system_state.dart';
import 'action_decision.dart';
import 'ui_action.dart';
import 'ui_action_type.dart';

/// Executes [UIAction] side effects when [confidence] passes the safety gate.
class ActionExecutor {
  ActionExecutor({
    void Function(String zone)? onTap,
    void Function(String zone)? onHighlight,
    void Function(String zone)? onPreload,
  })  : _onTap = onTap,
        _onHighlight = onHighlight,
        _onPreload = onPreload;

  final void Function(String zone)? _onTap;
  final void Function(String zone)? _onHighlight;
  final void Function(String zone)? _onPreload;

  /// When [system] is provided, calibration or [SystemState.errorState] yields [ActionDecision.deny].
  /// [kernelApproved] skips redundant system/confidence gates after pipeline kernel approval.
  /// Returns whether any side effect ran (for telemetry / [ActionMemory]).
  bool execute(UIAction action, {SystemState? system, bool kernelApproved = false}) {
    if (!kernelApproved) {
      if (system != null && decideAutonomousAction(system) == ActionDecision.deny) {
        return false;
      }
      if (decideAction(action) == ActionDecision.requireConfirmation) return false;
      if (!_isSafe(action)) return false;
    } else if (decideAction(action) == ActionDecision.requireConfirmation) {
      return false;
    }

    switch (action.type) {
      case UIActionType.tap:
        _tap(action.targetZone);
        break;
      case UIActionType.highlight:
        _highlight(action.targetZone);
        break;
      case UIActionType.preload:
        _preload(action.targetZone);
        break;
      case UIActionType.longPress:
      case UIActionType.scroll:
      case UIActionType.openZone:
      case UIActionType.closeZone:
        break;
    }
    return true;
  }

  void _tap(String zone) => _onTap?.call(zone);

  void _highlight(String zone) => _onHighlight?.call(zone);

  void _preload(String zone) => _onPreload?.call(zone);

  bool _isSafe(UIAction a) => a.confidence > 0.85;
}
