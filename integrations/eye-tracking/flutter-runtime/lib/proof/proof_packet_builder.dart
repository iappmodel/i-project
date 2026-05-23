import 'package:pop_core/pop_core.dart';

import '../verification/verification_stability_layer.dart';
import 'proof_session_collector.dart';
import 'proof_session_context.dart';

/// Maps runtime VSL output to proof packet stability snapshot fields.
VerificationStabilityProofSnapshot vslSnapshotToProof(
  VerificationStabilitySnapshot snapshot,
) {
  return VerificationStabilityProofSnapshot(
    stableZone: snapshot.stableZone.label,
    confidenceBand: snapshot.confidenceBand.label,
    validFrameRatio: snapshot.validFrameRatio,
    zoneConsistency: snapshot.zoneConsistency,
    dwellReadiness: snapshot.dwellReadiness,
    blinkConfidence: snapshot.blinkConfidence,
    fpsConfidence: snapshot.fpsConfidence,
    reason: snapshot.reason,
    sampleCount: snapshot.sampleCount,
    windowMs: snapshot.windowMs,
  );
}

/// Builds a sealed [ProofPacketV0] from session context and collected signals.
final class ProofPacketBuilder {
  const ProofPacketBuilder();

  ProofPacketV0 build({
    required ProofSessionContext context,
    required ProofSessionCollector collector,
    required VerificationStabilitySnapshot vslSnapshot,
    required DateTime endedAt,
    double calibrationConfidence = 0.71,
  }) {
    final startedAt = context.startedAt.toUtc();
    final endedUtc = endedAt.toUtc();
    final durationMs = endedUtc.difference(startedAt).inMilliseconds;

    final proofVsl = vslSnapshotToProof(vslSnapshot);
    final faceRatio = collector.facePresentRatio;
    final fgRatio = collector.foregroundRatio;

    final presenceScore = _clamp01(
      faceRatio * 0.7 + fgRatio * 0.3 - (collector.likelyFake ? 0.15 : 0),
    );
    final perceptionScore = _clamp01(
      (vslSnapshot.dwellReadiness * 0.5) +
          (vslSnapshot.zoneConsistency * 0.5),
    );
    final participationScore =
        collector.playbackCompleted ? 0.92 : 0.5;
    final signalIntegrityScore = _clamp01(
      vslSnapshot.validFrameRatio * 0.6 +
          _bandScore(vslSnapshot.confidenceBand) * 0.4,
    );
    final sessionIntegrityScore = _clamp01(fgRatio * 0.88 + 0.12);

    final firstMs = collector.firstInteractionMs ?? 0;
    final lastMs = collector.lastInteractionMs ?? durationMs;
    final cadenceScore = collector.taps > 0 || collector.scrolls > 0
        ? 0.85
        : 0.5;

    return ProofPacketV0(
      sessionId: context.sessionId,
      userId: null,
      localUserRef: context.localUserRef,
      offerId: context.offerId,
      contentId: context.contentId,
      deviceId: null,
      deviceIdHash: context.deviceIdHash,
      startedAt: _isoUtc(startedAt),
      endedAt: _isoUtc(endedUtc),
      durationMs: durationMs,
      appVersion: context.appVersion,
      runtimeVersion: context.runtimeVersion,
      signals: {
        'presence': ProofSignalSummary(
          score: presenceScore,
          confidence: _clamp01(faceRatio),
          notes:
              'facePresentRatio=${faceRatio.toStringAsFixed(2)}; likelyFake=${collector.likelyFake}',
        ),
        'participation': ProofSignalSummary(
          score: participationScore,
          confidence: 0.90,
          notes: 'playbackCompleted=${collector.playbackCompleted}',
        ),
        'perception': ProofSignalSummary(
          score: perceptionScore,
          confidence: _clamp01(vslSnapshot.zoneConsistency),
          notes:
              'centerDwellMet=${collector.dwellEvents.any((e) => e['satisfied'] == true)}',
        ),
        'signalIntegrity': ProofSignalSummary(
          score: signalIntegrityScore,
          confidence: _clamp01(vslSnapshot.validFrameRatio),
          notes: 'band=${vslSnapshot.confidenceBand.label}',
        ),
        'sessionIntegrity': ProofSignalSummary(
          score: sessionIntegrityScore,
          confidence: 0.85,
          notes: 'foregroundRatio=${fgRatio.toStringAsFixed(2)}',
        ),
        'rewardEligibility': ProofSignalSummary(
          score: 0.80,
          confidence: 0.75,
          notes: 'offerRulesMet=pending_review',
        ),
      },
      eyeTracking: EyeTrackingProofSummary(
        facePresentRatio: faceRatio,
        stableGazeWindows: collector.stableGazeWindows,
        dwellEvents: collector.dwellEvents,
        blinkEvents: collector.blinkEvents,
        verificationStabilitySnapshot: proofVsl,
        calibrationConfidence: calibrationConfidence,
        invalidFrameRatio: collector.invalidFrameRatio,
        processedFpsAvg: collector.processedFpsAvg,
      ),
      interaction: InteractionProofSummary(
        taps: collector.taps,
        scrolls: collector.scrolls,
        playbackStarted: collector.playbackStarted,
        playbackCompleted: collector.playbackCompleted,
        foregroundRatio: fgRatio,
        interactionTiming: {
          'firstInteractionMs': firstMs,
          'lastInteractionMs': lastMs,
          'cadenceScore': cadenceScore,
        },
      ),
      review: const ProofReviewResult(
        status: ProofReviewStatus.pending,
        reviewedAt: null,
        reasons: [],
        layerOutcomes: null,
        settlementAmount: null,
      ),
    );
  }

  static double _clamp01(double v) {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }

  static double _bandScore(VerificationConfidenceBand band) {
    switch (band) {
      case VerificationConfidenceBand.poor:
        return 0.25;
      case VerificationConfidenceBand.warming:
        return 0.5;
      case VerificationConfidenceBand.usable:
        return 0.68;
      case VerificationConfidenceBand.strong:
        return 0.9;
    }
  }

  static String _isoUtc(DateTime dt) {
    return dt.toUtc().toIso8601String().replaceFirst(
          RegExp(r'\.\d{3}'),
          '.000',
        );
  }
}
