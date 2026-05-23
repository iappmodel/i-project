import 'package:eye_tracking_app/proof/proof_session_collector.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ProofSessionCollector', () {
    test('computes facePresentRatio from valid frames', () {
      final collector = ProofSessionCollector()..reset(sessionStartMs: 1000);
      for (var i = 0; i < 10; i++) {
        collector.onFrame(
          timestampMs: 1000 + i * 100,
          validFrame: i != 3,
          foreground: true,
          processedFps: 8,
          blinkDetected: false,
          likelyFake: false,
        );
      }
      expect(collector.facePresentRatio, closeTo(0.9, 0.001));
      expect(collector.invalidFrameRatio, closeTo(0.1, 0.001));
      expect(collector.processedFpsAvg, closeTo(8.0, 0.001));
    });

    test('debounces blink events', () {
      final collector = ProofSessionCollector()..reset(sessionStartMs: 0);
      collector.onFrame(
        timestampMs: 100,
        validFrame: true,
        foreground: true,
        processedFps: 7,
        blinkDetected: true,
        likelyFake: false,
      );
      collector.onFrame(
        timestampMs: 200,
        validFrame: true,
        foreground: true,
        processedFps: 7,
        blinkDetected: true,
        likelyFake: false,
      );
      expect(collector.blinkEvents.length, 1);
    });

    test('tracks interaction timing relative to session start', () {
      final collector = ProofSessionCollector()..reset(sessionStartMs: 1000);
      collector.onTap(timestampMs: 5500);
      expect(collector.firstInteractionMs, 4500);
      expect(collector.lastInteractionMs, 4500);
    });
  });
}
