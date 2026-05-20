import 'dart:math' as math;

enum SurfaceType { feed, earn }

enum SessionPhase { exploration, engagement, fatigue }

enum CandidateKind { organic, campaign }

enum AttentionState { lowAttention, active, highFocus }

enum VerificationStrictness { low, medium, high }

final class UserVector {
  const UserVector({
    required this.interests,
    this.interestsVector = const <String, double>{},
    required this.attentionProfileSeconds,
    required this.trustScore,
    required this.earningBehavior,
    this.attentionScoreLive = 0.5,
    this.sessionDepth = 1,
    this.earningVelocity = 0.0,
    required this.fatigueLevel,
    required this.location,
    required this.device,
    this.pastAttentionQuality,
    this.fraudRiskUser = 0.0,
  });

  final Set<String> interests;
  final Map<String, double> interestsVector;
  final double attentionProfileSeconds;
  final double trustScore;
  final double earningBehavior;
  final double attentionScoreLive;
  final int sessionDepth;
  final double earningVelocity;
  final double fatigueLevel;
  final String location;
  final String device;

  /// Historical attention quality in \[0, 1\]. Defaults to [attentionScoreLive].
  final double? pastAttentionQuality;

  /// User-side fraud / abuse risk in \[0, 1\]; increases [MatchResult.fraudRiskPenalty].
  final double fraudRiskUser;

  double get effectivePastAttentionQuality =>
      pastAttentionQuality ?? attentionScoreLive.clamp(0.0, 1.0).toDouble();
}

final class CampaignVector {
  const CampaignVector({
    required this.id,
    required this.targetAudience,
    this.targetAudienceVector = const <String, double>{},
    required this.payoutValueUsd,
    required this.attentionRequirementSeconds,
    required this.trustRequirement,
    required this.urgency,
    required this.remainingBudgetUsd,
    this.priorityWeight = 1.0,
    this.demandMultiplier = 1.0,
    this.underperforming = false,
    this.supplyPressure = 0.0,
    this.maxExposuresPerUser = 3,
    this.allowedLocations = const <String>{},
    this.preferredDevices = const <String>{},
    this.fraudRiskCampaign = 0.0,
  });

  final String id;
  final Set<String> targetAudience;
  final Map<String, double> targetAudienceVector;
  final double payoutValueUsd;
  final double attentionRequirementSeconds;
  final double trustRequirement;
  final double urgency;
  final double remainingBudgetUsd;
  final double priorityWeight;
  final double demandMultiplier;
  final bool underperforming;
  final double supplyPressure;
  final int maxExposuresPerUser;
  final Set<String> allowedLocations;

  /// Empty = all devices acceptable; otherwise user [UserVector.device] must match (case-insensitive).
  final Set<String> preferredDevices;

  /// Campaign-side fraud / brand-safety risk in \[0, 1\].
  final double fraudRiskCampaign;
}

final class SessionContext {
  const SessionContext({
    required this.sessionTimeSeconds,
    required this.scrollVelocity,
    required this.lastActions,
    required this.surface,
    required this.timeOfDayHour,
    this.attentionScore = 0.5,
    this.attentionIntent = 'passive',
    this.predictedAttentionDurationMs = 1500,
    this.localAvailability = 1.0,
  });

  final int sessionTimeSeconds;
  final double scrollVelocity;
  final List<String> lastActions;
  final SurfaceType surface;
  final int timeOfDayHour;
  final double attentionScore;
  final String attentionIntent;
  final int predictedAttentionDurationMs;

  /// Local inventory / slot availability in \[0, 1\]; 1 = fully available.
  final double localAvailability;
}

final class CandidateContent {
  const CandidateContent({
    required this.id,
    required this.kind,
    this.campaign,
    this.topics = const <String>{},
    this.predictedEngagement = 0.5,
    this.predictedAttentionSeconds = 6.0,
    this.creatorScore = 0.5,
  });

  final String id;
  final CandidateKind kind;
  final CampaignVector? campaign;
  final Set<String> topics;
  final double predictedEngagement;
  final double predictedAttentionSeconds;
  final double creatorScore;
}

final class MatchingRequest {
  const MatchingRequest({
    required this.user,
    required this.context,
    required this.candidates,
    required this.userExposureByCampaign,
    this.completedCampaignIds = const <String>{},
  });

  final UserVector user;
  final SessionContext context;
  final List<CandidateContent> candidates;
  final Map<String, int> userExposureByCampaign;
  final Set<String> completedCampaignIds;
}

