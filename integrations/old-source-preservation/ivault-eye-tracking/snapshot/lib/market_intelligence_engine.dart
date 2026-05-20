import 'dart:math' as math;

import 'attention_market_engine.dart';

final class DemandSignal {
  const DemandSignal({
    required this.activeCampaigns,
    required this.avgBidUsd,
    required this.totalRemainingBudgetUsd,
    required this.hourOfDay,
    required this.competitionIndex,
    required this.recentConversionRate,
  });

  final int activeCampaigns;
  final double avgBidUsd;
  final double totalRemainingBudgetUsd;
  final int hourOfDay;
  final double competitionIndex;
  final double recentConversionRate;
}

final class SupplySignal {
  const SupplySignal({
    required this.activeUsers,
    required this.avgAttentionSeconds,
    required this.avgSessionSeconds,
    required this.attentionQuality,
    required this.trustScore,
    required this.recentRetention,
  });

  final int activeUsers;
  final double avgAttentionSeconds;
  final double avgSessionSeconds;
  final double attentionQuality;
  final double trustScore;
  final double recentRetention;
}

final class MarketSignal {
  const MarketSignal({
    required this.now,
    required this.demand,
    required this.supply,
    required this.volatilityIndex,
    required this.lastPricePerSecondUsd,
  });

  final DateTime now;
  final DemandSignal demand;
  final SupplySignal supply;
  final double volatilityIndex;
  final double lastPricePerSecondUsd;
}

final class UserSignal {
  const UserSignal({
    required this.userId,
    required this.predictedLtvUsd,
    required this.attentionQuality,
    required this.conversionProbability,
    required this.predictedSessionSeconds,
    required this.recentAttentionCurve,
  });

  final String userId;
  final double predictedLtvUsd;
  final double attentionQuality;
  final double conversionProbability;
  final double predictedSessionSeconds;
  final List<double> recentAttentionCurve;
}

final class CampaignSignal {
  const CampaignSignal({
    required this.campaignId,
    required this.importance,
    required this.predictedRoi,
    required this.fatigueScore,
    required this.performanceScore,
  });

  final String campaignId;
  final double importance;
  final double predictedRoi;
  final double fatigueScore;
  final double performanceScore;
}

final class DemandIntelligence {
  const DemandIntelligence();

  double predictCampaignPerformance({
    required CampaignSignal campaign,
    required UserSignal user,
    required MarketSignal market,
  }) {
    final performance = (campaign.performanceScore * 0.45) +
        (user.conversionProbability * 0.35) +
        (market.demand.recentConversionRate * 0.2);
    return performance.clamp(0.0, 1.0).toDouble();
  }

  double predictBidPressure(MarketSignal market) {
    final demandPower = (market.demand.activeCampaigns / math.max(1, market.supply.activeUsers)) *
        market.demand.competitionIndex;
    final temporalBoost = _hourBoost(market.now.hour);
    return (demandPower * temporalBoost).clamp(0.2, 4.0).toDouble();
  }

  double forecastBudgetDepletion({
    required CampaignSignal campaign,
    required MarketSignal market,
  }) {
    final spendVelocity = market.demand.avgBidUsd *
        market.demand.competitionIndex *
        (1 + campaign.importance * 0.4);
    final normalized = spendVelocity / math.max(0.01, market.demand.totalRemainingBudgetUsd);
    return normalized.clamp(0.0, 1.0).toDouble();
  }

  double _hourBoost(int hour) {
    if (hour >= 18 && hour <= 23) return 1.25;
    if (hour >= 0 && hour <= 5) return 0.75;
    return 1.0;
  }
}

final class SupplyIntelligence {
  const SupplyIntelligence();

  double predictUserValue(UserSignal user) {
    final value = user.predictedLtvUsd *
        user.attentionQuality.clamp(0.0, 1.0) *
        user.conversionProbability.clamp(0.0, 1.0);
    return value.clamp(0.0, 1000.0).toDouble();
  }

  double predictAttentionQuality(SupplySignal supply) {
    final quality = (supply.attentionQuality * 0.5) +
        (supply.trustScore * 0.3) +
        (supply.recentRetention * 0.2);
    return quality.clamp(0.0, 1.0).toDouble();
  }

  double predictSessionDuration({
    required UserSignal user,
    required SupplySignal supply,
  }) {
    final curveMean = user.recentAttentionCurve.isEmpty
        ? 0.5
        : user.recentAttentionCurve.reduce((a, b) => a + b) /
            user.recentAttentionCurve.length;
    final predicted = (user.predictedSessionSeconds * 0.6) +
        (supply.avgSessionSeconds * 0.3) +
        (curveMean * 60.0 * 0.1);
    return predicted.clamp(10.0, 3600.0).toDouble();
  }
}

