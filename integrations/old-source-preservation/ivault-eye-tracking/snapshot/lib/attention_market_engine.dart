import 'dart:math' as math;

// -----------------------------------------------------------------------------
// 2.9 Attention Market Engine
//
// Purpose: price attention by connecting:
//   - Brand demand & campaign budgets → [Campaign], bid logs, spend/settlement
//   - User attention supply vs demand → [MarketContext.segmentDemandBids],
//     [MarketContext.segmentAttentionSupplySeconds] → _competitionMultiplier
//   - Verified attention quality → [Campaign.qualityRequirement],
//     [UserMarketProfile.trustScore], engagementQuality, fraud risk in effective bid
//   - Creator / inventory distribution → [MarketStrategyOverride] exposure multipliers,
//     [buildFeedMix], [PlacementSurface], slot tiers
//   - Local / contextual demand → [MarketContext.contentCategory],
//     [MarketControls.segmentCategoryBoost], intent, time-of-day, demandPressure
//   - Reward pricing → [buildEarnOffers], [MarketControls.rewardFloorUsdPerSecond],
//     [MarketStrategyOverride.rewardMultiplier], clearing prices from auctions
//
// The market decides (via ranking, eligibility, auctions, and settlement):
//   - Which campaigns are worth showing → getEligibleCampaigns, rankCampaignsForUser,
//     getAdSlot, buildFeedMix
//   - Which users are worth paying more → _userMultiplier (trust, engagement, demo value)
//   - Which attention types are scarce → demand/supply ratio in competition multiplier
//   - Which campaigns need higher rewards → tuneCampaignBid, dynamicBidMultiplier,
//     strategy overrides, second-price clearing vs floor
// -----------------------------------------------------------------------------

enum BidType { cpt, cpa, cpv }

enum PlacementSurface { feed, earn }
enum FeedSlotTier { top, mid, low }

enum CampaignStatus { active, paused, exhausted }

enum CampaignObjective { awareness, engagement, action, conversion }

enum AuctionPricingModel { firstPrice, secondPrice }

final class Campaign {
  Campaign({
    required this.id,
    required this.budgetUsd,
    required this.bidType,
    required this.bidValueUsd,
    required this.targetAudience,
    required this.qualityRequirement,
    this.allowedCategories = const <String>{},
    this.startedAt,
    this.endsAt,
    this.objective = CampaignObjective.awareness,
    this.dailyCapUsd,
    this.status = CampaignStatus.active,
    this.spentUsd = 0.0,
    this.dynamicBidMultiplier = 1.0,
    this.maxImpressionsPerUser = 3,
  });

  final String id;
  final double budgetUsd;
  final BidType bidType;
  final double bidValueUsd;
  final Set<String> targetAudience;
  final double qualityRequirement;
  final Set<String> allowedCategories;
  final DateTime? startedAt;
  final DateTime? endsAt;
  final CampaignObjective objective;
  final double? dailyCapUsd;
  final int maxImpressionsPerUser;
  CampaignStatus status;
  double spentUsd;
  double dynamicBidMultiplier;

  double get remainingBudgetUsd => (budgetUsd - spentUsd).clamp(0.0, budgetUsd);
}

final class UserMarketProfile {
  const UserMarketProfile({
    required this.userId,
    required this.segment,
    required this.interests,
    required this.trustScore,
    required this.engagementQuality,
    required this.demographicValue,
    required this.predictedAttentionProbability,
    required this.predictedCompletionProbability,
    this.fraudRiskScore = 0.0,
  });

  final String userId;
  final String segment;
  final Set<String> interests;
  final double trustScore; // 0..1
  final double engagementQuality; // 0..1
  final double demographicValue; // 0..1
  final double predictedAttentionProbability; // 0..1
  final double predictedCompletionProbability; // 0..1
  final double fraudRiskScore; // 0..1
}

final class MarketContext {
  const MarketContext({
    required this.timestamp,
    required this.surface,
    required this.contentCategory,
    required this.intentSignal,
    required this.timeOfDayMultiplier,
    required this.segmentDemandBids,
    required this.segmentAttentionSupplySeconds,
    this.feedPosition = 1,
    this.demandPressure = 1.0,
  });

  final DateTime timestamp;
  final PlacementSurface surface;
  final String contentCategory;
  final double intentSignal; // 0..1
  final double timeOfDayMultiplier; // >= 0
  final double segmentDemandBids; // count or weighted demand
  final double segmentAttentionSupplySeconds; // available supply
  final int feedPosition;
  final double demandPressure;
}

