// Product telemetry catalog §17 — system.job.* payloads (local types + bus only).

/// Stable wire names for system job lifecycle events.
abstract final class SystemEventWire {
  static const jobStarted = 'system.job.started';
  static const jobCompleted = 'system.job.completed';
  static const jobFailed = 'system.job.failed';
}

/// Wire: [SystemEventWire.jobStarted] — `SystemJobStartedPayload.jobType`.
enum SystemJobType {
  rewardRelease('reward_release'),
  budgetReservationExpiry('budget_reservation_expiry'),
  trustScoreRecompute('trust_score_recompute'),
  fraudScan('fraud_scan'),
  walletProjection('wallet_projection'),
  campaignStatusSync('campaign_status_sync');

  const SystemJobType(this.wireValue);
  final String wireValue;
}

/// Base type for system-domain job events on [EventBus].
sealed class SystemEvent {
  const SystemEvent();
}

/// Wire: `system.job.started`
///
/// Payload: `SystemJobStartedPayload`.
final class SystemJobStartedEvent extends SystemEvent {
  const SystemJobStartedEvent({
    required this.jobId,
    required this.jobType,
    required this.startedAt,
  });

  final String jobId;
  final SystemJobType jobType;
  final String startedAt;
}

/// Wire: `system.job.completed`
///
/// Payload: `SystemJobCompletedPayload` (`jobType` is an opaque wire string).
final class SystemJobCompletedEvent extends SystemEvent {
  const SystemJobCompletedEvent({
    required this.jobId,
    required this.jobType,
    required this.processedCount,
    required this.failedCount,
    required this.completedAt,
  });

  final String jobId;
  final String jobType;
  final int processedCount;
  final int failedCount;
  final String completedAt;
}

/// Wire: `system.job.failed`
///
/// Payload: `SystemJobFailedPayload` (`jobType` is an opaque wire string).
final class SystemJobFailedEvent extends SystemEvent {
  const SystemJobFailedEvent({
    required this.jobId,
    required this.jobType,
    required this.reason,
    required this.retryable,
  });

  final String jobId;
  final String jobType;
  final String reason;
  final bool retryable;
}