final class PriceIntelligence {
  const PriceIntelligence();

  double predictSlotPrice(MarketSignal market) {
    final base = market.lastPricePerSecondUsd;
    final pressure = market.demand.competitionIndex / math.max(0.1, market.supply.attentionQuality);
    final temporal = market.now.hour >= 18 && market.now.hour <= 23 ? 1.2 : 0.9;
    return (base * pressure * temporal).clamp(0.0005, 2.0).toDouble();
  }

  double detectPriceVolatility(MarketSignal market) {
    final imbalance = market.demand.competitionIndex /
        math.max(0.1, market.supply.recentRetention);
    return (market.volatilityIndex * 0.7 + (imbalance - 1).abs() * 0.3)
        .clamp(0.0, 1.0)
        .toDouble();
  }

  double suggestBidAdjustments({
    required CampaignSignal campaign,
    required double predictedPerformance,
    required double predictedVolatility,
  }) {
    final performanceBoost = predictedPerformance < 0.45
        ? 1.0 + (0.45 - predictedPerformance)
        : 1.0;
    final roiGuardrail = campaign.predictedRoi < 1.0 ? 0.9 : 1.05;
    final volatilityClamp = 1.0 - (predictedVolatility * 0.25);
    return (performanceBoost * roiGuardrail * volatilityClamp).clamp(0.6, 1.6).toDouble();
  }
}

final class BehaviorIntelligence {
  const BehaviorIntelligence();

  Map<String, double> detectPatterns(UserSignal user) {
    final curve = user.recentAttentionCurve;
    if (curve.isEmpty) {
      return const <String, double>{'stability': 0.5, 'momentum': 0.5};
    }
    final mean = curve.reduce((a, b) => a + b) / curve.length;
    final variance = curve
            .map((v) => (v - mean) * (v - mean))
            .reduce((a, b) => a + b) /
        curve.length;
    final momentum = curve.last - curve.first;
    return <String, double>{
      'stability': (1.0 - variance).clamp(0.0, 1.0).toDouble(),
      'momentum': ((momentum + 1) / 2).clamp(0.0, 1.0).toDouble(),
    };
  }

  String clusterUsers(UserSignal user) {
    final quality = user.attentionQuality;
    final conversion = user.conversionProbability;
    if (quality > 0.75 && conversion > 0.55) return 'high_value';
    if (quality > 0.55) return 'growth';
    return 'filler';
  }

  bool identifyHighValueSegments(UserSignal user) {
    return user.predictedLtvUsd >= 100 &&
        user.attentionQuality >= 0.7 &&
        user.conversionProbability >= 0.5;
  }
}

final class ControlActionPlan {
  const ControlActionPlan({
    required this.rewardMultiplier,
    required this.globalBidMultiplier,
    required this.marketPressureMultiplier,
    required this.volatilityDamping,
    required this.campaignBidMultipliers,
    required this.campaignExposureMultipliers,
    required this.userRoutingTier,
  });

  final double rewardMultiplier;
  final double globalBidMultiplier;
  final double marketPressureMultiplier;
  final double volatilityDamping;
  final Map<String, double> campaignBidMultipliers;
  final Map<String, double> campaignExposureMultipliers;
  final String userRoutingTier;
}

final class ControlEngine {
  const ControlEngine();

  ControlActionPlan adjust({
    required MarketSignal market,
    required UserSignal user,
    required CampaignSignal campaign,
    required double predictedUserValue,
    required double predictedPerformance,
    required double predictedBidPressure,
    required double predictedVolatility,
    required bool highValueSegment,
  }) {
    final supplyLow = market.supply.activeUsers < 1000;
    final demandLow = market.demand.competitionIndex < 0.8;
    final rewardMultiplier = supplyLow
        ? 1.2
        : (demandLow ? 0.9 : 1.0);
    final volatilityDamping = predictedVolatility > 0.6 ? 0.55 : 1.0;
    final marketPressureMultiplier = predictedBidPressure.clamp(0.6, 1.6).toDouble();
    final campaignBidBoost = campaign.importance > 0.7 ? 1.15 : 1.0;
    final campaignPerfCorrection = predictedPerformance < 0.35 ? 0.85 : 1.0;
    final globalBidMultiplier = (highValueSegment ? 1.1 : 0.95).clamp(0.7, 1.3).toDouble();
    final userRoutingTier = highValueSegment || predictedUserValue > 80
        ? 'premium'
        : (user.attentionQuality > 0.5 ? 'balanced' : 'filler');

    return ControlActionPlan(
      rewardMultiplier: rewardMultiplier,
      globalBidMultiplier: globalBidMultiplier,
      marketPressureMultiplier: marketPressureMultiplier,
      volatilityDamping: volatilityDamping,
      campaignBidMultipliers: <String, double>{
        campaign.campaignId: (campaignBidBoost * campaignPerfCorrection).clamp(0.6, 1.4),
      },
      campaignExposureMultipliers: <String, double>{
        campaign.campaignId: predictedPerformance < 0.25 ? 0.7 : 1.0,
      },
      userRoutingTier: userRoutingTier,
    );
  }
}

