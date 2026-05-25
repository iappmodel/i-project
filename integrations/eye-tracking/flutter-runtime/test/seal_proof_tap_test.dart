import 'package:eye_tracking_app/proof/proof_live_loop_bridge.dart';
import 'package:eye_tracking_app/proof/proof_session_context.dart';
import 'package:eye_tracking_app/verification/verification_stability_layer.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Mirrors the Seal Proof debug tap path from [main.dart] for widget-level coverage.
void main() {
  testWidgets('Seal Proof tap always logs tap and sealed result when session active',
      (WidgetTester tester) async {
    final logs = <String>[];
    final bridge = ProofLiveLoopBridge();
    bridge.startSession(
      ProofSessionContext.start(startedAt: DateTime.utc(2026, 5, 24, 12)),
    );
    final startMs = DateTime.utc(2026, 5, 24, 12).millisecondsSinceEpoch;
    for (var i = 0; i < 4; i++) {
      bridge.onFrame(
        timestampMs: startMs + (i * 80),
        validFrame: true,
        processedFps: 12,
        blinkDetected: false,
        likelyFake: false,
      );
    }

    final vsl = VerificationStabilityLayer();
    for (var i = 0; i < 4; i++) {
      vsl.ingest(
        VerificationSignalSample(
          timestampMs: i * 80,
          zone: 'CENTER',
          validFrame: true,
          processedFps: 12,
          dwellReady: false,
          blinkDetected: false,
        ),
      );
    }

    Future<void> onSealProofTap() async {
      logs.add('PROOF_SEAL_TAP');
      if (!bridge.isActive) {
        logs.add('PROOF_SEAL_FAILED: no active proof session');
        return;
      }
      try {
        final event = bridge.sealAndEmit(
          artifactId: 'PP-LIVE-TEST',
          vslSnapshot: vsl.snapshot,
        );
        logs.add('PROOF_SEALED: ${event.artifactId} session=${event.sessionId}');
        bridge.startSession(
          ProofSessionContext.start(startedAt: DateTime.utc(2026, 5, 24, 13)),
        );
      } catch (e) {
        logs.add('PROOF_SEAL_FAILED: $e');
      }
    }

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: TextButton(
              onPressed: onSealProofTap,
              child: const Text('Seal Proof'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Seal Proof'));
    await tester.pump();

    expect(logs.first, 'PROOF_SEAL_TAP');
    expect(logs.any((l) => l.startsWith('PROOF_SEALED:')), isTrue);
  });

  testWidgets('Seal Proof tap logs failure when no active session',
      (WidgetTester tester) async {
    final logs = <String>[];
    final bridge = ProofLiveLoopBridge();

    Future<void> onSealProofTap() async {
      logs.add('PROOF_SEAL_TAP');
      if (!bridge.isActive) {
        logs.add('PROOF_SEAL_FAILED: no active proof session');
        return;
      }
    }

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TextButton(
            onPressed: onSealProofTap,
            child: const Text('Seal Proof'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Seal Proof'));
    await tester.pump();

    expect(logs, [
      'PROOF_SEAL_TAP',
      'PROOF_SEAL_FAILED: no active proof session',
    ]);
  });
}
