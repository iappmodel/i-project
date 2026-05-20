import 'package:eye_tracking_app/admin/admin_console.dart';
import 'package:eye_tracking_app/economy_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AdminConsoleEngine', () {
    test('every mutating flow writes audit; ledger carries settlement intent', () {
      final admin = AdminConsoleEngine();
      admin.submitCampaignReview(
        actorId: 'admin-1',
        campaignId: 'c1',
        decision: 'approved',
        notes: 'creative ok',
      );
      admin.setCampaignPaused(
        actorId: 'admin-1',
        campaignId: 'c1',
        paused: true,
        pauseReason: 'compliance hold',
      );
      admin.proposeManualBalanceAdjustment(
        actorId: 'admin-1',
        userId: 'u1',
        currency: 'iCoins',
        delta: 1.5,
        justification: 'make-good for outage ticket 42',
      );

      expect(admin.auditLogs.length, 3);
      expect(admin.ledgerEvents.length, 3);
      expect(admin.isCampaignPaused('c1'), isTrue);
      expect(
        admin.ledgerEvents.map((e) => e.kind).toList(),
        containsAll(<AdminLedgerEventKind>[
          AdminLedgerEventKind.campaignReviewDecision,
          AdminLedgerEventKind.campaignPauseToggle,
          AdminLedgerEventKind.manualBalanceAdjustment,
        ]),
      );
    });

    test('wallet and trust views append audit without ledger events', () {
      final admin = AdminConsoleEngine();
      final economy = EconomyEngine();
      final now = DateTime.utc(2026, 4, 25);
      economy.registerCampaign(
        EconomyCampaign(
          id: 'c1',
          budgetUsd: 100,
          startTime: now.subtract(const Duration(days: 1)),
          endTime: now.add(const Duration(days: 1)),
        ),
      );
      economy.createPendingReward(
        userId: 'u1',
        creatorId: 'cr',
        campaignId: 'c1',
        rewardUsd: 0.2,
        now: now,
      );

      admin.recordWalletLedgerView(actorId: 'admin-2', userId: 'u1', economy: economy);
      admin.recordTrustScoreView(
        actorId: 'admin-2',
        userId: 'u1',
        snapshot: const {'score': 720, 'level': 'trusted'},
      );

      expect(admin.auditLogs.length, 2);
      expect(admin.ledgerEvents, isEmpty);
      expect(admin.auditLogs.first.module, AdminConsoleModule.walletLedgerViewer);
      expect(admin.auditLogs.last.module, AdminConsoleModule.trustScoreViewer);
    });

    test('fraud queue disposition writes critical audit + ledger', () {
      final admin = AdminConsoleEngine();
      final c = admin.enqueueFraudReview(actorId: 'admin-3', userId: 'u9', reason: 'velocity');
      admin.disposeFraudCase(
        actorId: 'admin-3',
        caseId: c.id,
        disposition: 'escalate',
        pendingRewardId: 'pending-1',
      );
      expect(admin.fraudQueue.single.open, isFalse);
      expect(admin.auditLogs.length, 2);
      expect(admin.ledgerEvents.single.kind, AdminLedgerEventKind.fraudCaseDisposition);
    });

    test('manual adjustment requires justification', () {
      final admin = AdminConsoleEngine();
      expect(
        () => admin.proposeManualBalanceAdjustment(
          actorId: 'a',
          userId: 'u',
          currency: 'rCoins',
          delta: -1,
          justification: '   ',
        ),
        throwsArgumentError,
      );
    });
  });

  group('AdminLedgerApplier', () {
    test('maps approve/reject to EconomyEngine public APIs', () {
      final economy = EconomyEngine();
      final now = DateTime.utc(2026, 4, 25, 12);
      economy.registerCampaign(
        EconomyCampaign(
          id: 'c1',
          budgetUsd: 500,
          startTime: now.subtract(const Duration(days: 1)),
          endTime: now.add(const Duration(days: 2)),
        ),
      );
      final pending = economy.createPendingReward(
        userId: 'u1',
        creatorId: 'cr',
        campaignId: 'c1',
        rewardUsd: 0.5,
        now: now,
      );
      const applier = AdminLedgerApplier();
      final rejectEvent = AdminLedgerEvent(
        id: 'e1',
        createdAt: now,
        kind: AdminLedgerEventKind.rewardPipelineReject,
        actorId: 'admin',
        correlationId: 'corr-1',
        pendingRewardId: pending.id,
      );
      expect(applier.apply(economy: economy, event: rejectEvent, now: now.add(const Duration(hours: 8))), isTrue);
      expect(economy.rCoinsForUser('u1'), 0.0);

      final pending2 = economy.createPendingReward(
        userId: 'u1',
        creatorId: 'cr',
        campaignId: 'c1',
        rewardUsd: 0.4,
        now: now,
      );
      final approveEvent = AdminLedgerEvent(
        id: 'e2',
        createdAt: now,
        kind: AdminLedgerEventKind.rewardPipelineApprove,
        actorId: 'admin',
        correlationId: 'corr-2',
        pendingRewardId: pending2.id,
        payload: const {'trustScore': 0.9, 'fraudFlagged': false},
      );
      expect(
        applier.apply(economy: economy, event: approveEvent, now: now.add(const Duration(hours: 8))),
        isTrue,
      );
      expect(economy.iCoinsForUser('u1'), greaterThan(0));
    });

    test('does not apply manual balance adjustments', () {
      const applier = AdminLedgerApplier();
      final economy = EconomyEngine();
      final e = AdminLedgerEvent(
        id: 'm1',
        createdAt: DateTime.utc(2026, 1, 1),
        kind: AdminLedgerEventKind.manualBalanceAdjustment,
        actorId: 'admin',
        correlationId: 'corr',
        targetUserId: 'u1',
        payload: const {'currency': 'iCoins', 'delta': 50.0, 'justification': 'test'},
      );
      expect(applier.apply(economy: economy, event: e, now: DateTime.utc(2026, 1, 1)), isFalse);
      expect(economy.iCoinsForUser('u1'), 0.0);
    });
  });
}
