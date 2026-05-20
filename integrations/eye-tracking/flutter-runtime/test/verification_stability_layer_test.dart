import 'package:eye_tracking_app/verification/verification_stability_layer.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('VerificationStabilityLayer', () {
    test('empty window returns poor band with warming reason', () {
      final layer = VerificationStabilityLayer();
      expect(layer.snapshot.confidenceBand, VerificationConfidenceBand.poor);
      expect(layer.snapshot.reason, 'warming window');
    });

    test('stable valid CENTER samples reach usable or strong', () {
      final layer = VerificationStabilityLayer(windowDurationMs: 2000);
      VerificationStabilitySnapshot last = layer.snapshot;
      for (var i = 0; i < 24; i++) {
        last = layer.ingest(
          VerificationSignalSample(
            timestampMs: 1000 + i * 80,
            zone: 'CENTER',
            gazeX: 0.02,
            normalizedGazeX: 0.5,
            meanEar: 0.22,
            blinkDetected: false,
            validFrame: true,
            processedFps: 7.5,
            dwellReady: i >= 18,
          ),
        );
      }
      expect(last.validFrameRatio, greaterThan(0.9));
      expect(last.stableZone, VerificationZoneState.center);
      expect(
        last.confidenceBand,
        anyOf(
          VerificationConfidenceBand.usable,
          VerificationConfidenceBand.strong,
        ),
      );
    });

    test('invalid-heavy window stays poor or warming', () {
      final layer = VerificationStabilityLayer(windowDurationMs: 2000);
      VerificationStabilitySnapshot last = layer.snapshot;
      for (var i = 0; i < 20; i++) {
        last = layer.ingest(
          VerificationSignalSample(
            timestampMs: 2000 + i * 80,
            validFrame: i.isEven,
            processedFps: 2.0,
            zone: i.isEven ? 'LEFT' : null,
          ),
        );
      }
      expect(
        last.confidenceBand,
        anyOf(
          VerificationConfidenceBand.poor,
          VerificationConfidenceBand.warming,
        ),
      );
      expect(last.validFrameRatio, closeTo(0.5, 0.01));
    });

    test('prunes samples outside window', () {
      final layer = VerificationStabilityLayer(windowDurationMs: 1000);
      layer.ingest(
        VerificationSignalSample(
          timestampMs: 0,
          validFrame: true,
          zone: 'LEFT',
          processedFps: 8,
        ),
      );
      final snap = layer.ingest(
        VerificationSignalSample(
          timestampMs: 2500,
          validFrame: true,
          zone: 'RIGHT',
          processedFps: 8,
        ),
      );
      expect(snap.sampleCount, 1);
    });
  });
}
