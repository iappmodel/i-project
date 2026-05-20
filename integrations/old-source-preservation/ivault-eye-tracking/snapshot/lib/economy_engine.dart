// CLIENT SIMULATION / NON-AUTHORITATIVE
// This module is for client-side preview/simulation UX only.
// It must not be treated as the canonical writer for economy, wallet, trust, fraud, campaign, or POPS economic state.
// Backend/API source-of-truth ownership is documented in:
// docs/source-of-truth-ownership-contract.md
// docs/runtime-wiring-matrix.md

import 'dart:math' as math;

enum EconomyTransactionType {
  advertiserInflow,
  rewardPending,
  rewardApproved,
  rewardRejected,
  convert,
  spend,
  withdraw,
  burn,
  sink,
}

enum EconomyTransactionStatus { pending, confirmed, rejected }

enum RewardQualityTier {
  botLike,
  average,
  highAttention,
}

final class EconomyConfig {
  const EconomyConfig({
    this.distributionRate = 0.08,
    this.maxRewardChangeRatePerDay = 0.20,
    this.rewardFloorUsd = 0.01,
    this.rewardCeilingUsd = 0.40,
    this.baseRewardUsd = 0.10,
    this.dailyRewardPerUserCapUsd = 10.0,
    this.withdrawBaseCapUsd = 20.0,
    this.burnRateOnSpend = 0.02,
    this.burnRateOnConvert = 0.01,
    this.viewerShare = 0.30,
    this.creatorShare = 0.60,
    this.platformShare = 0.10,
    this.minimumTrustForDirectConvert = 0.55,
    this.pendingConfirmationDelay = const Duration(hours: 6),
  }) : assert(distributionRate >= 0 && distributionRate <= 1),
       assert(maxRewardChangeRatePerDay >= 0 && maxRewardChangeRatePerDay <= 1),
       assert(rewardFloorUsd >= 0),
       assert(rewardCeilingUsd >= rewardFloorUsd),
       assert(baseRewardUsd >= 0),
       assert(dailyRewardPerUserCapUsd >= 0),
       assert(withdrawBaseCapUsd >= 0),
       assert(burnRateOnSpend >= 0 && burnRateOnSpend <= 1),
       assert(burnRateOnConvert >= 0 && burnRateOnConvert <= 1),
       assert(viewerShare >= 0),
       assert(creatorShare >= 0),
       assert(platformShare >= 0),
       assert(
         ((viewerShare + creatorShare + platformShare) - 1.0).abs() < 0.000001,
       ),
       assert(minimumTrustForDirectConvert >= 0 && minimumTrustForDirectConvert <= 1);

  final double distributionRate;
  final double maxRewardChangeRatePerDay;
  final double rewardFloorUsd;
  final double rewardCeilingUsd;
  final double baseRewardUsd;
  final double dailyRewardPerUserCapUsd;
  final double withdrawBaseCapUsd;
  final double burnRateOnSpend;
  final double burnRateOnConvert;
  final double viewerShare;
  final double creatorShare;
  final double platformShare;
  final double minimumTrustForDirectConvert;
  final Duration pendingConfirmationDelay;
}

final class EconomyState {
  const EconomyState({
    required this.totalSupply,
    required this.circulatingSupply,
    required this.burnedSupply,
    required this.activeBudget,
    required this.dailyEmission,
    required this.avgReward,
    required this.pricePerAttention,
  });

  final double totalSupply;
  final double circulatingSupply;
  final double burnedSupply;
  final double activeBudget;
  final double dailyEmission;
  final double avgReward;
  final double pricePerAttention;
}

final class EconomyCampaign {
  EconomyCampaign({
    required this.id,
    required this.budgetUsd,
    required this.startTime,
    required this.endTime,
  }) : rewardPoolUsd = budgetUsd,
       reservedUsd = 0,
       spentUsd = 0,
       remainingUsd = budgetUsd;

  final String id;
  final double budgetUsd;
  final DateTime startTime;
  final DateTime endTime;

  double rewardPoolUsd;
  double reservedUsd;
  double spentUsd;
  double remainingUsd;

  bool get isActive {
    final now = DateTime.now();
    return now.isAfter(startTime) && now.isBefore(endTime) && remainingUsd > 0;
  }
}

