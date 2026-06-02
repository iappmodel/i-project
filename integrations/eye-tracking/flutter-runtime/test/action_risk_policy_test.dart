import 'package:eye_tracking_app/core/intent_os/action_risk_policy.dart';
import 'package:eye_tracking_app/core/intent_os/ui_action_type.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('effectiveActionRisk', () {
    test('uses tier baseline when twin risk is lower', () {
      expect(
        effectiveActionRisk(
          actionType: UIActionType.openZone,
          twinRiskScore: 0.0,
        ),
        greaterThan(0.1),
      );
    });

    test('uses twin when higher than tier baseline', () {
      expect(
        effectiveActionRisk(
          actionType: UIActionType.highlight,
          twinRiskScore: 0.9,
        ),
        0.9,
      );
    });
  });

  group('requiresExplicitConfirmation', () {
    test('tap requires confirmation', () {
      expect(requiresExplicitConfirmation(UIActionType.tap), isTrue);
    });

    test('openZone does not require confirmation', () {
      expect(requiresExplicitConfirmation(UIActionType.openZone), isFalse);
    });
  });

  group('requiresExplicitConfirmationByName', () {
    test('purchase and withdraw require confirmation', () {
      expect(requiresExplicitConfirmationByName('purchase'), isTrue);
      expect(requiresExplicitConfirmationByName('withdraw'), isTrue);
    });
  });
}
