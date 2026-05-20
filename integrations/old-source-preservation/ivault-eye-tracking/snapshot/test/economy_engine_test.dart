import 'package:eye_tracking_app/economy_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('EconomyEngine', () {
    test('creates a closed pending -> approved reward loop', () {
      final engine = EconomyEngine();
      final now = DateTime(2026, 4, 25, 10);
      engine.registerCampaign(
        EconomyCampaign(
          id: 'c1',
          budgetUsd: 1000,
          startTime: now.subtract(const Duration(days: 1)),
          endTime: now.add(const Duration(days: 2)),
        ),
      );

      final pending = engine.createPendingReward(
        userId: 'u1',
        creatorId: 'creator-7',
        campaignId: 'c1',
        rewardUsd: 0.30,
        now: now,
      );

      expect(engine.rCoinsForUser('u1'), closeTo(0.30, 0.0001));
      expect(engine.iCoinsForUser('u1'), 0.0);

      final split = engine.approvePendingReward(
        pendingRewardId: pending.id,
        trustScore: 0.9,
        fraudFlagged: false,
        now: now.add(const Duration(hours: 8)),
      );

      expect(split.viewer, closeTo(0.0891, 0.0001));
      expect(split.creator, closeTo(0.1782, 0.0001));
      expect(split.platform, closeTo(0.0297, 0.0001));
      expect(engine.rCoinsForUser('u1'), 0.0);
      expect(engine.iCoinsForUser('u1'), closeTo(0.0891, 0.0001));
      expect(engine.iCoinsForUser('creator-7'), closeTo(0.1782, 0.0001));
      expect(engine.platformTreasuryICoins, closeTo(0.0297, 0.0001));
    });

    test('caps reward volatility and enforces floor/ceiling', () {
      final engine = EconomyEngine(
        config: const EconomyConfig(
          baseRewardUsd: 0.10,
          rewardFloorUsd: 0.01,
          rewardCeilingUsd: 0.40,
          maxRewardChangeRatePerDay: 0.20,
        ),
      );

      final first = engine.quoteReward(
        demand: 100,
        supply: 100,
        completionRate: 0.5,
        attentionQuality: 0.5,
        trustScore: 0.5,
        engagementDepth: 0.5,
      );
      expect(first.rewardUsd, closeTo(0.12, 0.0001));

      final hugeDemand = engine.quoteReward(
        demand: 10000,
        supply: 10,
        completionRate: 1.0,
        attentionQuality: 1.0,
        trustScore: 1.0,
        engagementDepth: 1.0,
      );
      // 20% max step from previous quote, despite very high raw demand.
      expect(hugeDemand.rewardUsd, closeTo(0.144, 0.0001));

      final collapseDemand = engine.quoteReward(
        demand: 1,
        supply: 10000,
        completionRate: 0.0,
        attentionQuality: 0.0,
        trustScore: 0.0,
        engagementDepth: 0.0,
      );
      // Smoothed down but still within configured floor.
      expect(collapseDemand.rewardUsd, greaterThanOrEqualTo(0.01));
    });

    test('throttles withdraw by trust-derived liquidity cap', () {
      final engine = EconomyEngine();
      final now = DateTime(2026, 4, 25, 10);
      engine.registerCampaign(
        EconomyCampaign(
          id: 'c2',
          budgetUsd: 100,
          startTime: now.subtract(const Duration(days: 1)),
          endTime: now.add(const Duration(days: 1)),
        ),
      );
      final pending = engine.createPendingReward(
        userId: 'u2',
        creatorId: 'creator-2',
        campaignId: 'c2',
        rewardUsd: 20,
        now: now,
      );
      engine.approvePendingReward(
        pendingRewardId: pending.id,
        trustScore: 1.0,
        fraudFlagged: false,
        now: now.add(const Duration(hours: 8)),
      );
      final withdrawn = engine.requestWithdraw(
        userId: 'u2',
        requestedAmount: 20,
        trustScore: 0.2,
        fraudFlagged: false,
      );
      // cap = 20 * (0.3 + 0.2*0.7) = 8.8, but user has only viewer split balance 5.94.
      expect(withdrawn, closeTo(5.94, 0.0001));
      expect(engine.iCoinsForUser('u2'), 0.0);
    });

    test('applies burn and sink mechanics on spend', () {
      final engine = EconomyEngine();
      final now = DateTime(2026, 4, 25, 10);
      engine.registerCampaign(
        EconomyCampaign(
          id: 'c3',
          budgetUsd: 100,
          startTime: now.subtract(const Duration(days: 1)),
          endTime: now.add(const Duration(days: 1)),
        ),
      );
      final pending = engine.createPendingReward(
        userId: 'u3',
        creatorId: 'creator-3',
        campaignId: 'c3',
        rewardUsd: 10,
        now: now,
      );
      engine.approvePendingReward(
        pendingRewardId: pending.id,
        trustScore: 1.0,
        fraudFlagged: false,
        now: now.add(const Duration(hours: 8)),
      );

      final sinked = engine.spendICoins(
        userId: 'u3',
        amount: 2.0,
        countsAsSink: true,
      );

      expect(sinked, closeTo(1.96, 0.0001));
      final state = engine.state();
      expect(state.burnedSupply, closeTo(0.14, 0.0001));
    });
  });
}
