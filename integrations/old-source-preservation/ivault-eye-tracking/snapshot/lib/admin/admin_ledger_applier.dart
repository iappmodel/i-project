import 'package:eye_tracking_app/admin/admin_console_models.dart';
import 'package:eye_tracking_app/economy_engine.dart';

/// Applies [AdminLedgerEvent] instances to [EconomyEngine] **only** through public APIs.
///
/// [AdminLedgerEventKind.manualBalanceAdjustment] is intentionally not applied:
/// the core engine has no direct balance write API; a settlement service must handle it.
final class AdminLedgerApplier {
  const AdminLedgerApplier();

  /// Returns false if the event is a no-op for this applier (e.g. governance-only kinds).
  bool apply({
    required EconomyEngine economy,
    required AdminLedgerEvent event,
    required DateTime now,
  }) {
    switch (event.kind) {
      case AdminLedgerEventKind.rewardPipelineApprove:
        final id = event.pendingRewardId;
        if (id == null) return false;
        final trust = (event.payload['trustScore'] as num?)?.toDouble() ?? 0;
        final fraud = event.payload['fraudFlagged'] == true;
        economy.approvePendingReward(
          pendingRewardId: id,
          trustScore: trust,
          fraudFlagged: fraud,
          now: now,
        );
        return true;
      case AdminLedgerEventKind.rewardPipelineReject:
        final id = event.pendingRewardId;
        if (id == null) return false;
        economy.rejectPendingReward(pendingRewardId: id, now: now);
        return true;
      case AdminLedgerEventKind.campaignReviewDecision:
      case AdminLedgerEventKind.campaignPauseToggle:
      case AdminLedgerEventKind.budgetThresholdBreached:
      case AdminLedgerEventKind.rewardAuditFinding:
      case AdminLedgerEventKind.fraudCaseDisposition:
      case AdminLedgerEventKind.userAccountControl:
      case AdminLedgerEventKind.policyVersionPublished:
      case AdminLedgerEventKind.manualBalanceAdjustment:
        return false;
    }
  }
}
