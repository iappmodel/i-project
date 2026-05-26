import 'package:flutter_test/flutter_test.dart';
import 'package:eye_tracking_app/proof/wallet_deep_link.dart';

void main() {
  group('WalletDeepLink', () {
    test('build appends proofSession query param', () {
      final url = WalletDeepLink.build(
        sessionId: 'sess_abc123',
        baseUrl: 'http://10.0.2.2:5173',
      );
      expect(url, 'http://10.0.2.2:5173?proofSession=sess_abc123');
    });

    test('build returns null without base URL', () {
      expect(
        WalletDeepLink.build(sessionId: 'sess_x', baseUrl: null),
        isNull,
      );
    });
  });
}