final class PricedCampaign {
  const PricedCampaign({
    required this.campaign,
    required this.pricePerSecondUsd,
    required this.competitionMultiplier,
    required this.userMultiplier,
    required this.contextMultiplier,
    required this.rankScore,
    required this.effectiveBidUsd,
    required this.attentionProbability,
    required this.actionProbability,
    required this.fraudMultiplier,
  });

  final Campaign campaign;
  final double pricePerSecondUsd;
  final double competitionMultiplier;
  final double userMultiplier;
  final double contextMultiplier;
  final double rankScore;
  final double effectiveBidUsd;
  final double attentionProbability;
  final double actionProbability;
  final double fraudMultiplier;
}

final class EarnOffer {
  const EarnOffer({
    required this.campaignId,
    required this.rewardPerMinuteUsd,
    required this.pricePerSecondUsd,
    required this.expectedAttentionSeconds,
  });

  final String campaignId;
  final double rewardPerMinuteUsd;
  final double pricePerSecondUsd;
  final double expectedAttentionSeconds;
}

final class BidLog {
  const BidLog({
    required this.campaignId,
    required this.userSegment,
    required this.pricePerSecondUsd,
    required this.timestamp,
  });

  final String campaignId;
  final String userSegment;
  final double pricePerSecondUsd;
  final DateTime timestamp;
}

final class AttentionEvent {
  const AttentionEvent({
    required this.userId,
    required this.campaignId,
    required this.secondsWatched,
    required this.pricePerSecondUsd,
    required this.totalValueUsd,
    required this.timestamp,
  });

  final String userId;
  final String campaignId;
  final double secondsWatched;
  final double pricePerSecondUsd;
  final double totalValueUsd;
  final DateTime timestamp;
}

final class BudgetSettlement {
  const BudgetSettlement({
    required this.success,
    required this.reason,
    required this.event,
    required this.remainingBudgetUsd,
    required this.rewardFundingUsd,
  });

  final bool success;
  final String reason;
  final AttentionEvent? event;
  final double remainingBudgetUsd;
  final double rewardFundingUsd;
}

final class AuctionOutcome {
  const AuctionOutcome({
    required this.winningCampaignId,
    required this.winningRankScore,
    required this.winningPricePerSecondUsd,
    required this.clearingPricePerSecondUsd,
    required this.pricingModel,
    required this.runnerUpCampaignId,
  });

  final String winningCampaignId;
  final double winningRankScore;
  final double winningPricePerSecondUsd;
  final double clearingPricePerSecondUsd;
  final AuctionPricingModel pricingModel;
  final String? runnerUpCampaignId;
}

final class SlotAuctionDecision {
  const SlotAuctionDecision({
    required this.outcome,
    required this.slotTier,
    required this.eligibleCampaignIds,
    required this.renderToken,
  });

  final AuctionOutcome? outcome;
  final FeedSlotTier slotTier;
  final List<String> eligibleCampaignIds;
  final String? renderToken;
}

final class MarketControls {
  const MarketControls({
    this.maxAdDensity = 0.30,
    this.minAdDensity = 0.20,
    this.rewardFloorUsdPerSecond = 0.002,
    this.maxVolatilityStep = 0.30,
    this.maxSessionsPerUserPerCampaign = 3,
    this.segmentCategoryBoost = const <String, double>{},
    this.slotTierMultipliers = const <FeedSlotTier, double>{
      FeedSlotTier.top: 1.25,
      FeedSlotTier.mid: 1.0,
      FeedSlotTier.low: 0.8,
    },
    this.secondPriceEpsilonUsdPerSecond = 0.0005,
  });

  final double maxAdDensity;
  final double minAdDensity;
  final double rewardFloorUsdPerSecond;
  final double maxVolatilityStep; // max +/- delta from previous quote
  final int maxSessionsPerUserPerCampaign;
  final Map<String, double> segmentCategoryBoost;
  final Map<FeedSlotTier, double> slotTierMultipliers;
  final double secondPriceEpsilonUsdPerSecond;
}

