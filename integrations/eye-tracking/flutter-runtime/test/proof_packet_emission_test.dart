import 'dart:convert';
import 'dart:io';

import 'package:eye_tracking_app/core/system.dart';
import 'package:eye_tracking_app/proof/proof_packet_emitter.dart';
import 'package:pop_core/pop_core.dart';
import 'package:flutter_test/flutter_test.dart';

import 'proof_test_harness.dart';

void main() {
  test('sealAndEmit returns PP-000001 with pending review', () async {
    final pendingEvent = System.bus.proofPacketSealedEvents.first;

    final emitter = ProofPacketEmitter();
    final context = ProofTestHarness.createContext();
    emitter.startSession(context);

    final collector = emitter.collector!;
    final startMs = context.startedAt.millisecondsSinceEpoch;
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

    final event = emitter.sealAndEmit(
      artifactId: 'PP-000001',
      vslSnapshot: ProofTestHarness.feedVsl(),
      endedAt: DateTime.utc(2026, 5, 20, 18, 8, 42),
    );

    final busEvent = await pendingEvent;
    expect(busEvent.artifactId, 'PP-000001');
    expect(event.packet.review.status, ProofReviewStatus.pending);

    final json = event.packet.toJson();
    expect(json['packetVersion'], '0');
    expect((json['review'] as Map)['status'], 'pending');

    final fixtureFile = File(_fixturePath());
    expect(fixtureFile.existsSync(), isTrue);
    final golden =
        jsonDecode(fixtureFile.readAsStringSync()) as Map<String, dynamic>;
    expect(json, golden);
  });
}

String _fixturePath() {
  return Platform.environment['PP_000001_FIXTURE'] ??
      '../../pop-core/fixtures/PP-000001.json';
}
