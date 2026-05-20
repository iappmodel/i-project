import 'package:eye_tracking_app/matching_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('MatchingEngine', () {
    UserVector user({
      double trust = 70,
      double attention = 18,
      double earningBehavior = 0.7,
      double fatigue = 0.2,
      double attentionLive = 0.6,
    }) {
      return UserVector(
        interests: const {'gaming', 'finance', 'tech'},
        attentionProfileSeconds: attention,
        trustScore: trust,
        earningBehavior: earningBehavior,
        attentionScoreLive: attentionLive,
        fatigueLevel: fatigue,
        location: 'US',
        device: 'android',
      );
    }

    CandidateContent organic(String id, Set<String> topics) {
      return CandidateContent(
        id: id,
        kind: CandidateKind.organic,
        topics: topics,
      );
    }

    CandidateContent campaign({
      required String id,
      double payout = 2,
      double requiredAttention = 15,
      double trustRequired = 50,
      double budget = 100,
      Set<String> target = const {'gaming'},
      Set<String> geo = const {'US'},
      int maxExposures = 3,
    }) {
      return CandidateContent(
        id: id,
        kind: CandidateKind.campaign,
        predictedEngagement: 0.7,
        predictedAttentionSeconds: requiredAttention,
        campaign: CampaignVector(
          id: id,
          targetAudience: target,
          payoutValueUsd: payout,
          attentionRequirementSeconds: requiredAttention,
          trustRequirement: trustRequired,
          urgency: 0.5,
          remainingBudgetUsd: budget,
          maxExposuresPerUser: maxExposures,
          allowedLocations: geo,
        ),
      );
    }

    test('hard filters reject trust, budget, geo, and exposure violations', () {
      final engine = MatchingEngine();
      final request = MatchingRequest(
        user: user(trust: 40),
        context: const SessionContext(
          sessionTimeSeconds: 30,
          scrollVelocity: 0.3,
          lastActions: <String>[],
          surface: SurfaceType.feed,
          timeOfDayHour: 10,
        ),
        userExposureByCampaign: const {'c-overexposed': 4},
        candidates: <CandidateContent>[
          organic('o1', const {'tech'}),
          campaign(id: 'c-trust', trustRequired: 80),
          campaign(id: 'c-budget', budget: 0),
          campaign(id: 'c-geo', geo: const {'BR'}),
          campaign(id: 'c-overexposed', maxExposures: 3),
          campaign(id: 'c-pass', trustRequired: 35),
        ],
      );

      final ranked = engine.rank(request);
      final ids = ranked.map((e) => e.candidate.id).toList();

      expect(ids, contains('o1'));
      expect(ids, contains('c-pass'));
      expect(ids, isNot(contains('c-trust')));
      expect(ids, isNot(contains('c-budget')));
      expect(ids, isNot(contains('c-geo')));
      expect(ids, isNot(contains('c-overexposed')));
    });

    test('hard filters reject already-completed campaigns', () {
      final engine = MatchingEngine();
      final request = MatchingRequest(
        user: user(),
        context: const SessionContext(
          sessionTimeSeconds: 80,
          scrollVelocity: 0.2,
          lastActions: <String>[],
          surface: SurfaceType.feed,
          timeOfDayHour: 12,
        ),
        completedCampaignIds: const {'c-done'},
        userExposureByCampaign: const {},
        candidates: <CandidateContent>[
          campaign(id: 'c-done'),
          campaign(id: 'c-open'),
        ],
      );
      final ranked = engine.rank(request);
      expect(ranked.map((r) => r.candidate.id), isNot(contains('c-done')));
      expect(ranked.map((r) => r.candidate.id), contains('c-open'));
    });

    test('attention fit improves rank when requirement matches user profile', () {
      final engine = MatchingEngine();
      final request = MatchingRequest(
        user: user(attention: 20),
        context: const SessionContext(
          sessionTimeSeconds: 120,
          scrollVelocity: 0.2,
          lastActions: <String>[],
          surface: SurfaceType.feed,
          timeOfDayHour: 15,
        ),
        userExposureByCampaign: const {},
        candidates: <CandidateContent>[
          campaign(id: 'fit-good', requiredAttention: 20, payout: 2),
          campaign(id: 'fit-bad', requiredAttention: 4, payout: 2),
        ],
      );

      final ranked = engine.rank(request);

      expect(ranked.first.candidate.id, 'fit-good');
      expect(
        ranked.first.attentionFitScore,
        greaterThan(ranked.last.attentionFitScore),
      );
    });

    test('feed keeps campaign share bounded and avoids back-to-back ads', () {
      final engine = MatchingEngine(feedCampaignMinRatio: 0.2, feedCampaignMaxRatio: 0.35);
      final candidates = <CandidateContent>[
        for (var i = 0; i < 10; i++) organic('o$i', const {'tech'}),
        for (var i = 0; i < 10; i++) campaign(id: 'c$i', payout: 3 + i / 10),
      ];
      final request = MatchingRequest(
        user: user(earningBehavior: 1.0),
        context: const SessionContext(
          sessionTimeSeconds: 150,
          scrollVelocity: 0.2,
          lastActions: <String>[],
          surface: SurfaceType.feed,
          timeOfDayHour: 20,
        ),
        userExposureByCampaign: const {},
        candidates: candidates,
      );

      final feed = engine.buildFeed(request, limit: 20);
      final campaigns = feed.where((e) => e.kind == CandidateKind.campaign).length;

      expect(campaigns, inInclusiveRange(4, 7));
      for (var i = 1; i < feed.length; i++) {
        final backToBackCampaign = feed[i - 1].kind == CandidateKind.campaign &&
            feed[i].kind == CandidateKind.campaign;
        expect(backToBackCampaign, false);
      }
    });

    test('earn tab prioritizes campaign payout over organic content', () {
      final engine = MatchingEngine();
      final request = MatchingRequest(
        user: user(earningBehavior: 1.0),
        context: const SessionContext(
          sessionTimeSeconds: 90,
          scrollVelocity: 0.1,
          lastActions: <String>[],
          surface: SurfaceType.earn,
          timeOfDayHour: 21,
        ),
        userExposureByCampaign: const {},
        candidates: <CandidateContent>[
          organic('o1', const {'gaming'}),
          campaign(id: 'c-high', payout: 6),
          campaign(id: 'c-low', payout: 1.5),
        ],
      );

      final feed = engine.buildFeed(request, limit: 3);

      expect(feed.first.id, 'c-high');
      expect(feed[1].id, 'c-low');
    });

    test('fraud risk penalty lowers campaign rank when other signals match', () {
      final engine = MatchingEngine();
      final baseUser = user();
      final riskyUser = UserVector(
        interests: baseUser.interests,
        attentionProfileSeconds: baseUser.attentionProfileSeconds,
        trustScore: baseUser.trustScore,
        earningBehavior: baseUser.earningBehavior,
        attentionScoreLive: baseUser.attentionScoreLive,
        fatigueLevel: baseUser.fatigueLevel,
        location: baseUser.location,
        device: baseUser.device,
        fraudRiskUser: 0.85,
      );
      final context = const SessionContext(
        sessionTimeSeconds: 120,
        scrollVelocity: 0.2,
        lastActions: <String>[],
        surface: SurfaceType.feed,
        timeOfDayHour: 10,
      );
      final candidates = <CandidateContent>[
        campaign(id: 'c-clean', payout: 3, requiredAttention: 18),
      ];
      final cleanRank = engine.rank(MatchingRequest(
        user: baseUser,
        context: context,
        userExposureByCampaign: const {},
        candidates: candidates,
      ));
      final riskyRank = engine.rank(MatchingRequest(
        user: riskyUser,
        context: context,
        userExposureByCampaign: const {},
        candidates: candidates,
      ));
      expect(cleanRank.first.fraudRiskPenalty, lessThan(riskyRank.first.fraudRiskPenalty));
      expect(cleanRank.first.matchScore, greaterThan(riskyRank.first.matchScore));
    });

    test('matchScore equals additive components times surface and priority weights', () {
      final engine = MatchingEngine();
      final request = MatchingRequest(
        user: user(earningBehavior: 0.0),
        context: const SessionContext(
          sessionTimeSeconds: 200,
          scrollVelocity: 0.1,
          lastActions: <String>[],
          surface: SurfaceType.feed,
          timeOfDayHour: 10,
        ),
        userExposureByCampaign: const {},
        candidates: <CandidateContent>[
          campaign(
            id: 'c-formula',
            payout: 4,
            requiredAttention: 18,
            trustRequired: 50,
          ),
        ],
      );
      final r = engine.rank(request).first;
      final phase = engine.phaseForSession(request.context.sessionTimeSeconds);
      final surfaceWeight = switch (request.context.surface) {
        SurfaceType.feed => switch (phase) {
            SessionPhase.exploration => 0.85,
            SessionPhase.engagement => 1.0,
            SessionPhase.fatigue => 0.75,
          },
        SurfaceType.earn => 1.2 + 0.0 * 0.5,
      };
      final priority = r.candidate.campaign!.priorityWeight;
      final base = r.relevanceScore +
          r.expectedAttentionScore +
          r.campaignBidWeight +
          r.trustEligibility +
          r.localContextBoost -
          r.fraudRiskPenalty -
          r.fatiguePenalty;
      expect(r.matchScore, closeTo(base * surfaceWeight * priority, 1e-6));
    });

    test('allocateNext outputs payout and strictness signals', () {
      final engine = MatchingEngine();
      final request = MatchingRequest(
        user: user(trust: 85, attentionLive: 0.9),
        context: const SessionContext(
          sessionTimeSeconds: 60,
          scrollVelocity: 0.1,
          lastActions: <String>[],
          surface: SurfaceType.feed,
          timeOfDayHour: 19,
          attentionScore: 0.9,
        ),
        userExposureByCampaign: const {},
        candidates: <CandidateContent>[
          campaign(id: 'c1', payout: 4, requiredAttention: 10),
          organic('o1', const {'tech'}),
        ],
      );

      final decision = engine.allocateNext(request);

      expect(decision.nextItem, isNotNull);
      expect(decision.finalPayoutUsd, greaterThan(0));
      expect(decision.verificationStrictness, VerificationStrictness.low);
      expect(decision.attentionState, AttentionState.highFocus);
    });
  });
}