final class MarketIntelligenceDecision {
  const MarketIntelligenceDecision({
    required this.predictedCampaignPerformance,
    required this.predictedBidPressure,
    required this.forecastBudgetDepletion,
    required this.predictedUserValue,
    required this.predictedAttentionQuality,
    required this.predictedSessionDuration,
    required this.predictedSlotPrice,
    required this.predictedVolatility,
    required this.suggestedBidAdjustment,
    required this.behaviorPattern,
    required this.userCluster,
    required this.highValueSegment,
    required this.controlPlan,
  });

  final double predictedCampaignPerformance;
  final double predictedBidPressure;
  final double forecastBudgetDepletion;
  final double predictedUserValue;
  final double predictedAttentionQuality;
  final double predictedSessionDuration;
  final double predictedSlotPrice;
  final double predictedVolatility;
  final double suggestedBidAdjustment;
  final Map<String, double> behaviorPattern;
  final String userCluster;
  final bool highValueSegment;
  final ControlActionPlan controlPlan;

  MarketStrategyOverride toMarketStrategyOverride() {
    return MarketStrategyOverride(
      rewardMultiplier: controlPlan.rewardMultiplier,
      globalBidMultiplier: controlPlan.globalBidMultiplier,
      marketPressureMultiplier: controlPlan.marketPressureMultiplier,
      volatilityDamping: controlPlan.volatilityDamping,
      campaignBidMultipliers: <String, double>{
        for (final entry in controlPlan.campaignBidMultipliers.entries)
          entry.key: entry.value * suggestedBidAdjustment,
      },
      campaignExposureMultipliers: controlPlan.campaignExposureMultipliers,
    );
  }
}

final class MarketIntelligenceEngine {
  const MarketIntelligenceEngine({
    this.demand = const DemandIntelligence(),
    this.supply = const SupplyIntelligence(),
    this.price = const PriceIntelligence(),
    this.behavior = const BehaviorIntelligence(),
    this.control = const ControlEngine(),
  });

  final DemandIntelligence demand;
  final SupplyIntelligence supply;
  final PriceIntelligence price;
  final BehaviorIntelligence behavior;
  final ControlEngine control;

  MarketIntelligenceDecision decide({
    required MarketSignal market,
    required UserSignal user,
    required CampaignSignal campaign,
  }) {
    final predictedCampaignPerformance =
        demand.predictCampaignPerformance(campaign: campaign, user: user, market: market);
    final predictedBidPressure = demand.predictBidPressure(market);
    final forecastBudgetDepletion =
        demand.forecastBudgetDepletion(campaign: campaign, market: market);

    final predictedUserValue = supply.predictUserValue(user);
    final predictedAttentionQuality = supply.predictAttentionQuality(market.supply);
    final predictedSessionDuration =
        supply.predictSessionDuration(user: user, supply: market.supply);

    final predictedSlotPrice = price.predictSlotPrice(market);
    final predictedVolatility = price.detectPriceVolatility(market);
    final suggestedBidAdjustment = price.suggestBidAdjustments(
      campaign: campaign,
      predictedPerformance: predictedCampaignPerformance,
      predictedVolatility: predictedVolatility,
    );

    final behaviorPattern = behavior.detectPatterns(user);
    final userCluster = behavior.clusterUsers(user);
    final highValueSegment = behavior.identifyHighValueSegments(user);

    final controlPlan = control.adjust(
      market: market,
      user: user,
      campaign: campaign,
      predictedUserValue: predictedUserValue,
      predictedPerformance: predictedCampaignPerformance,
      predictedBidPressure: predictedBidPressure,
      predictedVolatility: predictedVolatility,
      highValueSegment: highValueSegment,
    );

    return MarketIntelligenceDecision(
      predictedCampaignPerformance: predictedCampaignPerformance,
      predictedBidPressure: predictedBidPressure,
      forecastBudgetDepletion: forecastBudgetDepletion,
      predictedUserValue: predictedUserValue,
      predictedAttentionQuality: predictedAttentionQuality,
      predictedSessionDuration: predictedSessionDuration,
      predictedSlotPrice: predictedSlotPrice,
      predictedVolatility: predictedVolatility,
      suggestedBidAdjustment: suggestedBidAdjustment,
      behaviorPattern: behaviorPattern,
      userCluster: userCluster,
      highValueSegment: highValueSegment,
      controlPlan: controlPlan,
    );
  }
}
