import 'package:flutter_test/flutter_test.dart';
import 'package:eye_tracking_app/proof/proof_validator_client.dart';

void main() {
  group('ProofValidationResult', () {
    test('fromJson parses pending hold fields', () {
      final result = ProofValidationResult.fromJson({
        'sessionId': 'sess_test_001',
        'reviewStatus': 'approved',
        'mode': 'pending',
        'hold': {'amount': 100, 'status': 'pending'},
        'holdOutcome': 'created',
      });

      expect(result.sessionId, 'sess_test_001');
      expect(result.reviewStatus, 'approved');
      expect(result.holdAmount, 100);
      expect(result.holdStatus, 'pending');
      expect(result.holdOutcome, 'created');
    });
  });

  group('ProofValidatorClient', () {
    test('isEnabled is false without baseUrl', () {
      final client = ProofValidatorClient(baseUrl: null);
      expect(client.isEnabled, isFalse);
    });

    test('isEnabled is true with baseUrl', () {
      final client = ProofValidatorClient(baseUrl: 'http://127.0.0.1:8787');
      expect(client.isEnabled, isTrue);
    });
  });
}
