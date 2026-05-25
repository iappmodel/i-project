import 'package:pop_core/pop_core.dart';
import 'package:test/test.dart';

void main() {
  test('ProofPacketV0 serializes packetVersion 0 and pending review', () {
    const packet = ProofPacketV0(
      sessionId: 'sess_test',
      localUserRef: 'demo-user-001',
      offerId: 'offer-1',
      contentId: 'content-1',
      deviceIdHash: 'sha256:test',
      startedAt: '2026-05-20T18:04:12.000Z',
      endedAt: '2026-05-20T18:08:42.000Z',
      durationMs: 270000,
      appVersion: '1.0.0+1',
      runtimeVersion: 'flutter-runtime@archive-promoted',
      signals: {
        'presence': ProofSignalSummary(score: 0.8, confidence: 0.7),
      },
      eyeTracking: EyeTrackingProofSummary(
        facePresentRatio: 0.9,
        stableGazeWindows: [],
        dwellEvents: [],
        blinkEvents: [],
        verificationStabilitySnapshot: VerificationStabilityProofSnapshot(
          stableZone: 'CENTER',
          confidenceBand: 'USABLE',
          validFrameRatio: 0.76,
          zoneConsistency: 0.81,
          dwellReadiness: 0.88,
          blinkConfidence: 0.72,
          fpsConfidence: 0.65,
          reason: 'usable',
          sampleCount: 48,
          windowMs: 2000,
        ),
        calibrationConfidence: 0.71,
        invalidFrameRatio: 0.24,
        processedFpsAvg: 7.8,
      ),
      interaction: InteractionProofSummary(
        taps: 0,
        scrolls: 0,
        playbackStarted: true,
        playbackCompleted: true,
        foregroundRatio: 0.94,
        interactionTiming: {
          'firstInteractionMs': 0,
          'lastInteractionMs': 0,
          'cadenceScore': 0.0,
        },
      ),
      review: ProofReviewResult(status: ProofReviewStatus.pending),
    );

    final json = packet.toJson();
    expect(json['packetVersion'], '0');
    expect(json['review'], {'status': 'pending', 'reviewedAt': null, 'reasons': []});
    expect(json['signals'], isA<Map>());
  });
}
