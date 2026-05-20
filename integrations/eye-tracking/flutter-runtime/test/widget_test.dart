import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/main.dart';

void main() {
  testWidgets('App boots with camera preview shell', (WidgetTester tester) async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await tester.pumpWidget(const EyeTrackingApp());
    await tester.pump();
    expect(find.byType(EyeTrackingApp), findsOneWidget);
  });
}
