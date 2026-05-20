/// Baseline risk \([0,1]\) by logical action name (e.g. agent or JSON intents).
/// Unknown or unsupported names return `1.0` (highest conservatism).
double riskOf(String actionType) {
  switch (actionType) {
    case 'tap':
      return 0.1;
    case 'scroll':
      return 0.05;
    case 'type':
      return 0.2;
    case 'open_external':
      return 0.7;
    case 'purchase':
      return 0.95;
    default:
      return 1.0;
  }
}
