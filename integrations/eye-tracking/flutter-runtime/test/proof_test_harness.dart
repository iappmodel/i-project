import 'package:eye_tracking_app/proof/proof_packet_builder.dart';
import 'package:eye_tracking_app/proof/proof_session_collector.dart';
import 'package:eye_tracking_app/proof/proof_session_context.dart';
import 'package:eye_tracking_app/verification/verification_stability_layer.dart';
import 'package:pop_core/pop_core.dart';

/// Deterministic synthetic session used to produce PP-000001.
class ProofTestHarness {
  static const sessionStart = '2026-05-20T18:04:12.000Z';
  static const sessionEnd = '2026-05-20T18:08:42.000Z';

  static ProofSessionContext createContext() {
    return ProofSessionContext.start(
      sessionId: 'sess_8f3c2a1b-4e5d-6a7b-8c9d-0e1f2a3b4c5d',
      startedAt: DateTime.utc(2026, 5, 20, 18, 4, 12),
    );
  }

  static ProofSessionCollector feedSyntheticSession() {
    final context = createContext();
    final startMs = context.startedAt.millisecondsSinceEpoch;
    final collector = ProofSessionCollector()..reset(sessionStartMs: startMs);

    for (var i = 0; i < 10; i++) {
      collector.onFrame(
        timestampMs: startMs + (i * 200),
        validFrame: i != 3,
        foreground: true,
        processedFps: 7.8,
        blinkDetected: i == 5,
        likelyFake: false,
      );
    }

    collector.recordDwell(
      zone: 'CENTER',
      startedAtMs: 118000,
      endedAtMs: 126500,
      satisfied: true,
    );
    collector.recordStableGazeWindow(
      startedAtMs: 120400,
      endedAtMs: 125800,
      zone: 'CENTER',
      confidence: 0.82,
    );
    collector.onTap(timestampMs: startMs + 4500);
    collector.onTap(timestampMs: startMs + 268000);
    collector.markPlaybackCompleted();

    return collector;
  }

  static VerificationStabilitySnapshot feedVsl() {
    final layer = VerificationStabilityLayer();
    final baseMs = DateTime.utc(2026, 5, 20, 18, 4, 12).millisecondsSinceEpoch;
    for (var i = 0; i < 48; i++) {
      layer.ingest(
        VerificationSignalSample(
          timestampMs: baseMs + (i * 40),
          zone: 'CENTER',
          validFrame: true,
          processedFps: 7.8,
          dwellReady: i > 20,
          blinkDetected: i == 25 || i == 40,
        ),
      );
    }
    return layer.snapshot;
  }

  static ProofPacketV0 buildPp000001Packet() {
    const builder = ProofPacketBuilder();
    return builder.build(
      context: createContext(),
      collector: feedSyntheticSession(),
      vslSnapshot: feedVsl(),
      endedAt: DateTime.utc(2026, 5, 20, 18, 8, 42),
    );
  }
}