final class MatchResult {
  const MatchResult({
    required this.candidate,
    required this.matchScore,
    required this.relevanceScore,
    required this.expectedAttentionScore,
    required this.campaignBidWeight,
    required this.trustEligibility,
    required this.localContextBoost,
    required this.fraudRiskPenalty,
    required this.fatiguePenalty,
    this.attentionFitScore = 0.0,
  });

  final CandidateContent candidate;

  /// `relevanceScore + expectedAttentionScore + campaignBidWeight + trustEligibility + localContextBoost - fraudRiskPenalty - fatiguePenalty`, then scaled by session surface/phase weight and campaign [CampaignVector.priorityWeight] for ranking.
  final double matchScore;
  final double relevanceScore;
  final double expectedAttentionScore;
  final double campaignBidWeight;
  final double trustEligibility;
  final double localContextBoost;
  final double fraudRiskPenalty;
  final double fatiguePenalty;

  /// Raw user–campaign attention seconds fit in \[0, 1\]; folded into [expectedAttentionScore].
  final double attentionFitScore;
}

final class AllocationDecision {
  const AllocationDecision({
    required this.nextItem,
    required this.matchScore,
    required this.finalPayoutUsd,
    required this.verificationStrictness,
    required this.attentionState,
  });

  final CandidateContent? nextItem;
  final double matchScore;
  final double finalPayoutUsd;
  final VerificationStrictness verificationStrictness;
  final AttentionState attentionState;
}

final class MatchingEngine {
  MatchingEngine({
    this.feedCampaignMinRatio = 0.20,
    this.feedCampaignMaxRatio = 0.35,
  });

  final double feedCampaignMinRatio;
  final double feedCampaignMaxRatio;

  SessionPhase phaseForSession(int sessionTimeSeconds) {
    if (sessionTimeSeconds < 60) return SessionPhase.exploration;
    if (sessionTimeSeconds < 300) return SessionPhase.engagement;
    return SessionPhase.fatigue;
  }

  List<MatchResult> rank(MatchingRequest request) {
    final phase = phaseForSession(request.context.sessionTimeSeconds);
    final filtered = _hardFilter(request);
    final maxBidUsd = filtered.fold<double>(
      0.0,
      (m, c) {
        if (c.kind != CandidateKind.campaign || c.campaign == null) return m;
        return math.max(m, c.campaign!.payoutValueUsd);
      },
    );
    final scored = filtered.map((candidate) {
      if (candidate.kind == CandidateKind.organic) {
        final relevance = _setSimilarity(request.user.interests, candidate.topics);
        final attentionFit = _attentionFitScore(
          userAttentionSeconds: math.max(
            request.user.attentionProfileSeconds,
            request.user.attentionScoreLive * 30.0,
          ),
          campaignAttentionSeconds: math.max(1.0, candidate.predictedAttentionSeconds),
        );
        final expectedAttention = _expectedAttentionScore(
          attentionFit: attentionFit,
          pastAttentionQuality: request.user.effectivePastAttentionQuality,
          predictedEngagement: candidate.predictedEngagement,
          sessionAttentionBoost: _realtimeAttentionBoost(request.context),
        );
        final fatigue = _fatiguePenalty(0, request.user.fatigueLevel);
        final fraudPenalty = _fraudRiskPenalty(
          userRisk: request.user.fraudRiskUser,
          campaignRisk: 0.0,
        );
        final localBoost = _organicLocalBoost(request.context, candidate.creatorScore);
        final base = relevance +
            expectedAttention +
            0.0 + // no campaign bid
            0.0 + // no campaign trust eligibility term
            localBoost -
            fraudPenalty -
            fatigue;
        final weight = _surfaceWeight(
          surface: request.context.surface,
          phase: phase,
          earningBehavior: request.user.earningBehavior,
        );
        return MatchResult(
          candidate: candidate,
          matchScore: base * weight,
          relevanceScore: relevance,
          expectedAttentionScore: expectedAttention,
          campaignBidWeight: 0.0,
          trustEligibility: 0.0,
          localContextBoost: localBoost,
          fraudRiskPenalty: fraudPenalty,
          fatiguePenalty: fatigue,
          attentionFitScore: attentionFit,
        );
      }
      final campaign = candidate.campaign!;
      final relevance = _relevanceScore(
        userInterests: request.user.interests,
        campaignTargets: campaign.targetAudience,
        userVector: request.user.interestsVector,
        campaignVector: campaign.targetAudienceVector,
      );
      final attentionFit = _attentionFitScore(
        userAttentionSeconds: math.max(
          request.user.attentionProfileSeconds,
          request.user.attentionScoreLive * 30.0,
        ),
        campaignAttentionSeconds: math.max(
          campaign.attentionRequirementSeconds,
          candidate.predictedAttentionSeconds,
        ),
      );
      final expectedAttention = _expectedAttentionScore(
        attentionFit: attentionFit,
        pastAttentionQuality: request.user.effectivePastAttentionQuality,
        predictedEngagement: candidate.predictedEngagement,
        sessionAttentionBoost: _realtimeAttentionBoost(request.context),
      );
      final bidWeight = _campaignBidWeight(
        payoutUsd: campaign.payoutValueUsd,
        maxPayoutInBatch: maxBidUsd,
      );
      final trustEligibility = _trustEligibility(
        userTrustScore: request.user.trustScore,
        campaignTrustRequirement: campaign.trustRequirement,
      );
      final localBoost = _localContextBoost(
        user: request.user,
        campaign: campaign,
        context: request.context,
        creatorScore: candidate.creatorScore,
      );
      final fatigue = _fatiguePenalty(
        request.userExposureByCampaign[campaign.id] ?? 0,
        request.user.fatigueLevel,
      );
      final fraudPenalty = _fraudRiskPenalty(
        userRisk: request.user.fraudRiskUser,
        campaignRisk: campaign.fraudRiskCampaign,
      );
      final weight = _surfaceWeight(
        surface: request.context.surface,
        phase: phase,
        earningBehavior: request.user.earningBehavior,
      );
      final base = relevance +
          expectedAttention +
          bidWeight +
          trustEligibility +
          localBoost -
          fraudPenalty -
          fatigue;
      final matchScore = base * weight * campaign.priorityWeight;
      return MatchResult(
        candidate: candidate,
        matchScore: matchScore,
        relevanceScore: relevance,
        expectedAttentionScore: expectedAttention,
        campaignBidWeight: bidWeight,
        trustEligibility: trustEligibility,
        localContextBoost: localBoost,
        fraudRiskPenalty: fraudPenalty,
        fatiguePenalty: fatigue,
        attentionFitScore: attentionFit,
      );
    }).toList()
      ..sort((a, b) => b.matchScore.compareTo(a.matchScore));
    return scored;
  }

