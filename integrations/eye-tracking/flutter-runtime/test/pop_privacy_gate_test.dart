import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/proof/pop_privacy_gate.dart';
import 'package:eye_tracking_app/proof/proof_packet_builder.dart';
import 'package:pop_core/pop_core.dart';

import 'proof_test_harness.dart';

void main() {
  group('pop_privacy_gate', () {
    test('flags forbidden biometric keys', () {
      final hits = findForbiddenProofKeys({
        'eyeTracking': {
          'landmarks': [{'x': 1, 'y': 2}],
        },
      });
      expect(hits, contains(r'$.eyeTracking.landmarks'));
    });

    test('ProofPacketBuilder JSON passes privacy gate', () {
      const builder = ProofPacketBuilder();
      final packet = builder.build(
        context: ProofTestHarness.createContext(),
        collector: ProofTestHarness.feedSyntheticSession(),
        vslSnapshot: ProofTestHarness.feedVsl(),
        endedAt: DateTime.utc(2026, 5, 20, 18, 8, 42),
      );
      final json = packet.toJson();
      expect(proofJsonPassesPrivacyGate(json), isTrue);
    });
  });
}