final class MarketStrategyOverride {
  const MarketStrategyOverride({
    this.rewardMultiplier = 1.0,
    this.globalBidMultiplier = 1.0,
    this.marketPressureMultiplier = 1.0,
    this.volatilityDamping = 1.0,
    this.campaignBidMultipliers = const <String, double>{},
    this.campaignExposureMultipliers = const <String, double>{},
  });

  final double rewardMultiplier;
  final double globalBidMultiplier;
  final double marketPressureMultiplier;
  final double volatilityDamping;
  final Map<String, double> campaignBidMultipliers;
  final Map<String, double> campaignExposureMultipliers;

  double bidMultiplierForCampaign(String campaignId) =>
      campaignBidMultipliers[campaignId] ?? 1.0;

  double exposureMultiplierForCampaign(String campaignId) =>
      campaignExposureMultipliers[campaignId] ?? 1.0;
}

final class AttentionMarketEngine {
  AttentionMarketEngine({
    this.controls = const MarketControls(),
  });

  final MarketControls controls;

  final Map<String, Campaign> _campaigns = <String, Campaign>{};
  final List<BidLog> _bidLogs = <BidLog>[];
  final List<AttentionEvent> _attentionEvents = <AttentionEvent>[];
  final Map<String, double> _lastQuotedPrice = <String, double>{};
  final Map<String, int> _sessionsByUserCampaign = <String, int>{};
  final Map<String, double> _spentTodayByCampaign = <String, double>{};
  DateTime? _spendLedgerDate;

  void registerCampaign(Campaign campaign) {
    _campaigns[campaign.id] = campaign;
  }

  Campaign? campaignById(String campaignId) => _campaigns[campaignId];

  List<BidLog> get bidLogs => List<BidLog>.unmodifiable(_bidLogs);

  List<AttentionEvent> get attentionEvents =>
      List<AttentionEvent>.unmodifiable(_attentionEvents);

  AuctionOutcome? runRealtimeAuction({
    required UserMarketProfile user,
    required MarketContext context,
    FeedSlotTier slotTier = FeedSlotTier.mid,
    AuctionPricingModel pricingModel = AuctionPricingModel.secondPrice,
    double minAuctionFloorUsdPerSecond = 0.001,
    MarketStrategyOverride strategy = const MarketStrategyOverride(),
  }) {
    final ranked = rankCampaignsForUser(
      user: user,
      context: context,
      slotTier: slotTier,
      strategy: strategy,
    );
    if (ranked.isEmpty) return null;
    final winner = ranked.first;
    final runnerUp = ranked.length > 1 ? ranked[1] : null;
    final firstPrice = winner.pricePerSecondUsd;
    final secondPrice = ((runnerUp?.pricePerSecondUsd ?? minAuctionFloorUsdPerSecond) +
            controls.secondPriceEpsilonUsdPerSecond)
        .clamp(minAuctionFloorUsdPerSecond, firstPrice)
        .toDouble();

    return AuctionOutcome(
      winningCampaignId: winner.campaign.id,
      winningRankScore: winner.rankScore,
      winningPricePerSecondUsd: firstPrice,
      clearingPricePerSecondUsd: pricingModel == AuctionPricingModel.firstPrice
          ? firstPrice
          : secondPrice,
      pricingModel: pricingModel,
      runnerUpCampaignId: runnerUp?.campaign.id,
    );
  }

  SlotAuctionDecision getAdSlot({
    required UserMarketProfile user,
    required MarketContext context,
    FeedSlotTier slotTier = FeedSlotTier.mid,
    AuctionPricingModel pricingModel = AuctionPricingModel.secondPrice,
    MarketStrategyOverride strategy = const MarketStrategyOverride(),
  }) {
    final eligibleCampaigns = getEligibleCampaigns(
      user: user,
      context: context,
      strategy: strategy,
    );
    final outcome = runRealtimeAuction(
      user: user,
      context: context,
      slotTier: slotTier,
      pricingModel: pricingModel,
      strategy: strategy,
    );
    return SlotAuctionDecision(
      outcome: outcome,
      slotTier: slotTier,
      eligibleCampaignIds: eligibleCampaigns.map((campaign) => campaign.id).toList(),
      renderToken: outcome == null ? null : 'campaign:${outcome.winningCampaignId}',
    );
  }

  List<Campaign> getEligibleCampaigns({
    required UserMarketProfile user,
    required MarketContext context,
    MarketStrategyOverride strategy = const MarketStrategyOverride(),
  }) {
    return _campaigns.values
        .where(
          (campaign) =>
              _isEligible(
                campaign: campaign,
                user: user,
                context: context,
              ) &&
              strategy.exposureMultiplierForCampaign(campaign.id) > 0.01,
        )
        .toList();
  }