  List<CandidateContent> buildFeed(MatchingRequest request, {int limit = 20}) {
    final ranked = rank(request);
    if (request.context.surface == SurfaceType.earn) {
      return ranked.take(limit).map((e) => e.candidate).toList();
    }
    final attentionState = _attentionStateFor(request.user, request.context);
    final sponsoredRatio = switch (attentionState) {
      AttentionState.lowAttention => 0.25,
      AttentionState.active => 0.30,
      AttentionState.highFocus => 0.38,
    }.clamp(feedCampaignMinRatio, feedCampaignMaxRatio);
    final desiredCampaigns = math.min(limit, (limit * sponsoredRatio).round());
    final campaigns = ranked
        .where((r) => r.candidate.kind == CandidateKind.campaign)
        .map((r) => r.candidate)
        .take(desiredCampaigns)
        .toList();
    final organics = ranked
        .where((r) => r.candidate.kind == CandidateKind.organic)
        .map((r) => r.candidate)
        .take(limit - campaigns.length)
        .toList();
    return _interleaveNoBackToBackCampaigns(organics, campaigns, limit);
  }

  AllocationDecision allocateNext(MatchingRequest request) {
    final ranked = rank(request);
    final next = ranked.isEmpty ? null : ranked.first;
    final attentionState = _attentionStateFor(request.user, request.context);
    final strictness = _verificationFor(
      trustScore: request.user.trustScore,
      attentionState: attentionState,
      fatigueLevel: request.user.fatigueLevel,
    );
    if (next == null || next.candidate.kind == CandidateKind.organic) {
      return AllocationDecision(
        nextItem: next?.candidate,
        matchScore: next?.matchScore ?? 0.0,
        finalPayoutUsd: 0.0,
        verificationStrictness: strictness,
        attentionState: attentionState,
      );
    }
    final campaign = next.candidate.campaign!;
    final payout = _dynamicPayout(
      user: request.user,
      campaign: campaign,
      candidate: next.candidate,
    );
    return AllocationDecision(
      nextItem: next.candidate,
      matchScore: next.matchScore,
      finalPayoutUsd: payout,
      verificationStrictness: strictness,
      attentionState: attentionState,
    );
  }

