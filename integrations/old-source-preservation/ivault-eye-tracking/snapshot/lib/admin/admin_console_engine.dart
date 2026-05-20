import 'dart:math' as math;

import 'package:eye_tracking_app/admin/admin_console_models.dart';
import 'package:eye_tracking_app/core/events/admin_event.dart';
import 'package:eye_tracking_app/core/events/wallet_event.dart';
import 'package:eye_tracking_app/core/system.dart';
import 'package:eye_tracking_app/economy_engine.dart';
import 'package:eye_tracking_app/policy_version.dart';

/// 2.10 Admin Console — control plane.
///
/// Rules:
/// - Never mutates user balances directly.
/// - Emits [AdminLedgerEvent] for settlement / downstream processors.
/// - Every action writes [AdminAuditLogEntry].
final class AdminConsoleEngine {
  AdminConsoleEngine({EventBus? eventBus}) : _bus = eventBus;

  final EventBus? _bus;

  final List<AdminAuditLogEntry> _audit = <AdminAuditLogEntry>[];
  final List<AdminLedgerEvent> _ledger = <AdminLedgerEvent>[];
  final Map<String, bool> _campaignPaused = <String, bool>{};
  final Map<String, bool> _userFrozen = <String, bool>{};
  final List<FraudReviewCase> _fraudQueue = <FraudReviewCase>[];
  final List<AdminPolicyVersion> _policies = <AdminPolicyVersion>[];

  int _seq = 0;

  List<AdminAuditLogEntry> get auditLogs => List<AdminAuditLogEntry>.unmodifiable(_audit);
  List<AdminLedgerEvent> get ledgerEvents => List<AdminLedgerEvent>.unmodifiable(_ledger);
  List<FraudReviewCase> get fraudQueue => List<FraudReviewCase>.unmodifiable(_fraudQueue);
  List<AdminPolicyVersion> get policyVersions => List<AdminPolicyVersion>.unmodifiable(_policies);

  bool isCampaignPaused(String campaignId) => _campaignPaused[campaignId] ?? false;
  bool isUserFrozen(String userId) => _userFrozen[userId] ?? false;

