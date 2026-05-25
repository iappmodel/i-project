/// Proof Packet Schema v0 — plain data types only.
///
/// Canonical contract for delayed POPS validation.
/// See integrations/pop-core/contracts/proof-packet-v0/PROOF_PACKET_SCHEMA_V0.md
library;

/// Post-emit review outcome (set by reviewer, not device).
enum ProofReviewStatus {
  pending,
  approved,
  partial,
  rejected,
  escalated;

  String get wireName => name;
}

/// Summary for one POPS signal layer (presence, participation, etc.).
final class ProofSignalSummary {
  const ProofSignalSummary({
    required this.score,
    required this.confidence,
    this.notes,
  });

  final double score;
  final double confidence;
  final String? notes;

  Map<String, dynamic> toJson() => {
        'score': score,
        'confidence': confidence,
        if (notes != null) 'notes': notes,
      };
}

/// Rolling stability output embedded in eye-tracking proof (maps to VSL snapshot).
final class VerificationStabilityProofSnapshot {
  const VerificationStabilityProofSnapshot({
    required this.stableZone,
    required this.confidenceBand,
    required this.validFrameRatio,
    required this.zoneConsistency,
    required this.dwellReadiness,
    required this.blinkConfidence,
    required this.fpsConfidence,
    required this.reason,
    required this.sampleCount,
    required this.windowMs,
  });

  final String stableZone;
  final String confidenceBand;
  final double validFrameRatio;
  final double zoneConsistency;
  final double dwellReadiness;
  final double blinkConfidence;
  final double fpsConfidence;
  final String reason;
  final int sampleCount;
  final int windowMs;

  Map<String, dynamic> toJson() => {
        'stableZone': stableZone,
        'confidenceBand': confidenceBand,
        'validFrameRatio': validFrameRatio,
        'zoneConsistency': zoneConsistency,
        'dwellReadiness': dwellReadiness,
        'blinkConfidence': blinkConfidence,
        'fpsConfidence': fpsConfidence,
        'reason': reason,
        'sampleCount': sampleCount,
        'windowMs': windowMs,
      };
}

/// Derived eye-tracking metrics (no raw video).
final class EyeTrackingProofSummary {
  const EyeTrackingProofSummary({
    required this.facePresentRatio,
    required this.stableGazeWindows,
    required this.dwellEvents,
    required this.blinkEvents,
    required this.verificationStabilitySnapshot,
    required this.calibrationConfidence,
    required this.invalidFrameRatio,
    required this.processedFpsAvg,
  });

  final double facePresentRatio;
  final List<Map<String, dynamic>> stableGazeWindows;
  final List<Map<String, dynamic>> dwellEvents;
  final List<Map<String, dynamic>> blinkEvents;
  final VerificationStabilityProofSnapshot verificationStabilitySnapshot;
  final double calibrationConfidence;
  final double invalidFrameRatio;
  final double processedFpsAvg;

  Map<String, dynamic> toJson() => {
        'facePresentRatio': facePresentRatio,
        'stableGazeWindows': stableGazeWindows,
        'dwellEvents': dwellEvents,
        'blinkEvents': blinkEvents,
        'verificationStabilitySnapshot':
            verificationStabilitySnapshot.toJson(),
        'calibrationConfidence': calibrationConfidence,
        'invalidFrameRatio': invalidFrameRatio,
        'processedFpsAvg': processedFpsAvg,
      };
}

/// Touch, playback, and foreground interaction proof.
final class InteractionProofSummary {
  const InteractionProofSummary({
    required this.taps,
    required this.scrolls,
    required this.playbackStarted,
    required this.playbackCompleted,
    required this.foregroundRatio,
    required this.interactionTiming,
  });

  final int taps;
  final int scrolls;
  final bool playbackStarted;
  final bool playbackCompleted;
  final double foregroundRatio;
  final Map<String, dynamic> interactionTiming;

  Map<String, dynamic> toJson() => {
        'taps': taps,
        'scrolls': scrolls,
        'playbackStarted': playbackStarted,
        'playbackCompleted': playbackCompleted,
        'foregroundRatio': foregroundRatio,
        'interactionTiming': interactionTiming,
      };
}

/// Review block on a proof packet.
final class ProofReviewResult {
  const ProofReviewResult({
    required this.status,
    this.reviewedAt,
    this.reasons = const [],
    this.layerOutcomes,
    this.settlementAmount,
  });

  final ProofReviewStatus status;
  final String? reviewedAt;
  final List<String> reasons;
  final Map<String, String>? layerOutcomes;
  final double? settlementAmount;

  Map<String, dynamic> toJson() => {
        'status': status.wireName,
        'reviewedAt': reviewedAt,
        'reasons': reasons,
        if (layerOutcomes != null) 'layerOutcomes': layerOutcomes,
        if (settlementAmount != null) 'settlementAmount': settlementAmount,
      };
}

/// Top-level Proof Packet v0.
final class ProofPacketV0 {
  static const String packetVersion = '0';

  const ProofPacketV0({
    required this.sessionId,
    required this.localUserRef,
    required this.offerId,
    required this.contentId,
    required this.deviceIdHash,
    required this.startedAt,
    required this.endedAt,
    required this.durationMs,
    required this.appVersion,
    required this.runtimeVersion,
    required this.signals,
    required this.eyeTracking,
    required this.interaction,
    required this.review,
    this.userId,
    this.deviceId,
  });

  final String sessionId;
  final String? userId;
  final String localUserRef;
  final String offerId;
  final String contentId;
  final String? deviceId;
  final String deviceIdHash;
  final String startedAt;
  final String endedAt;
  final int durationMs;
  final String appVersion;
  final String runtimeVersion;
  final Map<String, ProofSignalSummary> signals;
  final EyeTrackingProofSummary eyeTracking;
  final InteractionProofSummary interaction;
  final ProofReviewResult review;

  Map<String, dynamic> toJson() => {
        'packetVersion': packetVersion,
        'sessionId': sessionId,
        'userId': userId,
        'localUserRef': localUserRef,
        'offerId': offerId,
        'contentId': contentId,
        'deviceId': deviceId,
        'deviceIdHash': deviceIdHash,
        'startedAt': startedAt,
        'endedAt': endedAt,
        'durationMs': durationMs,
        'appVersion': appVersion,
        'runtimeVersion': runtimeVersion,
        'signals': signals.map((k, v) => MapEntry(k, v.toJson())),
        'eyeTracking': eyeTracking.toJson(),
        'interaction': interaction.toJson(),
        'review': review.toJson(),
      };
}