final class EconomyTransaction {
  const EconomyTransaction({
    required this.id,
    required this.userId,
    required this.type,
    required this.amount,
    required this.currency,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final EconomyTransactionType type;
  final double amount;
  final String currency;
  final EconomyTransactionStatus status;
  final DateTime createdAt;
}

final class PendingRewardLedger {
  PendingRewardLedger({
    required this.id,
    required this.userId,
    required this.creatorId,
    required this.campaignId,
    required this.rCoins,
    required this.createdAt,
    required this.unlockAt,
  });

  final String id;
  final String userId;
  final String creatorId;
  final String campaignId;
  final double rCoins;
  final DateTime createdAt;
  final DateTime unlockAt;
  bool approved = false;
  bool rejected = false;
}

final class RewardQuote {
  const RewardQuote({
    required this.pricePerAttention,
    required this.qualityMultiplier,
    required this.scarcityMultiplier,
    required this.rewardUsd,
  });

  final double pricePerAttention;
  final double qualityMultiplier;
  final double scarcityMultiplier;
  final double rewardUsd;
}

final class RewardSplitQuote {
  const RewardSplitQuote({
    required this.viewer,
    required this.creator,
    required this.platform,
  });

  final double viewer;
  final double creator;
  final double platform;
}

final class EconomyEngine {
  EconomyEngine({this.config = const EconomyConfig()});

  final EconomyConfig config;

  final Map<String, EconomyCampaign> _campaigns = <String, EconomyCampaign>{};
  final Map<String, PendingRewardLedger> _pendingRewards =
      <String, PendingRewardLedger>{};
  final Map<String, double> _rCoinsByUser = <String, double>{};
  final Map<String, double> _iCoinsByUser = <String, double>{};
  final Map<String, double> _earnedTodayByUser = <String, double>{};
  final Map<String, DateTime> _earnedDayAnchorByUser = <String, DateTime>{};
  final List<EconomyTransaction> _transactions = <EconomyTransaction>[];

  double _activeBudgetUsd = 0;
  double _dailyEmissionUsd = 0;
  double _circulatingICoins = 0;
  double _burnedICoins = 0;
  double _platformTreasuryICoins = 0;
  double _lastAverageRewardUsd = 0.10;
  double _lastPricePerAttention = 0.10;
  int _idCounter = 0;

  List<EconomyTransaction> get transactions =>
      List<EconomyTransaction>.unmodifiable(_transactions);

  EconomyState state() {
    final totalSupply = _circulatingICoins + _burnedICoins;
    return EconomyState(
      totalSupply: totalSupply,
      circulatingSupply: _circulatingICoins,
      burnedSupply: _burnedICoins,
      activeBudget: _activeBudgetUsd,
      dailyEmission: _dailyEmissionUsd,
      avgReward: _lastAverageRewardUsd,
      pricePerAttention: _lastPricePerAttention,
    );
  }

  void registerCampaign(EconomyCampaign campaign) {
    _campaigns[campaign.id] = campaign;
    _activeBudgetUsd += campaign.remainingUsd;
    _recomputeDailyEmission();
    _recordTx(
      userId: 'advertiser:${campaign.id}',
      type: EconomyTransactionType.advertiserInflow,
      amount: campaign.budgetUsd,
      currency: 'iCoins',
      status: EconomyTransactionStatus.confirmed,
    );
  }

  RewardQuote quoteReward({
    required double demand,
    required double supply,
    required double completionRate,
    required double attentionQuality,
    required double trustScore,
    required double engagementDepth,
  }) {
    final effectiveSupply = math.max(0.000001, supply);
    final rawPrice = (demand / effectiveSupply) *
        _qualityFactor(
          completionRate: completionRate,
          attentionQuality: attentionQuality,
          trustScore: trustScore,
          engagementDepth: engagementDepth,
        );
    final pricePerAttention = _smoothRateChange(
      previous: _lastPricePerAttention,
      next: rawPrice,
    );
    _lastPricePerAttention = pricePerAttention;

    final qualityMultiplier = _rewardQualityMultiplier(
      attentionQuality: attentionQuality,
      trustScore: trustScore,
      completionRate: completionRate,
    );
    final scarcityMultiplier = _scarcityMultiplier(demand: demand, supply: supply);

    final rewardRaw = config.baseRewardUsd * qualityMultiplier * scarcityMultiplier;
    final reward = _smoothRateChange(
      previous: _lastAverageRewardUsd,
      next: rewardRaw,
    ).clamp(config.rewardFloorUsd, config.rewardCeilingUsd);
    _lastAverageRewardUsd = reward.toDouble();

    return RewardQuote(
      pricePerAttention: pricePerAttention,
      qualityMultiplier: qualityMultiplier,
      scarcityMultiplier: scarcityMultiplier,
      rewardUsd: reward.toDouble(),
    );
  }

  PendingRewardLedger createPendingReward({
    required String userId,
    required String creatorId,
    required String campaignId,
    required double rewardUsd,
    required DateTime now,
  }) {
    final campaign = _campaigns[campaignId];
    if (campaign == null) {
      throw StateError('Campaign not found: $campaignId');
    }
    _resetDailyBucketIfNeeded(userId: userId, now: now);
    final earnedToday = _earnedTodayByUser[userId] ?? 0;
    if (earnedToday + rewardUsd > config.dailyRewardPerUserCapUsd) {
      throw StateError('Daily user emission cap exceeded.');
    }
    if (campaign.remainingUsd < rewardUsd) {
      throw StateError('Campaign budget exhausted.');
    }
    if (_dailyEmissionUsd < rewardUsd) {
      throw StateError('Daily emission cap exceeded.');
    }

    campaign.remainingUsd -= rewardUsd;
    campaign.reservedUsd += rewardUsd;
    _activeBudgetUsd = (_activeBudgetUsd - rewardUsd).clamp(0.0, double.infinity);
    _dailyEmissionUsd = (_dailyEmissionUsd - rewardUsd).clamp(0.0, double.infinity);

    final pending = PendingRewardLedger(
      id: _nextId('pending'),
      userId: userId,
      creatorId: creatorId,
      campaignId: campaignId,
      rCoins: rewardUsd,
      createdAt: now,
      unlockAt: now.add(config.pendingConfirmationDelay),
    );
    _pendingRewards[pending.id] = pending;
    _rCoinsByUser[userId] = (_rCoinsByUser[userId] ?? 0) + rewardUsd;
    _earnedTodayByUser[userId] = earnedToday + rewardUsd;
    _recordTx(
      userId: userId,
      type: EconomyTransactionType.rewardPending,
      amount: rewardUsd,
      currency: 'rCoins',
      status: EconomyTransactionStatus.pending,
    );
    return pending;
  }

  RewardSplitQuote approvePendingReward({
    required String pendingRewardId,
    required double trustScore,
    required bool fraudFlagged,
    required DateTime now,
  }) {
    final pending = _pendingRewards[pendingRewardId];
    if (pending == null || pending.rejected) {
      throw StateError('Pending reward not found.');
    }
    if (pending.approved) {
      throw StateError('Pending reward already approved.');
    }
    if (fraudFlagged) {
      rejectPendingReward(pendingRewardId: pendingRewardId, now: now);
      throw StateError('Reward rejected due to fraud.');
    }
    if (now.isBefore(pending.unlockAt)) {
      throw StateError('Pending delay window not elapsed.');
    }
    if (trustScore < config.minimumTrustForDirectConvert) {
      throw StateError('Trust threshold not met for conversion.');
    }

    final campaign = _campaigns[pending.campaignId];
    if (campaign == null) {
      throw StateError('Campaign not found for pending reward.');
    }
    // Rule 3: budget must be locked before reward approval.
    if (campaign.reservedUsd + 1e-9 < pending.rCoins) {
      throw StateError(
        'Campaign budget reserve missing or insufficient for approval '
        '(reservedUsd=${campaign.reservedUsd}, pending=${pending.rCoins}).',
      );
    }
    campaign.reservedUsd = (campaign.reservedUsd - pending.rCoins).clamp(
      0.0,
      double.infinity,
    );
    campaign.spentUsd += pending.rCoins;

    pending.approved = true;

    final conversionBurn = pending.rCoins * config.burnRateOnConvert;
    final convertedToICoins = (pending.rCoins - conversionBurn).clamp(
      0.0,
      double.infinity,
    );

    _rCoinsByUser[pending.userId] =
        ((_rCoinsByUser[pending.userId] ?? 0) - pending.rCoins).clamp(
          0.0,
          double.infinity,
        );

    final split = splitReward(convertedToICoins);
    _iCoinsByUser[pending.userId] = (_iCoinsByUser[pending.userId] ?? 0) + split.viewer;
    _iCoinsByUser[pending.creatorId] =
        (_iCoinsByUser[pending.creatorId] ?? 0) + split.creator;
    _platformTreasuryICoins += split.platform;
    _circulatingICoins += convertedToICoins;
    _burnedICoins += conversionBurn;

    _recordTx(
      userId: pending.userId,
      type: EconomyTransactionType.convert,
      amount: convertedToICoins,
      currency: 'iCoins',
      status: EconomyTransactionStatus.confirmed,
    );
    _recordTx(
      userId: pending.userId,
      type: EconomyTransactionType.rewardApproved,
      amount: pending.rCoins,
      currency: 'rCoins',
      status: EconomyTransactionStatus.confirmed,
    );
    if (conversionBurn > 0) {
      _recordTx(
        userId: pending.userId,
        type: EconomyTransactionType.burn,
        amount: conversionBurn,
        currency: 'iCoins',
        status: EconomyTransactionStatus.confirmed,
      );
    }
    return split;
  }

  void rejectPendingReward({
    required String pendingRewardId,
    required DateTime now,
  }) {
    final pending = _pendingRewards[pendingRewardId];
    if (pending == null || pending.approved || pending.rejected) {
      return;
    }
    pending.rejected = true;
    _rCoinsByUser[pending.userId] =
        ((_rCoinsByUser[pending.userId] ?? 0) - pending.rCoins).clamp(
          0.0,
          double.infinity,
        );
    final campaign = _campaigns[pending.campaignId];
    if (campaign != null) {
      campaign.remainingUsd += pending.rCoins;
      campaign.reservedUsd = (campaign.reservedUsd - pending.rCoins).clamp(
        0.0,
        double.infinity,
      );
      _activeBudgetUsd += pending.rCoins;
      _dailyEmissionUsd += pending.rCoins;
    }
    _recordTx(
      userId: pending.userId,
      type: EconomyTransactionType.rewardRejected,
      amount: pending.rCoins,
      currency: 'rCoins',
      status: EconomyTransactionStatus.rejected,
    );
    final earned = _earnedTodayByUser[pending.userId] ?? 0;
    _earnedTodayByUser[pending.userId] = (earned - pending.rCoins).clamp(
      0.0,
      double.infinity,
    );
    // Keep "now" argument consumed for deterministic call sites.
    if (now.millisecondsSinceEpoch < 0) {
      throw StateError('Invalid timestamp.');
    }
  }

  double spendICoins({
    required String userId,
    required double amount,
    required bool countsAsSink,
  }) {
    final current = _iCoinsByUser[userId] ?? 0;
    if (amount <= 0 || current < amount) {
      throw StateError('Insufficient iCoins balance.');
    }
    final burn = amount * config.burnRateOnSpend;
    final sinked = (amount - burn).clamp(0.0, double.infinity);
    _iCoinsByUser[userId] = current - amount;
    _circulatingICoins = (_circulatingICoins - amount).clamp(0.0, double.infinity);
    _burnedICoins += burn;
    if (countsAsSink && sinked > 0) {
      _recordTx(
        userId: userId,
        type: EconomyTransactionType.sink,
        amount: sinked,
        currency: 'iCoins',
        status: EconomyTransactionStatus.confirmed,
      );
    }
    _recordTx(
      userId: userId,
      type: EconomyTransactionType.spend,
      amount: amount,
      currency: 'iCoins',
      status: EconomyTransactionStatus.confirmed,
    );
    if (burn > 0) {
      _recordTx(
        userId: userId,
        type: EconomyTransactionType.burn,
        amount: burn,
        currency: 'iCoins',
        status: EconomyTransactionStatus.confirmed,
      );
    }
    return sinked;
  }

  double requestWithdraw({
    required String userId,
    required double requestedAmount,
    required double trustScore,
    required bool fraudFlagged,
  }) {
    if (fraudFlagged) {
      throw StateError('Withdraw blocked due to fraud flags.');
    }
    final available = _iCoinsByUser[userId] ?? 0;
    if (requestedAmount <= 0 || available <= 0) {
      throw StateError('No liquidity for withdrawal.');
    }
    final trust = trustScore.clamp(0.0, 1.0).toDouble();
    final cap = (config.withdrawBaseCapUsd * (0.3 + trust * 0.7)).clamp(
      0.0,
      config.withdrawBaseCapUsd,
    );
    final allowed = math.min(requestedAmount, math.min(cap, available));
    _iCoinsByUser[userId] = available - allowed;
    _circulatingICoins = (_circulatingICoins - allowed).clamp(0.0, double.infinity);
    _recordTx(
      userId: userId,
      type: EconomyTransactionType.withdraw,
      amount: allowed,
      currency: 'iCoins',
      status: EconomyTransactionStatus.confirmed,
    );
    return allowed;
  }

  RewardQualityTier classifyRewardTier({
    required double trustScore,
    required double attentionQuality,
  }) {
    if (trustScore < 0.25 || attentionQuality < 0.2) {
      return RewardQualityTier.botLike;
    }
    if (trustScore >= 0.75 && attentionQuality >= 0.75) {
      return RewardQualityTier.highAttention;
    }
    return RewardQualityTier.average;
  }

  double iCoinsForUser(String userId) => _iCoinsByUser[userId] ?? 0;
  double rCoinsForUser(String userId) => _rCoinsByUser[userId] ?? 0;
  double get platformTreasuryICoins => _platformTreasuryICoins;

  RewardSplitQuote splitReward(double amount) {
    return RewardSplitQuote(
      viewer: amount * config.viewerShare,
      creator: amount * config.creatorShare,
      platform: amount * config.platformShare,
    );
  }

  void _recomputeDailyEmission() {
    _dailyEmissionUsd = _activeBudgetUsd * config.distributionRate;
  }

  double _qualityFactor({
    required double completionRate,
    required double attentionQuality,
    required double trustScore,
    required double engagementDepth,
  }) {
    final completion = completionRate.clamp(0.0, 1.0).toDouble();
    final quality = attentionQuality.clamp(0.0, 1.0).toDouble();
    final trust = trustScore.clamp(0.0, 1.0).toDouble();
    final depth = engagementDepth.clamp(0.0, 1.0).toDouble();
    return (0.4 * completion) + (0.25 * quality) + (0.25 * trust) + (0.1 * depth);
  }

  double _rewardQualityMultiplier({
    required double attentionQuality,
    required double trustScore,
    required double completionRate,
  }) {
    final quality = attentionQuality.clamp(0.0, 1.0).toDouble();
    final trust = trustScore.clamp(0.0, 1.0).toDouble();
    final completion = completionRate.clamp(0.0, 1.0).toDouble();
    return (0.4 + quality * 0.5 + trust * 0.3 + completion * 0.3).clamp(0.2, 2.2);
  }

  double _scarcityMultiplier({required double demand, required double supply}) {
    final ratio = demand / math.max(0.000001, supply);
    return ratio.clamp(0.5, 3.0).toDouble();
  }

  double _smoothRateChange({
    required double previous,
    required double next,
  }) {
    if (previous <= 0) {
      return next;
    }
    final maxDelta = previous * config.maxRewardChangeRatePerDay;
    final lower = previous - maxDelta;
    final upper = previous + maxDelta;
    return next.clamp(lower, upper).toDouble();
  }

  void _resetDailyBucketIfNeeded({
    required String userId,
    required DateTime now,
  }) {
    final day = DateTime(now.year, now.month, now.day);
    final anchor = _earnedDayAnchorByUser[userId];
    if (anchor == null || anchor != day) {
      _earnedDayAnchorByUser[userId] = day;
      _earnedTodayByUser[userId] = 0;
    }
  }

  void _recordTx({
    required String userId,
    required EconomyTransactionType type,
    required double amount,
    required String currency,
    required EconomyTransactionStatus status,
  }) {
    _transactions.add(
      EconomyTransaction(
        id: _nextId('tx'),
        userId: userId,
        type: type,
        amount: amount,
        currency: currency,
        status: status,
        createdAt: DateTime.now(),
      ),
    );
  }

  String _nextId(String prefix) {
    _idCounter += 1;
    return '$prefix-$_idCounter';
  }
}