  /// Campaign review: records governance decision (ledger) + audit.
  void submitCampaignReview({
    required String actorId,
    required String campaignId,
    required String decision,
    String notes = '',
  }) {
    final correlationId = _nextCorrelationId();
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.campaignReview,
        action: 'submitCampaignReview',
        actorId: actorId,
        correlationId: correlationId,
        resourceId: campaignId,
        detail: {'decision': decision, 'notes': notes},
      ),
    );
    _ledger.add(
      _ledgerEvent(
        kind: AdminLedgerEventKind.campaignReviewDecision,
        actorId: actorId,
        correlationId: correlationId,
        campaignId: campaignId,
        payload: {'decision': decision, 'notes': notes},
      ),
    );
    if (decision.trim().toLowerCase() == 'approved') {
      _emitAdmin(
        AdminCampaignApprovedEvent(
          adminId: actorId,
          campaignId: campaignId,
          policyVersion:
              _policies.isEmpty ? kBootstrapPolicyVersionId : _policies.last.version,
          notes: notes.trim().isEmpty ? null : notes,
        ),
      );
    }
  }

  /// Pause / resume spend for a campaign (governance overlay; balances unchanged here).
  ///
  /// When [paused] is true, [pauseReason] must be non-empty (catalog §15
  /// [AdminEventWire.campaignPaused]).
  void setCampaignPaused({
    required String actorId,
    required String campaignId,
    required bool paused,
    String pauseReason = '',
  }) {
    if (paused && pauseReason.trim().isEmpty) {
      throw ArgumentError('pauseReason is required when pausing a campaign');
    }
    final correlationId = _nextCorrelationId();
    _campaignPaused[campaignId] = paused;
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.campaignReview,
        action: paused ? 'pauseCampaign' : 'resumeCampaign',
        actorId: actorId,
        correlationId: correlationId,
        resourceId: campaignId,
        detail: {'paused': paused},
        severity: paused ? AdminAuditSeverity.warning : AdminAuditSeverity.info,
      ),
    );
    _ledger.add(
      _ledgerEvent(
        kind: AdminLedgerEventKind.campaignPauseToggle,
        actorId: actorId,
        correlationId: correlationId,
        campaignId: campaignId,
        payload: {'paused': paused},
      ),
    );
    if (paused) {
      _emitAdmin(
        AdminCampaignPausedEvent(
          adminId: actorId,
          campaignId: campaignId,
          reason: pauseReason.trim(),
        ),
      );
    }
  }

  /// Budget monitor tick — ledger only when threshold crossed.
  void recordBudgetMonitor({
    required String actorId,
    required String campaignId,
    required double remainingUsd,
    required double budgetUsd,
    double alertFraction = 0.1,
  }) {
    final correlationId = _nextCorrelationId();
    final fraction = budgetUsd <= 0 ? 1.0 : remainingUsd / budgetUsd;
    final breached = fraction <= alertFraction;
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.budgetMonitor,
        action: 'recordBudgetMonitor',
        actorId: actorId,
        correlationId: correlationId,
        resourceId: campaignId,
        detail: {
          'remainingUsd': remainingUsd,
          'budgetUsd': budgetUsd,
          'fraction': fraction,
          'breached': breached,
        },
        severity: breached ? AdminAuditSeverity.warning : AdminAuditSeverity.info,
      ),
    );
    if (breached) {
      _ledger.add(
        _ledgerEvent(
          kind: AdminLedgerEventKind.budgetThresholdBreached,
          actorId: actorId,
          correlationId: correlationId,
          campaignId: campaignId,
          payload: {'remainingUsd': remainingUsd, 'budgetUsd': budgetUsd},
        ),
      );
    }
  }

  /// Reward audit trail (ledger for downstream compliance).
  void recordRewardAudit({
    required String actorId,
    required String pendingRewardId,
    required String finding,
    Map<String, Object?> extra = const {},
  }) {
    final correlationId = _nextCorrelationId();
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.rewardAudit,
        action: 'recordRewardAudit',
        actorId: actorId,
        correlationId: correlationId,
        resourceId: pendingRewardId,
        detail: {'finding': finding, ...extra},
      ),
    );
    _ledger.add(
      _ledgerEvent(
        kind: AdminLedgerEventKind.rewardAuditFinding,
        actorId: actorId,
        correlationId: correlationId,
        pendingRewardId: pendingRewardId,
        payload: {'finding': finding, ...extra},
      ),
    );
  }

  /// Read-only wallet view — audit only.
  void recordWalletLedgerView({
    required String actorId,
    required String userId,
    required EconomyEngine economy,
  }) {
    final correlationId = _nextCorrelationId();
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.walletLedgerViewer,
        action: 'viewWalletLedger',
        actorId: actorId,
        correlationId: correlationId,
        resourceId: userId,
        detail: {
          'rCoins': economy.rCoinsForUser(userId),
          'iCoins': economy.iCoinsForUser(userId),
          'txCount': economy.transactions.length,
        },
      ),
    );
  }

  /// Trust score inspection — audit only (no trust mutation here).
  void recordTrustScoreView({
    required String actorId,
    required String userId,
    required Map<String, Object?> snapshot,
  }) {
    final correlationId = _nextCorrelationId();
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.trustScoreViewer,
        action: 'viewTrustScore',
        actorId: actorId,
        correlationId: correlationId,
        resourceId: userId,
        detail: snapshot,
      ),
    );
  }

  FraudReviewCase enqueueFraudReview({
    required String actorId,
    required String userId,
    String reason = '',
  }) {
    final correlationId = _nextCorrelationId();
    final id = _nextId('fraud');
    final c = FraudReviewCase(id: id, userId: userId, openedAt: DateTime.now().toUtc(), reason: reason);
    _fraudQueue.add(c);
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.fraudReviewQueue,
        action: 'enqueueFraudReview',
        actorId: actorId,
        correlationId: correlationId,
        resourceId: id,
        detail: {'userId': userId, 'reason': reason},
        severity: AdminAuditSeverity.warning,
      ),
    );
    return c;
  }

  /// Disposition updates queue + emits ledger for settlement (e.g. tie to reward reject).
  void disposeFraudCase({
    required String actorId,
    required String caseId,
    required String disposition,
    String? pendingRewardId,
  }) {
    final correlationId = _nextCorrelationId();
    final idx = _fraudQueue.indexWhere((e) => e.id == caseId);
    if (idx >= 0) {
      _fraudQueue[idx].open = false;
    }
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.fraudReviewQueue,
        action: 'disposeFraudCase',
        actorId: actorId,
        correlationId: correlationId,
        resourceId: caseId,
        detail: {'disposition': disposition, 'pendingRewardId': pendingRewardId},
        severity: AdminAuditSeverity.critical,
      ),
    );
    _ledger.add(
      _ledgerEvent(
        kind: AdminLedgerEventKind.fraudCaseDisposition,
        actorId: actorId,
        correlationId: correlationId,
        pendingRewardId: pendingRewardId,
        payload: {'caseId': caseId, 'disposition': disposition},
      ),
    );
  }

  void setUserFrozen({
    required String actorId,
    required String userId,
    required bool frozen,
    AdminUserRestrictionType restrictionType = AdminUserRestrictionType.fullAccount,
    String restrictionReason = 'account_frozen',
    String? restrictionExpiresAt,
  }) {
    final correlationId = _nextCorrelationId();
    _userFrozen[userId] = frozen;
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.userAccountControls,
        action: frozen ? 'freezeUser' : 'unfreezeUser',
        actorId: actorId,
        correlationId: correlationId,
        resourceId: userId,
        detail: {'frozen': frozen},
        severity: frozen ? AdminAuditSeverity.warning : AdminAuditSeverity.info,
      ),
    );
    _ledger.add(
      _ledgerEvent(
        kind: AdminLedgerEventKind.userAccountControl,
        actorId: actorId,
        correlationId: correlationId,
        targetUserId: userId,
        payload: {'frozen': frozen},
      ),
    );
    if (frozen) {
      _emitAdmin(
        AdminUserRestrictedEvent(
          adminId: actorId,
          userId: userId,
          restrictionType: restrictionType,
          reason: restrictionReason.trim().isEmpty ? 'account_frozen' : restrictionReason.trim(),
          expiresAt: restrictionExpiresAt,
        ),
      );
    }
  }

  /// Records a clawback / reversal decision (audit + ledger finding + §15 bus event).
  void recordRewardReversal({
    required String actorId,
    required String userId,
    required String rewardDecisionId,
    required String valueLotId,
    required double amount,
    required WalletCurrency currency,
    required String reason,
  }) {
    if (reason.trim().isEmpty) {
      throw ArgumentError('reason required for reward reversal');
    }
    final correlationId = _nextCorrelationId();
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.rewardAudit,
        action: 'recordRewardReversal',
        actorId: actorId,
        correlationId: correlationId,
        resourceId: rewardDecisionId,
        detail: {
          'userId': userId,
          'valueLotId': valueLotId,
          'amount': amount,
          'currency': currency.wireValue,
          'reason': reason,
        },
        severity: AdminAuditSeverity.warning,
      ),
    );
    _ledger.add(
      _ledgerEvent(
        kind: AdminLedgerEventKind.rewardAuditFinding,
        actorId: actorId,
        correlationId: correlationId,
        targetUserId: userId,
        pendingRewardId: rewardDecisionId,
        payload: {
          'kind': 'reward_reversal',
          'valueLotId': valueLotId,
          'amount': amount,
          'currency': currency.wireValue,
          'reason': reason,
        },
      ),
    );
    _emitAdmin(
      AdminRewardReversedEvent(
        adminId: actorId,
        userId: userId,
        rewardDecisionId: rewardDecisionId,
        valueLotId: valueLotId,
        amount: amount,
        currency: currency,
        reason: reason.trim(),
      ),
    );
  }

  void publishPolicyVersion({
    required String actorId,
    required AdminPolicyVersion version,
  }) {
    final correlationId = _nextCorrelationId();
    _policies.add(version);
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.policyVersionManager,
        action: 'publishPolicyVersion',
        actorId: actorId,
        correlationId: correlationId,
        resourceId: version.version,
        detail: version.toJson(),
      ),
    );
    _ledger.add(
      _ledgerEvent(
        kind: AdminLedgerEventKind.policyVersionPublished,
        actorId: actorId,
        correlationId: correlationId,
        payload: version.toJson(),
      ),
    );
  }

  void recordSystemMetrics({
    required String actorId,
    required SystemMetricSample sample,
  }) {
    final correlationId = _nextCorrelationId();
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.systemMetrics,
        action: 'recordSystemMetrics',
        actorId: actorId,
        correlationId: correlationId,
        detail: sample.toJson(),
      ),
    );
  }

  /// Manual balance change: **ledger only**. Settlement must apply to [EconomyEngine].
  void proposeManualBalanceAdjustment({
    required String actorId,
    required String userId,
    required String currency,
    required double delta,
    required String justification,
    String? approvalTicketId,
  }) {
    if (justification.trim().isEmpty) {
      throw ArgumentError('justification required for manual adjustments');
    }
    final parsedCurrency = adminWalletCurrencyFromWire(currency);
    final correlationId = _nextCorrelationId();
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.manualAdjustmentTools,
        action: 'proposeManualBalanceAdjustment',
        actorId: actorId,
        correlationId: correlationId,
        resourceId: userId,
        detail: {
          'currency': currency,
          'delta': delta,
          'justification': justification,
        },
        severity: AdminAuditSeverity.critical,
      ),
    );
    _ledger.add(
      _ledgerEvent(
        kind: AdminLedgerEventKind.manualBalanceAdjustment,
        actorId: actorId,
        correlationId: correlationId,
        targetUserId: userId,
        payload: {
          'currency': currency,
          'delta': delta,
          'justification': justification,
          if (approvalTicketId != null) 'approvalTicketId': approvalTicketId,
        },
      ),
    );
    final magnitude = delta.abs();
    if (magnitude > 0) {
      _emitAdmin(
        AdminWalletAdjustmentCreatedEvent(
          adminId: actorId,
          userId: userId,
          amount: magnitude,
          currency: parsedCurrency,
          direction: delta >= 0
              ? AdminWalletAdjustmentDirection.credit
              : AdminWalletAdjustmentDirection.debit,
          reason: justification.trim(),
          approvalTicketId: approvalTicketId,
        ),
      );
    }
  }

  /// Ledger events for reward pipeline — applied later via [AdminLedgerApplier].
  void proposeRewardPipelineApprove({
    required String actorId,
    required String pendingRewardId,
    required double trustScore,
    required bool fraudFlagged,
  }) {
    final correlationId = _nextCorrelationId();
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.rewardAudit,
        action: 'proposeRewardPipelineApprove',
        actorId: actorId,
        correlationId: correlationId,
        resourceId: pendingRewardId,
        detail: {'trustScore': trustScore, 'fraudFlagged': fraudFlagged},
      ),
    );
    _ledger.add(
      _ledgerEvent(
        kind: AdminLedgerEventKind.rewardPipelineApprove,
        actorId: actorId,
        correlationId: correlationId,
        pendingRewardId: pendingRewardId,
        payload: {'trustScore': trustScore, 'fraudFlagged': fraudFlagged},
      ),
    );
  }

  void proposeRewardPipelineReject({
    required String actorId,
    required String pendingRewardId,
  }) {
    final correlationId = _nextCorrelationId();
    _audit.add(
      _auditEntry(
        module: AdminConsoleModule.rewardAudit,
        action: 'proposeRewardPipelineReject',
        actorId: actorId,
        correlationId: correlationId,
        resourceId: pendingRewardId,
        detail: const {},
        severity: AdminAuditSeverity.warning,
      ),
    );
    _ledger.add(
      _ledgerEvent(
        kind: AdminLedgerEventKind.rewardPipelineReject,
        actorId: actorId,
        correlationId: correlationId,
        pendingRewardId: pendingRewardId,
        payload: const {},
      ),
    );
  }

  AdminAuditLogEntry _auditEntry({
    required AdminConsoleModule module,
    required String action,
    required String actorId,
    required String correlationId,
    String? resourceId,
    Map<String, Object?> detail = const {},
    AdminAuditSeverity severity = AdminAuditSeverity.info,
  }) {
    final e = AdminAuditLogEntry(
      id: _nextId('audit'),
      createdAt: DateTime.now().toUtc(),
      module: module,
      action: action,
      actorId: actorId,
      correlationId: correlationId,
      severity: severity,
      resourceId: resourceId,
      detail: detail,
    );
    return e;
  }

  AdminLedgerEvent _ledgerEvent({
    required AdminLedgerEventKind kind,
    required String actorId,
    required String correlationId,
    String? targetUserId,
    String? campaignId,
    String? pendingRewardId,
    Map<String, Object?> payload = const {},
  }) {
    return AdminLedgerEvent(
      id: _nextId('adledger'),
      createdAt: DateTime.now().toUtc(),
      kind: kind,
      actorId: actorId,
      correlationId: correlationId,
      targetUserId: targetUserId,
      campaignId: campaignId,
      pendingRewardId: pendingRewardId,
      payload: payload,
    );
  }

  String _nextId(String prefix) {
    _seq += 1;
    return '$prefix-$_seq';
  }

  String _nextCorrelationId() {
    _seq += 1;
    return 'corr-${DateTime.now().toUtc().millisecondsSinceEpoch}-$_seq-${math.Random().nextInt(1 << 20)}';
  }

  void _emitAdmin(AdminEvent event) {
    _bus?.emit(event);
  }
}