  List<PricedCampaign> rankCampaignsForUser({
    required UserMarketProfile user,
    required MarketContext context,
    FeedSlotTier slotTier = FeedSlotTier.mid,
    MarketStrategyOverride strategy = const MarketStrategyOverride(),
  }) {
    final eligible = getEligibleCampaigns(
      user: user,
      context: context,
      strategy: strategy,
    );

    final priced = eligible.map((campaign) {
      final pricedCampaign = _priceCampaign(
        campaign: campaign,
        user: user,
        context: context,
        slotTier: slotTier,
        strategy: strategy,
      );
      _bidLogs.add(
        BidLog(
          campaignId: campaign.id,
          userSegment: user.segment,
          pricePerSecondUsd: pricedCampaign.pricePerSecondUsd,
          timestamp: context.timestamp,
        ),
      );
      return pricedCampaign;
    }).toList()
      ..sort((a, b) => b.rankScore.compareTo(a.rankScore));

    return priced;
  }

  List<String> buildFeedMix({
    required List<String> organicContentIds,
    required List<PricedCampaign> rankedCampaigns,
    int limit = 20,
  }) {
    final maxAds = math.min(
      rankedCampaigns.length,
      (limit * controls.maxAdDensity).floor(),
    );
    final minAds = math.min(
      rankedCampaigns.length,
      (limit * controls.minAdDensity).ceil(),
    );
    final targetAds = maxAds < minAds ? maxAds : minAds;

    final selectedAds = rankedCampaigns.take(targetAds).map((c) => c.campaign.id).toList();
    final selectedOrganic = organicContentIds.take(limit - selectedAds.length).toList();

    final out = <String>[];
    var adIdx = 0;
    var orgIdx = 0;
    final insertionEvery = targetAds == 0 ? limit : math.max(1, (limit / targetAds).round());
    while (out.length < limit &&
        (adIdx < selectedAds.length || orgIdx < selectedOrganic.length)) {
      final shouldInsertAd =
          adIdx < selectedAds.length && out.isNotEmpty && out.length % insertionEvery == 0;
      if (shouldInsertAd) {
        out.add('campaign:${selectedAds[adIdx++]}');
        continue;
      }
      if (orgIdx < selectedOrganic.length) {
        out.add('organic:${selectedOrganic[orgIdx++]}');
      } else if (adIdx < selectedAds.length) {
        out.add('campaign:${selectedAds[adIdx++]}');
      }
    }
    return out;
  }

  List<EarnOffer> buildEarnOffers({
    required List<PricedCampaign> rankedCampaigns,
    required double expectedAttentionSeconds,
    int limit = 10,
    MarketStrategyOverride strategy = const MarketStrategyOverride(),
  }) {
    return rankedCampaigns.take(limit).map((entry) {
      final rewardPerMinute = entry.pricePerSecondUsd *
          expectedAttentionSeconds *
          strategy.rewardMultiplier.clamp(0.1, 3.0).toDouble();
      return EarnOffer(
        campaignId: entry.campaign.id,
        rewardPerMinuteUsd: rewardPerMinute,
        pricePerSecondUsd: entry.pricePerSecondUsd,
        expectedAttentionSeconds: expectedAttentionSeconds,
      );
    }).toList();
  }

