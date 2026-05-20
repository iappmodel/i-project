import 'package:eye_tracking_app/admin/admin_console.dart';
import 'package:eye_tracking_app/core/events/admin_event.dart';
import 'package:eye_tracking_app/core/events/wallet_event.dart';
import 'package:eye_tracking_app/core/system.dart';
import 'package:eye_tracking_app/policy_version.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('AdminEventWire names match control-plane catalog', () {
    expect(AdminEventWire.campaignApproved, 'admin.campaign.approved');
    expect(AdminEventWire.campaignPaused, 'admin.campaign.paused');
    expect(AdminEventWire.rewardReversed, 'admin.reward.reversed');
    expect(AdminEventWire.walletAdjustmentCreated, 'admin.wallet.adjustment.created');
    expect(AdminEventWire.userRestricted, 'admin.user.restricted');
  });

  test('adminWalletCurrencyFromWire accepts legacy and wire tokens', () {
    expect(adminWalletCurrencyFromWire('USD'), WalletCurrency.usd);
    expect(adminWalletCurrencyFromWire('iCoins'), WalletCurrency.icoin);
    expect(adminWalletCurrencyFromWire('RCOIN'), WalletCurrency.rcoin);
  });

  test('EventBus forwards admin events', () async {
    final bus = EventBus();
    final seen = <AdminEvent>[];
    final sub = bus.adminEvents.listen(seen.add);

    bus.emit(
      const AdminCampaignApprovedEvent(
        adminId: 'a1',
        campaignId: 'c1',
        policyVersion: 'pv-live',
        notes: 'ok',
      ),
    );

    await Future<void>.delayed(Duration.zero);
    expect(seen, hasLength(1));
    expect(seen.single, isA<AdminCampaignApprovedEvent>());
    await sub.cancel();
  });

  test('AdminConsoleEngine emits mandatory admin events on control actions', () async {
    final bus = EventBus();
    final admin = AdminConsoleEngine(eventBus: bus);
    final events = <AdminEvent>[];
    final sub = bus.adminEvents.listen(events.add);

    admin.submitCampaignReview(
      actorId: 'admin-1',
      campaignId: 'c1',
      decision: 'approved',
      notes: 'cleared',
    );
    admin.setCampaignPaused(
      actorId: 'admin-1',
      campaignId: 'c1',
      paused: true,
      pauseReason: 'policy review',
    );
    admin.proposeManualBalanceAdjustment(
      actorId: 'admin-1',
      userId: 'u1',
      currency: 'ICOIN',
      delta: -2.5,
      justification: 'duplicate payout',
      approvalTicketId: 'T-9',
    );
    admin.setUserFrozen(
      actorId: 'admin-1',
      userId: 'u1',
      frozen: true,
      restrictionType: AdminUserRestrictionType.withdrawal,
      restrictionReason: 'suspected wash',
    );
    admin.recordRewardReversal(
      actorId: 'admin-1',
      userId: 'u1',
      rewardDecisionId: 'rd-1',
      valueLotId: 'vl-1',
      amount: 10,
      currency: WalletCurrency.usd,
      reason: 'fraud finding R42',
    );

    await Future<void>.delayed(Duration.zero);

    final approved = events.whereType<AdminCampaignApprovedEvent>().single;
    expect(approved.campaignId, 'c1');
    expect(approved.policyVersion, kBootstrapPolicyVersionId);
    expect(events.whereType<AdminCampaignPausedEvent>().single.reason, 'policy review');
    final adj = events.whereType<AdminWalletAdjustmentCreatedEvent>().single;
    expect(adj.direction, AdminWalletAdjustmentDirection.debit);
    expect(adj.amount, 2.5);
    expect(adj.approvalTicketId, 'T-9');
    expect(events.whereType<AdminUserRestrictedEvent>().single.restrictionType,
        AdminUserRestrictionType.withdrawal);
    expect(events.whereType<AdminRewardReversedEvent>().single.valueLotId, 'vl-1');

    await sub.cancel();
  });

  test('setCampaignPaused requires pauseReason when pausing', () {
    final admin = AdminConsoleEngine();
    expect(
      () => admin.setCampaignPaused(actorId: 'a', campaignId: 'c', paused: true, pauseReason: ''),
      throwsArgumentError,
    );
  });

  test('AdminCampaignApprovedEvent policyVersion follows last published policy', () async {
    final bus = EventBus();
    final admin = AdminConsoleEngine(eventBus: bus);
    final events = <AdminEvent>[];
    final sub = bus.adminEvents.listen(events.add);

    admin.publishPolicyVersion(
      actorId: 'admin-1',
      version: AdminPolicyVersion(
        version: 'policy-rollout-2026-04',
        summary: 'trust gates v2',
        effectiveAt: DateTime.utc(2026, 4, 25),
        hash: 'h1',
      ),
    );

    admin.submitCampaignReview(
      actorId: 'admin-1',
      campaignId: 'c-x',
      decision: 'approved',
      notes: 'go',
    );

    await Future<void>.delayed(Duration.zero);
    expect(events.whereType<AdminCampaignApprovedEvent>().single.policyVersion, 'policy-rollout-2026-04');
    await sub.cancel();
  });
}
