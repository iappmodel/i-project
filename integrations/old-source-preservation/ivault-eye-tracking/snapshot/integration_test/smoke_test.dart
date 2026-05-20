import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:eye_tracking_app/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  // Real camera/plugin wiring is device-lab/manual scope for this project.
  const runIntegrationInCi = bool.fromEnvironment(
    'RUN_EYE_APP_INTEGRATION_TESTS',
    defaultValue: false,
  );

  testWidgets(
    'smoke: app root pumps',
    (tester) async {
      await tester.pumpWidget(const EyeTrackingApp());
      await tester.pump();
      expect(find.byType(EyeTrackingApp), findsOneWidget);
    },
    skip: !runIntegrationInCi,
  );
}