  List<CandidateContent> _hardFilter(MatchingRequest request) {
    return request.candidates.where((candidate) {
      if (candidate.kind == CandidateKind.organic) return true;
      final campaign = candidate.campaign;
      if (campaign == null) return false;
      if (campaign.remainingBudgetUsd <= 0) return false;
      if (request.user.trustScore < campaign.trustRequirement) return false;
      final seen = request.userExposureByCampaign[campaign.id] ?? 0;
      if (seen >= campaign.maxExposuresPerUser) return false;
      if (request.completedCampaignIds.contains(campaign.id)) return false;
      if (campaign.allowedLocations.isNotEmpty &&
          !campaign.allowedLocations.contains(request.user.location)) {
        return false;
      }
      return true;
    }).toList();
  }

  List<CandidateContent> _interleaveNoBackToBackCampaigns(
    List<CandidateContent> organics,
    List<CandidateContent> campaigns,
    int limit,
  ) {
    final out = <CandidateContent>[];
    var oi = 0;
    var ci = 0;
    while (out.length < limit && (oi < organics.length || ci < campaigns.length)) {
      final previousWasCampaign =
          out.isNotEmpty && out.last.kind == CandidateKind.campaign;
      if (!previousWasCampaign && ci < campaigns.length) {
        out.add(campaigns[ci++]);
      } else if (oi < organics.length) {
        out.add(organics[oi++]);
      } else if (ci < campaigns.length) {
        out.add(campaigns[ci++]);
      } else {
        break;
      }
    }
    return out;
  }

  double _setSimilarity(Set<String> a, Set<String> b) {
    if (a.isEmpty || b.isEmpty) return 0.0;
    final intersection = a.intersection(b).length.toDouble();
    final union = a.union(b).length.toDouble();
    return (intersection / union).clamp(0.0, 1.0);
  }

  double _relevanceScore({
    required Set<String> userInterests,
    required Set<String> campaignTargets,
    required Map<String, double> userVector,
    required Map<String, double> campaignVector,
  }) {
    if (userVector.isNotEmpty && campaignVector.isNotEmpty) {
      return _cosine(userVector, campaignVector);
    }
    return _setSimilarity(userInterests, campaignTargets);
  }

  double _cosine(Map<String, double> a, Map<String, double> b) {
    if (a.isEmpty || b.isEmpty) return 0.0;
    var dot = 0.0;
    var magA = 0.0;
    var magB = 0.0;
    for (final entry in a.entries) {
      final av = entry.value;
      magA += av * av;
      dot += av * (b[entry.key] ?? 0.0);
    }
    for (final bv in b.values) {
      magB += bv * bv;
    }
    if (magA <= 0 || magB <= 0) return 0.0;
    return (dot / (math.sqrt(magA) * math.sqrt(magB))).clamp(0.0, 1.0);
  }

  double _dynamicPayout({
    required UserVector user,
    required CampaignVector campaign,
    required CandidateContent candidate,
  }) {
    final trustMultiplier = (0.8 + (_clamp01(user.trustScore / 100.0) * 0.7));
    final attentionQualityMultiplier = (0.75 +
        (_clamp01(user.attentionScoreLive) * 0.55) +
        (_clamp01(candidate.predictedEngagement) * 0.2));
    final demandMultiplier = campaign.underperforming
        ? campaign.demandMultiplier.clamp(1.0, 1.8)
        : campaign.demandMultiplier.clamp(0.7, 1.4);
    final supplyMultiplier = (1.0 - campaign.supplyPressure.clamp(0.0, 0.4));
    return campaign.payoutValueUsd *
        trustMultiplier *
        attentionQualityMultiplier *
        demandMultiplier *
        supplyMultiplier;
  }

  double _attentionFitScore({
    required double userAttentionSeconds,
    required double campaignAttentionSeconds,
  }) {
    if (userAttentionSeconds <= 0 || campaignAttentionSeconds <= 0) return 0.0;
    final diff = (userAttentionSeconds - campaignAttentionSeconds).abs();
    final norm = diff / math.max(userAttentionSeconds, campaignAttentionSeconds);
    return (1.0 - norm).clamp(0.0, 1.0);
  }

  /// Expected value from attention: fit to dwell requirement, past quality, predicted engagement, live session signals.
  double _expectedAttentionScore({
    required double attentionFit,
    required double pastAttentionQuality,
    required double predictedEngagement,
    required double sessionAttentionBoost,
  }) {
    final pq = _clamp01(pastAttentionQuality);
    final pe = _clamp01(predictedEngagement);
    final core =
        attentionFit * 0.45 + pq * 0.30 + pe * 0.15;
    return (core + sessionAttentionBoost).clamp(0.0, 1.6).toDouble();
  }

  /// Normalized bid / reward weight vs the strongest payout in the current candidate batch.
  double _campaignBidWeight({
    required double payoutUsd,
    required double maxPayoutInBatch,
  }) {
    if (payoutUsd <= 0) return 0.0;
    final denom = math.max(maxPayoutInBatch, payoutUsd);
    final ratio = math.log1p(payoutUsd) / math.max(math.log1p(denom), 1e-9);
    return ratio.clamp(0.0, 1.0).toDouble();
  }

