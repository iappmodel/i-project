import '../pop/pop_runtime_config.dart';
import 'action_context.dart';

/// Logical agent / JSON action names that can delegate outside the app (OS, browser, payments).
const Set<String> kExternalOsCapableActionNames = {
  'open_external',
  'launch_app',
  'open_url',
  'accessibility_tap',
  'accessibility_scroll',
  'accessibility_global_action',
  'send_money',
  'withdraw',
  'purchase',
  'convert',
  'tip',
  'publish',
};

/// Whether [name] can trigger OS-level or out-of-app side effects.
bool isExternalOsCapableByName(String name) {
  return kExternalOsCapableActionNames.contains(name);
}

/// True when this context targets an external/OS-capable logical action.
bool isExternalOsCapable(ActionContext ctx) {
  final name = ctx.logicalActionName;
  if (name != null && name.isNotEmpty) {
    return isExternalOsCapableByName(name);
  }
  return false;
}

/// Hard gate: production default blocks all external/OS paths.
enum ExternalOsBlockReason {
  /// Allowed (flag on + confirmation + not gaze-only).
  none,

  /// [kEnableExternalOsControl] is false (Android/iOS MVP default).
  disabledByProductFlag,

  /// External actions must never run from gaze/blink alone.
  blockedGazeOnly,

  /// Flag on but missing second-step / touch confirmation.
  requiresExplicitConfirmation,
}

/// Evaluates whether external/OS control may proceed for [ctx].
ExternalOsBlockReason evaluateExternalOsControl(ActionContext ctx) {
  if (!isExternalOsCapable(ctx)) {
    return ExternalOsBlockReason.none;
  }
  if (!kEnableExternalOsControl) {
    return ExternalOsBlockReason.disabledByProductFlag;
  }
  if (ctx.fromGazeOnly) {
    return ExternalOsBlockReason.blockedGazeOnly;
  }
  if (!ctx.explicitConfirmationGranted) {
    return ExternalOsBlockReason.requiresExplicitConfirmation;
  }
  return ExternalOsBlockReason.none;
}

/// True when the action must not execute (external/OS policy).
bool blocksExternalOsControl(ActionContext ctx) {
  return evaluateExternalOsControl(ctx) != ExternalOsBlockReason.none;
}