  BudgetSettlement settleAttentionTrade({
    required String userId,
    required String campaignId,
    required double secondsWatched,
    required double pricePerSecondUsd,
    required DateTime now,
  }) {
    _resetDailySpendIfNeeded(now);
    final campaign = _campaigns[campaignId];
    if (campaign == null) {
      return const BudgetSettlement(
        success: false,
        reason: 'campaign_not_found',
        event: null,
        remainingBudgetUsd: 0.0,
        rewardFundingUsd: 0.0,
      );
    }
    if (campaign.status != CampaignStatus.active) {
      return BudgetSettlement(
        success: false,
        reason: 'campaign_inactive',
        event: null,
        remainingBudgetUsd: campaign.remainingBudgetUsd,
        rewardFundingUsd: 0.0,
      );
    }
    if (_dailyCapReached(campaign: campaign)) {
      return BudgetSettlement(
        success: false,
        reason: 'daily_cap_reached',
        event: null,
        remainingBudgetUsd: campaign.remainingBudgetUsd,
        rewardFundingUsd: 0.0,
      );
    }
    final totalValue = (secondsWatched * pricePerSecondUsd).clamp(0.0, double.infinity);
    if (totalValue <= 0) {
      return BudgetSettlement(
        success: false,
        reason: 'invalid_trade_value',
        event: null,
        remainingBudgetUsd: campaign.remainingBudgetUsd,
        rewardFundingUsd: 0.0,
      );
    }
    if (campaign.remainingBudgetUsd < totalValue) {
      campaign.status = CampaignStatus.exhausted;
      return BudgetSettlement(
        success: false,
        reason: 'insufficient_budget',
        event: null,
        remainingBudgetUsd: campaign.remainingBudgetUsd,
        rewardFundingUsd: 0.0,
      );
    }

    campaign.spentUsd += totalValue;
    _spentTodayByCampaign[campaign.id] =
        (_spentTodayByCampaign[campaign.id] ?? 0) + totalValue;
    if (campaign.remainingBudgetUsd <= 0) {
      campaign.status = CampaignStatus.exhausted;
    }

    final event = AttentionEvent(
      userId: userId,
      campaignId: campaignId,
      secondsWatched: secondsWatched,
      pricePerSecondUsd: pricePerSecondUsd,
      totalValueUsd: totalValue,
      timestamp: now,
    );
    _attentionEvents.add(event);
    _incrementSession(userId: userId, campaignId: campaignId);

    return BudgetSettlement(
      success: true,
      reason: 'settled',
      event: event,
      remainingBudgetUsd: campaign.remainingBudgetUsd,
      rewardFundingUsd: totalValue,
    );
  }

  PricedCampaign _priceCampaign({
    required Campaign campaign,
    required UserMarketProfile user,
    required MarketContext context,
    required FeedSlotTier slotTier,
    required MarketStrategyOverride strategy,
  }) {
    final competition = _competitionMultiplier(context) *
        strategy.marketPressureMultiplier.clamp(0.4, 2.5).toDouble();
    final userMultiplier = _userMultiplier(user);
    final contextMultiplier = _contextMultiplier(context, slotTier: slotTier);
    final attentionProbability =
        user.predictedAttentionProbability.clamp(0.0, 1.0).toDouble();
    final actionProbability =
        user.predictedCompletionProbability.clamp(0.0, 1.0).toDouble();
    final fraudMultiplier = (1.0 - user.fraudRiskScore.clamp(0.0, 1.0).toDouble())
        .clamp(0.1, 1.0)
        .toDouble();
    final effectiveBid = campaign.bidValueUsd *
        campaign.dynamicBidMultiplier *
        strategy.globalBidMultiplier.clamp(0.4, 3.0).toDouble() *
        strategy.bidMultiplierForCampaign(campaign.id).clamp(0.4, 4.0).toDouble() *
        attentionProbability *
        actionProbability *
        user.trustScore.clamp(0.0, 1.0).toDouble() *
        fraudMultiplier;
    final rawPrice = effectiveBid * competition * userMultiplier * contextMultiplier;
    final smoothedPrice = _smoothedPrice(
      campaign.id,
      rawPrice,
      damping: strategy.volatilityDamping,
    );
    final pricePerSecond = math.max(smoothedPrice, controls.rewardFloorUsdPerSecond);

    final score = effectiveBid * competition * contextMultiplier;

    return PricedCampaign(
      campaign: campaign,
      pricePerSecondUsd: pricePerSecond,
      competitionMultiplier: competition,
      userMultiplier: userMultiplier,
      contextMultiplier: contextMultiplier,
      rankScore: score,
      effectiveBidUsd: effectiveBid,
      attentionProbability: attentionProbability,
      actionProbability: actionProbability,
      fraudMultiplier: fraudMultiplier,
    );
  }

