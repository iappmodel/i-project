// Product telemetry catalog §14 — fraud.* payloads (local types + bus only).

/// Stable wire names for fraud domain events.
abstract final class FraudEventWire {
  static const flagCreated = 'fraud.flag.created';
  static const caseOpened = 'fraud.case.opened';
  static const caseResolved = 'fraud.case.resolved';
}

/// Wire: [FraudEventWire.flagCreated] — originating subsystem.
enum FraudFlagSource {
  attentionEngine('attention_engine'),
  trustEngine('trust_engine'),
  deviceEngine('device_engine'),
  walletEngine('wallet_engine'),
  campaignEngine('campaign_engine'),
  admin('admin');

  const FraudFlagSource(this.wireValue);
  final String wireValue;
}

/// Wire: severity on flag / case opened events.
enum FraudSeverity {
  low('low'),
  medium('medium'),
  high('high'),
  critical('critical');

  const FraudSeverity(this.wireValue);
  final String wireValue;
}

/// Wire: [FraudEventWire.caseResolved] — disposition.
enum FraudCaseResolution {
  falsePositive('false_positive'),
  confirmedFraud('confirmed_fraud'),
  insufficientEvidence('insufficient_evidence'),
  userWarned('user_warned'),
  accountRestricted('account_restricted'),
  rewardsClawedBack('rewards_clawed_back');

  const FraudCaseResolution(this.wireValue);
  final String wireValue;
}

/// Wire: [FraudEventWire.caseResolved] — who closed the case.
enum FraudCaseResolvedBy {
  system('system'),
  admin('admin');

  const FraudCaseResolvedBy(this.wireValue);
  final String wireValue;
}

/// Base type for fraud-domain events on [EventBus].
sealed class FraudEvent {
  const FraudEvent();
}

/// Wire: `fraud.flag.created`
final class FraudFlagCreatedEvent extends FraudEvent {
  const FraudFlagCreatedEvent({
    required this.fraudFlagId,
    required this.userId,
    required this.source,
    required this.signal,
    required this.severity,
    required this.relatedEventIds,
    required this.policyVersion,
  });

  final String fraudFlagId;
  final String userId;
  final FraudFlagSource source;

  /// Free-form machine or human-readable signal key / description.
  final String signal;
  final FraudSeverity severity;
  final List<String> relatedEventIds;
  final String policyVersion;
}

/// Wire: `fraud.case.opened`
final class FraudCaseOpenedEvent extends FraudEvent {
  const FraudCaseOpenedEvent({
    required this.fraudCaseId,
    required this.userId,
    required this.severity,
    required this.reason,
    required this.relatedEventIds,
  });

  final String fraudCaseId;
  final String userId;
  final FraudSeverity severity;
  final String reason;
  final List<String> relatedEventIds;
}

/// Wire: `fraud.case.resolved`
final class FraudCaseResolvedEvent extends FraudEvent {
  const FraudCaseResolvedEvent({
    required this.fraudCaseId,
    required this.userId,
    required this.resolution,
    required this.resolvedBy,
  });

  final String fraudCaseId;
  final String userId;
  final FraudCaseResolution resolution;
  final FraudCaseResolvedBy resolvedBy;
}
