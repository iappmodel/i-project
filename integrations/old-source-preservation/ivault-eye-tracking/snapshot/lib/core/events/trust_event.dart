// Product telemetry catalog §13 — trust.* payloads (local types + bus only).

import 'package:eye_tracking_app/trust_engine.dart';

/// Stable wire names for trust domain events (analytics / projection / bus).
abstract final class TrustEventWire {
  static const scoreCreated = 'trust.score.created';
  static const scoreUpdated = 'trust.score.updated';
  static const limitChanged = 'trust.limit.changed';
}

/// Wire: [TrustEventWire.limitChanged] — [TrustLimitType.wireValue].
enum TrustLimitType {
  dailyEarn('daily_earn'),
  dailyWithdrawal('daily_withdrawal'),
  campaignAccess('campaign_access'),
  payoutDelay('payout_delay');

  const TrustLimitType(this.wireValue);
  final String wireValue;
}

/// Base type for trust-domain events on [EventBus].
sealed class TrustEvent {
  const TrustEvent();
}

/// Wire: `trust.score.created`
///
/// Payload: `TrustScoreCreatedPayload` (userId, score, level).
final class TrustScoreCreatedEvent extends TrustEvent {
  const TrustScoreCreatedEvent({
    required this.userId,
    required this.score,
    required this.level,
  });

  final String userId;

  /// Canonical scale matches [TrustScoreSnapshot.score] (0..1000).
  final int score;
  final TrustScoreLevel level;
}

/// Wire: `trust.score.updated`
///
/// Payload: `TrustScoreUpdatedPayload`.
final class TrustScoreUpdatedEvent extends TrustEvent {
  const TrustScoreUpdatedEvent({
    required this.userId,
    required this.previousScore,
    required this.newScore,
    required this.previousLevel,
    required this.newLevel,
    this.reasonCodes = const [],
    required this.payoutDelayHours,
    required this.dailyEarnLimit,
    required this.dailyWithdrawalLimit,
    required this.campaignAccessTier,
    required this.policyVersion,
  });

  final String userId;
  final int previousScore;
  final int newScore;
  final TrustScoreLevel previousLevel;
  final TrustScoreLevel newLevel;
  final List<String> reasonCodes;
  final double payoutDelayHours;
  final double dailyEarnLimit;
  final double dailyWithdrawalLimit;
  final int campaignAccessTier;
  final String policyVersion;
}

/// Wire: `trust.limit.changed`
///
/// Payload: `TrustLimitChangedPayload`.
final class TrustLimitChangedEvent extends TrustEvent {
  const TrustLimitChangedEvent({
    required this.userId,
    required this.limitType,
    required this.previousValue,
    required this.newValue,
    required this.reason,
  });

  final String userId;
  final TrustLimitType limitType;
  final double previousValue;
  final double newValue;
  final String reason;
}
