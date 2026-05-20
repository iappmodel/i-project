// 2.10 Admin Console — canonical types (ledger + audit).

/// High-level admin surface area (product modules).
enum AdminConsoleModule {
  campaignReview,
  budgetMonitor,
  rewardAudit,
  walletLedgerViewer,
  trustScoreViewer,
  fraudReviewQueue,
  userAccountControls,
  policyVersionManager,
  systemMetrics,
  manualAdjustmentTools,
}

/// Events that may be consumed by a settlement / economics worker.
/// The admin UI and [AdminConsoleEngine] never write user balances directly.
enum AdminLedgerEventKind {
  campaignReviewDecision,
  campaignPauseToggle,
  budgetThresholdBreached,
  rewardAuditFinding,
  fraudCaseDisposition,
  userAccountControl,
  policyVersionPublished,
  /// Intent to correct value; settlement must post **ledger entries** (e.g.
  /// compensating lines), never patch wallet aggregates in memory (Rule 2).
  manualBalanceAdjustment,
  rewardPipelineApprove,
  rewardPipelineReject,
}

enum AdminAuditSeverity { info, warning, critical }

/// Append-only admin intent toward balances or governance.
/// Settlement applies these; the console does not patch balances in memory.
final class AdminLedgerEvent {
  const AdminLedgerEvent({
    required this.id,
    required this.createdAt,
    required this.kind,
    required this.actorId,
    required this.correlationId,
    this.targetUserId,
    this.campaignId,
    this.pendingRewardId,
    this.payload = const <String, Object?>{},
  });

  final String id;
  final DateTime createdAt;
  final AdminLedgerEventKind kind;
  final String actorId;
  final String correlationId;
  final String? targetUserId;
  final String? campaignId;
  final String? pendingRewardId;
  final Map<String, Object?> payload;

  Map<String, Object?> toJson() => {
        'id': id,
        'createdAt': createdAt.toUtc().toIso8601String(),
        'kind': kind.name,
        'actorId': actorId,
        'correlationId': correlationId,
        'targetUserId': targetUserId,
        'campaignId': campaignId,
        'pendingRewardId': pendingRewardId,
        'payload': payload,
      };
}

/// Append-only audit record for every admin action (including read-only views).
final class AdminAuditLogEntry {
  const AdminAuditLogEntry({
    required this.id,
    required this.createdAt,
    required this.module,
    required this.action,
    required this.actorId,
    required this.correlationId,
    this.severity = AdminAuditSeverity.info,
    this.resourceId,
    this.detail = const <String, Object?>{},
  });

  final String id;
  final DateTime createdAt;
  final AdminConsoleModule module;
  final String action;
  final String actorId;
  final String correlationId;
  final AdminAuditSeverity severity;
  final String? resourceId;
  final Map<String, Object?> detail;

  Map<String, Object?> toJson() => {
        'id': id,
        'createdAt': createdAt.toUtc().toIso8601String(),
        'module': module.name,
        'action': action,
        'actorId': actorId,
        'correlationId': correlationId,
        'severity': severity.name,
        'resourceId': resourceId,
        'detail': detail,
      };
}

final class AdminPolicyVersion {
  const AdminPolicyVersion({
    required this.version,
    required this.summary,
    required this.effectiveAt,
    required this.hash,
  });

  final String version;
  final String summary;
  final DateTime effectiveAt;
  final String hash;

  Map<String, Object?> toJson() => {
        'version': version,
        'summary': summary,
        'effectiveAt': effectiveAt.toUtc().toIso8601String(),
        'hash': hash,
      };
}

final class FraudReviewCase {
  FraudReviewCase({
    required this.id,
    required this.userId,
    required this.openedAt,
    this.reason = '',
    this.open = true,
  });

  final String id;
  final String userId;
  final DateTime openedAt;
  String reason;
  bool open;
}

final class SystemMetricSample {
  const SystemMetricSample({
    required this.capturedAt,
    required this.activeCampaigns,
    required this.pendingRewards,
    required this.dailyEmissionUsd,
    required this.openFraudCases,
  });

  final DateTime capturedAt;
  final int activeCampaigns;
  final int pendingRewards;
  final double dailyEmissionUsd;
  final int openFraudCases;

  Map<String, Object?> toJson() => {
        'capturedAt': capturedAt.toUtc().toIso8601String(),
        'activeCampaigns': activeCampaigns,
        'pendingRewards': pendingRewards,
        'dailyEmissionUsd': dailyEmissionUsd,
        'openFraudCases': openFraudCases,
      };
}
