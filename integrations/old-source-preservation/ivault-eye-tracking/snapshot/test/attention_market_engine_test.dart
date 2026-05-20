import 'package:eye_tracking_app/attention_market_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AttentionMarketEngine', () {
    UserMarketProfile user({
      String userId = 'u1',
      double trust = 0.9,
      double engagement = 0.8,
      double demo = 0.9,
      double attentionProb = 0.7,
      double completionProb = 0.4,
    }) {
      return UserMarketProfile(
        userId: userId,
        segment: 'music_lovers',
        interests: const {'music', 'tech'},
        trustScore: trust,
        engagementQuality: engagement,
        demographicValue: demo,
        predictedAttentionProbability: attentionProb,
        predictedCompletionProbability: completionProb,
      );
    }

    MarketContext context({
      double demand = 120,
      double supply = 60,
      double intent = 0.8,
    }) {
      return MarketContext(
        timestamp: DateTime(2026, 4, 25, 10),
        surface: PlacementSurface.feed,
        contentCategory: 'music',
        intentSignal: intent,
        timeOfDayMultiplier: 1.2,
        segmentDemandBids: demand,
        segmentAttentionSupplySeconds: supply,
      );
    }

    Campaign campaign({
      String id = 'c1',
      double budget = 1000,
      double bid = 0.03,
      double qualityRequirement = 0.4,
      Set<String> targets = const {'music'},
    }) {
      return Campaign(
        id: id,
        budgetUsd: budget,
        bidType: BidType.cpt,
        bidValueUsd: bid,
        targetAudience: targets,
        qualityRequirement: qualityRequirement,
      );
    }

    test('prices attention per second with demand/supply/user/context factors', () {
      final engine = AttentionMarketEngine();
      engine.registerCampaign(campaign(id: 'spotify'));

      final ranked = engine.rankCampaignsForUser(
        user: user(),
        context: context(),
      );

      expect(ranked, hasLength(1));
      expect(ranked.first.pricePerSecondUsd, greaterThan(0.03));
      expect(ranked.first.competitionMultiplier, greaterThan(1.0));
      expect(ranked.first.rankScore, greaterThan(0));
    });

    test('higher demand context yields higher market price', () {
      final engine = AttentionMarketEngine();
      engine.registerCampaign(campaign(id: 'spotify'));
      final profile = user();

      final lowDemandPrice = engine
          .rankCampaignsForUser(
            user: profile,
            context: context(demand: 10, supply: 100),
          )
          .first
          .pricePerSecondUsd;
      final highDemandPrice = engine
          .rankCampaignsForUser(
            user: profile,
            context: context(demand: 180, supply: 40),
          )
          .first
          .pricePerSecondUsd;

      expect(highDemandPrice, greaterThan(lowDemandPrice));
    });

    test('builds feed mix with bounded ad density', () {
      final engine = AttentionMarketEngine();
      for (var i = 0; i < 8; i++) {
        engine.registerCampaign(campaign(id: 'c$i'));
      }
      final ranked = engine.rankCampaignsForUser(
        user: user(),
        context: context(),
      );

      final feed = engine.buildFeedMix(
        organicContentIds: List<String>.generate(20, (i) => 'o$i'),
        rankedCampaigns: ranked,
        limit: 20,
      );
      final adCount = feed.where((item) => item.startsWith('campaign:')).length;

      expect(adCount, inInclusiveRange(4, 6));
    });

    test('settles attention trade and depletes budget in real-time', () {
      final engine = AttentionMarketEngine();
      engine.registerCampaign(campaign(id: 'spotify', budget: 1.0, bid: 0.05));

      final settlement = engine.settleAttentionTrade(
        userId: 'u1',
        campaignId: 'spotify',
        secondsWatched: 10,
        pricePerSecondUsd: 0.05,
        now: DateTime(2026, 4, 25, 10),
      );

      expect(settlement.success, true);
      expect(settlement.rewardFundingUsd, 0.5);
      expect(settlement.remainingBudgetUsd, 0.5);

      final second = engine.settleAttentionTrade(
        userId: 'u1',
        campaignId: 'spotify',
        secondsWatched: 20,
        pricePerSecondUsd: 0.05,
        now: DateTime(2026, 4, 25, 11),
      );
      expect(second.success, false);
      expect(second.reason, 'insufficient_budget');
    });

    test('earn offers rank by reward-per-minute from live pricing', () {
      final engine = AttentionMarketEngine();
      engine.registerCampaign(campaign(id: 'high', bid: 0.06));
      engine.registerCampaign(campaign(id: 'low', bid: 0.02));
      final ranked = engine.rankCampaignsForUser(
        user: user(),
        context: context(),
      );

      final offers = engine.buildEarnOffers(
        rankedCampaigns: ranked,
        expectedAttentionSeconds: 30,
      );

      expect(offers.first.rewardPerMinuteUsd, greaterThan(offers.last.rewardPerMinuteUsd));
    });

    test('runs second-price auction with runner-up clearing logic', () {
      final engine = AttentionMarketEngine();
      engine.registerCampaign(campaign(id: 'high', bid: 0.08));
      engine.registerCampaign(campaign(id: 'low', bid: 0.03));

      final auction = engine.runRealtimeAuction(
        user: user(),
        context: context(),
        pricingModel: AuctionPricingModel.secondPrice,
      );

      expect(auction, isNotNull);
      expect(auction!.winningCampaignId, 'high');
      expect(auction.runnerUpCampaignId, 'low');
      expect(
        auction.clearingPricePerSecondUsd,
        lessThanOrEqualTo(auction.winningPricePerSecondUsd),
      );
      expect(auction.clearingPricePerSecondUsd, greaterThan(0));
    });

    test('returns slot market decision token for feed rendering', () {
      final engine = AttentionMarketEngine();
      engine.registerCampaign(campaign(id: 'winner', bid: 0.09));
      engine.registerCampaign(campaign(id: 'runner', bid: 0.04));

      final decision = engine.getAdSlot(
        user: user(),
        context: context(),
        slotTier: FeedSlotTier.top,
      );

      expect(decision.outcome, isNotNull);
      expect(decision.renderToken, 'campaign:winner');
      expect(decision.eligibleCampaignIds, containsAll(<String>['winner', 'runner']));
    });

    test('reduces effective bid when fraud risk is high', () {
      final engine = AttentionMarketEngine();
      engine.registerCampaign(campaign(id: 'safe', bid: 0.08));
      final lowRisk = engine.rankCampaignsForUser(
        user: user(),
        context: context(),
      );
      final highRisk = engine.rankCampaignsForUser(
        user: user(attentionProb: 0.7, completionProb: 0.4).copyWithFraudRisk(0.9),
        context: context(),
      );

      expect(lowRisk.first.effectiveBidUsd, greaterThan(highRisk.first.effectiveBidUsd));
      expect(highRisk.first.fraudMultiplier, lessThan(lowRisk.first.fraudMultiplier));
    });

    test('supports dynamic bid tuning feedback loop', () {
      final engine = AttentionMarketEngine();
      engine.registerCampaign(campaign(id: 'adaptive', bid: 0.05));

      final baseline = engine.rankCampaignsForUser(
        user: user(),
        context: context(),
      );
      engine.tuneCampaignBid(
        campaignId: 'adaptive',
        performanceScore: 0.2,
        competitionLevel: 0.9,
        budgetDrainRate: 0.1,
      );
      final tuned = engine.rankCampaignsForUser(
        user: user(),
        context: context(),
      );

      expect(tuned.first.effectiveBidUsd, greaterThan(baseline.first.effectiveBidUsd));
    });

    test('applies market strategy overrides to bids and rewards', () {
      final engine = AttentionMarketEngine();
      engine.registerCampaign(campaign(id: 'adaptive', bid: 0.05));
      final profile = user();
      final market = context();

      final baseline = engine.rankCampaignsForUser(
        user: profile,
        context: market,
      );
      const strategy = MarketStrategyOverride(
        globalBidMultiplier: 1.25,
        rewardMultiplier: 1.2,
        campaignBidMultipliers: <String, double>{'adaptive': 1.15},
        volatilityDamping: 0.7,
      );
      final optimized = engine.rankCampaignsForUser(
        user: profile,
        context: market,
        strategy: strategy,
      );
      final offers = engine.buildEarnOffers(
        rankedCampaigns: optimized,
        expectedAttentionSeconds: 30,
        strategy: strategy,
      );

      expect(optimized.first.pricePerSecondUsd, greaterThan(baseline.first.pricePerSecondUsd));
      expect(offers.first.rewardPerMinuteUsd, greaterThan(optimized.first.pricePerSecondUsd * 30));
    });

    test('enforces campaign daily cap during settlement', () {
      final engine = AttentionMarketEngine();
      engine.registerCampaign(
        Campaign(
          id: 'capped',
          budgetUsd: 10,
          bidType: BidType.cpt,
          bidValueUsd: 0.05,
          targetAudience: const {'music'},
          qualityRequirement: 0.4,
          dailyCapUsd: 0.5,
        ),
      );

      final first = engine.settleAttentionTrade(
        userId: 'u1',
        campaignId: 'capped',
        secondsWatched: 10,
        pricePerSecondUsd: 0.05,
        now: DateTime(2026, 4, 25, 10),
      );
      final second = engine.settleAttentionTrade(
        userId: 'u1',
        campaignId: 'capped',
        secondsWatched: 1,
        pricePerSecondUsd: 0.05,
        now: DateTime(2026, 4, 25, 10, 30),
      );

      expect(first.success, true);
      expect(second.success, false);
      expect(second.reason, 'daily_cap_reached');
    });
  });
}

extension on UserMarketProfile {
  UserMarketProfile copyWithFraudRisk(double risk) {
    return UserMarketProfile(
      userId: userId,
      segment: segment,
      interests: interests,
      trustScore: trustScore,
      engagementQuality: engagementQuality,
      demographicValue: demographicValue,
      predictedAttentionProbability: predictedAttentionProbability,
      predictedCompletionProbability: predictedCompletionProbability,
      fraudRiskScore: risk,
    );
  }
}
