/// Canonical proof-of-attention record. Rewards must not be derived from raw
/// gaze/frame events alone; seal a session via
/// `AttentionVerificationEngine.buildVerificationResult`.
final class AttentionVerificationResult {
  const AttentionVerificationResult({
    required this.sessionId,
    required this.userId,
    this.campaignId,
    required this.contentId,
    required this.verified,
    required this.attentionScore,
    required this.qualityScore,
    required this.fraudRisk,
    required this.watchedMs,
    required this.verifiedMs,
    required this.requiredMs,
    required this.gazeValidRatio,
    required this.facePresentRatio,
    required this.blinkNaturalnessScore,
    required this.interactionScore,
    this.failureReason,
    required this.createdAt,
  });

  final String sessionId;
  final String userId;
  final String? campaignId;
  final String contentId;

  final bool verified;
  /// 0.0–1.0 aggregate attention signal.
  final double attentionScore;
  /// 0.0–1.0 tracking / confidence quality.
  final double qualityScore;
  /// 0.0–1.0 higher means more suspicious.
  final double fraudRisk;

  /// Wall-clock span covered by the verification window.
  final int watchedMs;
  /// Time counted as attentive / fixating toward the requirement.
  final int verifiedMs;
  final int requiredMs;

  final double gazeValidRatio;
  final double facePresentRatio;
  final double blinkNaturalnessScore;
  final double interactionScore;

  final String? failureReason;

  /// ISO-8601 timestamp when this result was sealed.
  final String createdAt;

  AttentionVerificationResult copyWith({
    String? sessionId,
    String? userId,
    String? campaignId,
    String? contentId,
    bool? verified,
    double? attentionScore,
    double? qualityScore,
    double? fraudRisk,
    int? watchedMs,
    int? verifiedMs,
    int? requiredMs,
    double? gazeValidRatio,
    double? facePresentRatio,
    double? blinkNaturalnessScore,
    double? interactionScore,
    String? failureReason,
    String? createdAt,
  }) {
    return AttentionVerificationResult(
      sessionId: sessionId ?? this.sessionId,
      userId: userId ?? this.userId,
      campaignId: campaignId ?? this.campaignId,
      contentId: contentId ?? this.contentId,
      verified: verified ?? this.verified,
      attentionScore: attentionScore ?? this.attentionScore,
      qualityScore: qualityScore ?? this.qualityScore,
      fraudRisk: fraudRisk ?? this.fraudRisk,
      watchedMs: watchedMs ?? this.watchedMs,
      verifiedMs: verifiedMs ?? this.verifiedMs,
      requiredMs: requiredMs ?? this.requiredMs,
      gazeValidRatio: gazeValidRatio ?? this.gazeValidRatio,
      facePresentRatio: facePresentRatio ?? this.facePresentRatio,
      blinkNaturalnessScore:
          blinkNaturalnessScore ?? this.blinkNaturalnessScore,
      interactionScore: interactionScore ?? this.interactionScore,
      failureReason: failureReason ?? this.failureReason,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
