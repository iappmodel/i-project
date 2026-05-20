import 'ui_action_type.dart';

enum RiskTier {
  low, // highlight, preload
  medium, // select zone, scroll
  high, // click, navigation
}

RiskTier getRisk(UIActionType type) {
  switch (type) {
    case UIActionType.highlight:
    case UIActionType.preload:
      return RiskTier.low;

    case UIActionType.scroll:
    case UIActionType.openZone:
      return RiskTier.medium;

    case UIActionType.tap:
    case UIActionType.closeZone:
    case UIActionType.longPress:
      return RiskTier.high;
  }
}