  bool _isEligible({
    required Campaign campaign,
    required UserMarketProfile user,
    required MarketContext context,
  }) {
    if (campaign.status != CampaignStatus.active) return false;
    if (campaign.remainingBudgetUsd <= 0) return false;
    if (_dailyCapReached(campaign: campaign)) return false;
    if (user.trustScore < campaign.qualityRequirement) return false;
    if (campaign.targetAudience.isNotEmpty &&
        campaign.targetAudience.intersection(user.interests).isEmpty) {
      return false;
    }
    if (campaign.allowedCategories.isNotEmpty &&
        !campaign.allowedCategories.contains(context.contentCategory)) {
      return false;
    }
    if (campaign.startedAt != null && context.timestamp.isBefore(campaign.startedAt!)) {
      return false;
    }
    if (campaign.endsAt != null && context.timestamp.isAfter(campaign.endsAt!)) {
      return false;
    }
    final sessionCount = _sessionsFor(userId: user.userId, campaignId: campaign.id);
    if (sessionCount >= controls.maxSessionsPerUserPerCampaign ||
        sessionCount >= campaign.maxImpressionsPerUser) {
      return false;
    }
    return true;
  }

  bool _dailyCapReached({required Campaign campaign}) {
    final cap = campaign.dailyCapUsd;
    if (cap == null || cap <= 0) return false;
    final spentToday = _spentTodayByCampaign[campaign.id] ?? 0.0;
    return spentToday >= cap;
  }

  void _resetDailySpendIfNeeded(DateTime now) {
    final dateOnly = DateTime(now.year, now.month, now.day);
    if (_spendLedgerDate == null || _spendLedgerDate != dateOnly) {
      _spendLedgerDate = dateOnly;
      _spentTodayByCampaign.clear();
    }
  }

  double _competitionMultiplier(MarketContext context) {
    final supply = math.max(1e-9, context.segmentAttentionSupplySeconds);
    final ratio = context.segmentDemandBids / supply;
    return ratio.clamp(0.25, 4.0).toDouble();
  }

  double _userMultiplier(UserMarketProfile user) {
    return (user.trustScore.clamp(0.0, 1.0) *
            user.engagementQuality.clamp(0.0, 1.0) *
            user.demographicValue.clamp(0.0, 1.0))
        .clamp(0.1, 2.5)
        .toDouble();
  }

  double _contextMultiplier(MarketContext context, {required FeedSlotTier slotTier}) {
    final categoryBoost = controls.segmentCategoryBoost[context.contentCategory] ?? 1.0;
    final intentBoost = (0.75 + context.intentSignal.clamp(0.0, 1.0).toDouble());
    final slotMultiplier = controls.slotTierMultipliers[slotTier] ?? 1.0;
    return (context.timeOfDayMultiplier *
            categoryBoost *
            intentBoost *
            slotMultiplier *
            context.demandPressure.clamp(0.5, 3.0).toDouble())
        .clamp(0.2, 3.0)
        .toDouble();
  }

  double _smoothedPrice(
    String campaignId,
    double nextPrice, {
    double damping = 1.0,
  }) {
    final previous = _lastQuotedPrice[campaignId];
    if (previous == null) {
      _lastQuotedPrice[campaignId] = nextPrice;
      return nextPrice;
    }
    final dampedStep = (controls.maxVolatilityStep * damping.clamp(0.1, 2.0))
        .clamp(0.01, 1.0)
        .toDouble();
    final maxDelta = previous * dampedStep;
    final lower = previous - maxDelta;
    final upper = previous + maxDelta;
    final smoothed = nextPrice.clamp(lower, upper).toDouble();
    _lastQuotedPrice[campaignId] = smoothed;
    return smoothed;
  }

  int _sessionsFor({
    required String userId,
    required String campaignId,
  }) {
    final key = '$userId::$campaignId';
    return _sessionsByUserCampaign[key] ?? 0;
  }

  void _incrementSession({
    required String userId,
    required String campaignId,
  }) {
    final key = '$userId::$campaignId';
    _sessionsByUserCampaign[key] = (_sessionsByUserCampaign[key] ?? 0) + 1;
  }

  void tuneCampaignBid({
    required String campaignId,
    required double performanceScore,
    required double competitionLevel,
    required double budgetDrainRate,
  }) {
    final campaign = _campaigns[campaignId];
    if (campaign == null) return;
    final underperformingBoost =
        performanceScore < 0.45 ? (1.0 + (0.45 - performanceScore)) : 1.0;
    final competitionBoost = 1.0 + competitionLevel.clamp(0.0, 1.0) * 0.35;
    final drainBrake = 1.0 - budgetDrainRate.clamp(0.0, 1.0) * 0.5;
    campaign.dynamicBidMultiplier =
        (underperformingBoost * competitionBoost * drainBrake).clamp(0.5, 2.5).toDouble();
  }
}
