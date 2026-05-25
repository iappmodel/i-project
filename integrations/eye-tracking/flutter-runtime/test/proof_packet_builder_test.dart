import 'package:eye_tracking_app/proof/proof_packet_builder.dart';
import 'package:pop_core/pop_core.dart';
import 'package:flutter_test/flutter_test.dart';

import 'proof_test_harness.dart';

void main() {
  test('ProofPacketBuilder produces MVP subset with pending review', () {
    final context = ProofTestHarness.createContext();
    final collector = ProofTestHarness.feedSyntheticSession();
    final vsl = ProofTestHarness.feedVsl();

    const builder = ProofPacketBuilder();
    final packet = builder.build(
      context: context,
      collector: collector,
      vslSnapshot: vsl,
      endedAt: DateTime.utc(2026, 5, 20, 18, 8, 42),
    );

    expect(packet.review.status, ProofReviewStatus.pending);
    expect(ProofPacketV0.packetVersion, '0');
    expect(packet.startedAt, ProofTestHarness.sessionStart);
    expect(packet.endedAt, ProofTestHarness.sessionEnd);
    expect(packet.durationMs, 270000);
    expect(packet.signals.containsKey('presence'), isTrue);
    expect(packet.signals.containsKey('perception'), isTrue);
    expect(packet.eyeTracking.facePresentRatio, closeTo(0.9, 0.001));
    expect(packet.interaction.playbackCompleted, isTrue);
    expect(packet.interaction.foregroundRatio, closeTo(1.0, 0.001));
  });
}