  /// Extra trust headroom above the campaign floor (hard eligibility still enforced in [_hardFilter]).
  double _trustEligibility({
    required double userTrustScore,
    required double campaignTrustRequirement,
  }) {
    if (campaignTrustRequirement <= 0) {
      return _clamp01(userTrustScore / 100.0);
    }
    final span = (100.0 - campaignTrustRequirement).clamp(1e-6, 100.0);
    final headroom = (userTrustScore - campaignTrustRequirement) / span;
    return headroom.clamp(0.0, 1.0).toDouble();
  }

  double _timeOfDayBoost(int hour) {
    final h = hour % 24;
    if ((h >= 7 && h <= 10) || (h >= 18 && h <= 22)) return 1.0;
    if (h >= 12 && h <= 14) return 0.6;
    return 0.25;
  }

  double _localContextBoost({
    required UserVector user,
    required CampaignVector campaign,
    required SessionContext context,
    required double creatorScore,
  }) {
    var boost = 0.0;
    if (campaign.preferredDevices.isEmpty ||
        campaign.preferredDevices.any((d) => d.toLowerCase() == user.device.toLowerCase())) {
      boost += 0.12;
    }
    boost += _timeOfDayBoost(context.timeOfDayHour) * 0.10;
    boost += _clamp01(context.localAvailability) * 0.15;
    boost += _clamp01(creatorScore) * 0.12;
    return boost.clamp(0.0, 0.45).toDouble();
  }

  double _organicLocalBoost(SessionContext context, double creatorScore) {
    var boost = 0.0;
    boost += _timeOfDayBoost(context.timeOfDayHour) * 0.10;
    boost += _clamp01(context.localAvailability) * 0.15;
    boost += _clamp01(creatorScore) * 0.12;
    return boost.clamp(0.0, 0.35).toDouble();
  }

  double _fraudRiskPenalty({
    required double userRisk,
    required double campaignRisk,
  }) {
    final combined = (_clamp01(userRisk) + _clamp01(campaignRisk)) * 0.5;
    return combined.clamp(0.0, 1.0).toDouble();
  }

  double _fatiguePenalty(int exposureCount, double fatigueLevel) {
    final exposureFactor = exposureCount * 0.12;
    final fatigueFactor = _clamp01(fatigueLevel) * 0.35;
    return exposureFactor + fatigueFactor;
  }

  double _realtimeAttentionBoost(SessionContext context) {
    final score = context.attentionScore.clamp(0.0, 1.0).toDouble();
    final durationSignal = (context.predictedAttentionDurationMs / 5000.0)
        .clamp(0.0, 1.0)
        .toDouble();
    final intentBoost = switch (context.attentionIntent) {
      'high_intent' => 0.18,
      'engaged' => 0.1,
      'fatigued' => -0.1,
      'distracted' => -0.14,
      _ => 0.0,
    };
    return ((score * 0.16) + (durationSignal * 0.09) + intentBoost)
        .clamp(-0.2, 0.3)
        .toDouble();
  }

  double _surfaceWeight({
    required SurfaceType surface,
    required SessionPhase phase,
    required double earningBehavior,
  }) {
    if (surface == SurfaceType.earn) {
      return 1.2 + _clamp01(earningBehavior) * 0.5;
    }
    switch (phase) {
      case SessionPhase.exploration:
        return 0.85;
      case SessionPhase.engagement:
        return 1.0;
      case SessionPhase.fatigue:
        return 0.75;
    }
  }

  double _clamp01(double value) => value.clamp(0.0, 1.0).toDouble();

  AttentionState _attentionStateFor(UserVector user, SessionContext context) {
    final live = ((user.attentionScoreLive * 0.65) +
            (_clamp01(context.attentionScore) * 0.35))
        .clamp(0.0, 1.0)
        .toDouble();
    if (live >= 0.78) return AttentionState.highFocus;
    if (live < 0.45) return AttentionState.lowAttention;
    return AttentionState.active;
  }

  VerificationStrictness _verificationFor({
    required double trustScore,
    required AttentionState attentionState,
    required double fatigueLevel,
  }) {
    if (trustScore < 45 || attentionState == AttentionState.lowAttention) {
      return VerificationStrictness.high;
    }
    if (trustScore >= 80 && fatigueLevel < 0.5) {
      return VerificationStrictness.low;
    }
    return VerificationStrictness.medium;
  }
}
