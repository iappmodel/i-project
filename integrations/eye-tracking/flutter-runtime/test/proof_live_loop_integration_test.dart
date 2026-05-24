import 'package:eye_tracking_app/core/system.dart';
import 'package:eye_tracking_app/proof/proof_live_loop_bridge.dart';
import 'package:eye_tracking_app/proof/proof_session_context.dart';
import 'package:eye_tracking_app/verification/verification_stability_layer.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pop_core/pop_core.dart';

/// Integration test: live-loop signal path → collector → sealed bus event.
void main() {
  test('ProofLiveLoopBridge produces ProofPacketSealedEvent from live signals',
      () async {
    final pendingEvent = System.bus.proofPacketSealedEvents.first;

    final bridge = ProofLiveLoopBridge();
    final context = ProofSessionContext.start(
      startedAt: DateTime.utc(2026, 5, 20, 18, 4, 12),
    );
    bridge.startSession(context);
    bridge.setForeground(true);

    final startMs = context.startedAt.millisecondsSinceEpoch;
    for (var i = 0; i < 12; i++) {
      bridge.onFrame(
        timestampMs: startMs + (i * 80),
        validFrame: i != 4,
        processedFps: 12.0,
        blinkDetected: i == 6,
        likelyFake: i >= 10,
      );
    }

    bridge.recordDwellSatisfied(
      zone: 'CENTER',
      zoneStartMs: startMs + 118000,
      nowMs: startMs + 126500,
    );
    bridge.onStableGazeTick(
      nowMs: startMs + 120400,
      stable: true,
      zone: 'CENTER',
      confidence: 0.82,
    );
    bridge.onStableGazeTick(
      nowMs: startMs + 125800,
      stable: false,
      zone: 'CENTER',
      confidence: 0.82,
    );

    final vsl = VerificationStabilityLayer();
    for (var i = 0; i < 48; i++) {
      vsl.ingest(
        VerificationSignalSample(
          timestampMs: startMs + (i * 40),
          zone: 'CENTER',
          validFrame: true,
          processedFps: 12.0,
          dwellReady: i > 20,
          blinkDetected: i == 25,
        ),
      );
    }

    final event = bridge.sealAndEmit(
      artifactId: 'PP-LIVE-TEST',
      vslSnapshot: vsl.snapshot,
      endedAt: DateTime.utc(2026, 5, 20, 18, 8, 42),
    );

    final busEvent = await pendingEvent;
    expect(busEvent.artifactId, 'PP-LIVE-TEST');
    expect(event.packet.review.status, ProofReviewStatus.pending);
    expect(event.packet.eyeTracking.dwellEvents, isNotEmpty);
    expect(event.packet.eyeTracking.blinkEvents, isNotEmpty);
    expect(event.packet.eyeTracking.stableGazeWindows, isNotEmpty);
    expect(event.packet.eyeTracking.processedFpsAvg, closeTo(12.0, 0.01));
    expect(
      event.packet.eyeTracking.facePresentRatio,
      closeTo(11 / 12, 0.01),
    );
    expect(event.packet.signals['presence']!.notes, contains('likelyFake=true'));
    expect(bridge.isActive, isFalse);
  });

  test('ProofLiveLoopBridge records unsatisfied zone transition', () {
    final bridge = ProofLiveLoopBridge();
    final context = ProofSessionContext.start(
      startedAt: DateTime.utc(2026, 5, 20, 18, 4, 12),
    );
    bridge.startSession(context);
    final startMs = context.startedAt.millisecondsSinceEpoch;

    bridge.onFrame(
      timestampMs: startMs,
      validFrame: true,
      processedFps: 10,
      blinkDetected: false,
      likelyFake: false,
    );
    bridge.recordZoneTransition(
      fromZone: 'LEFT',
      fromZoneStartMs: startMs + 1000,
      nowMs: startMs + 2500,
      wasSatisfied: false,
    );

    final collector = bridge.emitter.collector!;
    expect(collector.dwellEvents, hasLength(1));
    expect(collector.dwellEvents.first['zone'], 'LEFT');
    expect(collector.dwellEvents.first['satisfied'], isFalse);
  });
}
