import 'pops_models.dart';

/// Computes structured confidence/fraud scores from multimodal session signals.
final class PopsScoringService {
  const PopsScoringService();

  PopsVerificationScore score(PopsSignalSnapshot s) {
    final basePresence = _avg(<double>[
      s.screenActive ? 1.0 : 0.0,
      s.inForeground ? 1.0 : 0.0,
      s.contentProgressRatio,
      s.deviceIntegrityScore,
      s.accountContinuityScore,
    ]);
    final attention = _avg(<double>[
      s.touchRhythmScore,
      s.scrollRhythmScore,
      s.pauseResumeScore,
      if (s.visualPresenceScore != null) s.visualPresenceScore!,
    ]);
    final intent = _avg(<double>[
      s.contentProgressRatio,
      s.campaignRequirementScore,
      s.trustTierScore,
      s.eligibilityScore,
    ]);
    final continuity = _avg(<double>[
      s.accountContinuityScore,
      s.pauseResumeScore,
      s.orientationStable ? 1.0 : 0.4,
      s.deviceMotionScore,
    ]);

    final fraudRisk = (1.0 -
            _avg(<double>[
              s.deviceIntegrityScore,
              s.accountContinuityScore,
              s.touchRhythmScore,
              s.scrollRhythmScore,
              if (s.ambienceScore != null) s.ambienceScore!,
            ]))
        .clamp(0.0, 1.0);

    return PopsVerificationScore(
      presenceConfidence: basePresence.clamp(0.0, 1.0),
      attentionConfidence: attention.clamp(0.0, 1.0),
      intentConfidence: intent.clamp(0.0, 1.0),
      continuityConfidence: continuity.clamp(0.0, 1.0),
      fraudRisk: fraudRisk,
    );
  }

  double _avg(List<double> values) {
    if (values.isEmpty) return 0.0;
    final sum = values.fold<double>(0.0, (a, b) => a + b.clamp(0.0, 1.0));
    return sum / values.length;
  }
}
