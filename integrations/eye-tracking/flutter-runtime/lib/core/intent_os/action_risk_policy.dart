import 'action_type_risk.dart';
import 'risk_tier.dart';
import 'ui_action_type.dart';

/// Merges [RiskTier] baseline with caller-supplied twin/simulation risk for policy layers.
double effectiveActionRisk({
  required UIActionType actionType,
  required double twinRiskScore,
}) {
  final tier = getRisk(actionType);
  final tierBaseline = switch (tier) {
    RiskTier.low => 0.08,
    RiskTier.medium => 0.18,
    RiskTier.high => riskOf(actionType.name),
  };
  final twin = twinRiskScore.isFinite ? twinRiskScore.clamp(0.0, 1.0) : 1.0;
  return twin > tierBaseline ? twin : tierBaseline;
}

/// Whether [actionType] must not run from gaze/blink alone without explicit confirmation.
bool requiresExplicitConfirmation(UIActionType actionType) {
  switch (actionType) {
    case UIActionType.tap:
    case UIActionType.longPress:
    case UIActionType.closeZone:
      return true;
    case UIActionType.scroll:
    case UIActionType.openZone:
    case UIActionType.highlight:
    case UIActionType.preload:
      return false;
  }
}

/// Logical agent/JSON action names that must never run from gaze alone (future external/OS).
bool requiresExplicitConfirmationByName(String actionTypeName) {
  switch (actionTypeName) {
    case 'purchase':
    case 'open_external':
    case 'withdraw':
    case 'tip':
    case 'send_money':
    case 'convert':
    case 'publish':
      return true;
    default:
      return riskOf(actionTypeName) >= 0.7;
  }
}
