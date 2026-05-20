import 'package:eye_tracking_app/core/intent_os/action_type_risk.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('riskOf', () {
    test('known action types', () {
      expect(riskOf('tap'), 0.1);
      expect(riskOf('scroll'), 0.05);
      expect(riskOf('type'), 0.2);
      expect(riskOf('open_external'), 0.7);
      expect(riskOf('purchase'), 0.95);
    });

    test('unknown → 1.0', () {
      expect(riskOf(''), 1.0);
      expect(riskOf('unknown'), 1.0);
    });
  });
}
