import 'package:eye_tracking_app/market_intelligence_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('MarketIntelligenceEngine', () {
    MarketSignal market({int hour = 20, double volatility = 0.3}) {
      return MarketSignal(
        now: DateTime(2026, 4, 25, hour),
        demand: const DemandSignal(
          activeCampaigns: 180,
          avgBidUsd: 0.06,
          totalRemainingBudgetUsd: 8000,
          hourOfDay: 20,
          competitionIndex: 1.3,
          recentConversionRate: 0.19,
        ),
        supply: const SupplySignal(
          activeUsers: 900,
          avgAttentionSeconds: 14,
          avgSessionSeconds: 420,
          attentionQuality: 0.72,
          trustScore: 0.81,
          recentRetention: 0.68,
        ),
        volatilityIndex: volatility,
        lastPricePerSecondUsd: 0.04,
      );
    }

    const user = UserSignal(
      userId: 'u-1',
      predictedLtvUsd: 160,
      attentionQuality: 0.82,
      conversionProbability: 0.57,
      predictedSessionSeconds: 520,
      recentAttentionCurve: <double>[0.55, 0.64, 0.71, 0.79],
    );

    const campaign = CampaignSignal(
      campaignId: 'cmp-premium',
      importance: 0.86,
      predictedRoi: 1.6,
      fatigueScore: 0.2,
      performanceScore: 0.61,
    );

    test('produces predictive intelligence across all modules', () {
      const engine = MarketIntelligenceEngine();
      final decision = engine.decide(
        market: market(),
        user: user,
        campaign: campaign,
      );

      expect(decision.predictedCampaignPerformance, inInclusiveRange(0.0, 1.0));
      expect(decision.predictedBidPressure, greaterThan(0));
      expect(decision.predictedUserValue, greaterThan(0));
      expect(decision.predictedSlotPrice, greaterThan(0));
      expect(decision.predictedVolatility, inInclusiveRange(0.0, 1.0));
      expect(decision.userCluster, isNotEmpty);
      expect(decision.behaviorPattern.keys, containsAll(<String>['stability', 'momentum']));
    });

    test('control engine raises rewards under supply stress', () {
      const engine = MarketIntelligenceEngine();
      final constrainedSupply = MarketSignal(
        now: market().now,
        demand: market().demand,
        supply: const SupplySignal(
          activeUsers: 300,
          avgAttentionSeconds: 10,
          avgSessionSeconds: 210,
          attentionQuality: 0.55,
          trustScore: 0.65,
          recentRetention: 0.52,
        ),
        volatilityIndex: market().volatilityIndex,
        lastPricePerSecondUsd: market().lastPricePerSecondUsd,
      );
      final decision = engine.decide(
        market: constrainedSupply,
        user: user,
        campaign: campaign,
      );

      expect(decision.controlPlan.rewardMultiplier, greaterThan(1.0));
    });

    test('converts decision into market strategy override', () {
      const engine = MarketIntelligenceEngine();
      final decision = engine.decide(
        market: market(volatility: 0.9),
        user: user,
        campaign: campaign,
      );
      final strategy = decision.toMarketStrategyOverride();

      expect(strategy.globalBidMultiplier, greaterThan(0));
      expect(strategy.rewardMultiplier, greaterThan(0));
      expect(strategy.campaignBidMultipliers[campaign.campaignId], isNotNull);
      expect(strategy.volatilityDamping, lessThanOrEqualTo(1.0));
    });
  });
}
