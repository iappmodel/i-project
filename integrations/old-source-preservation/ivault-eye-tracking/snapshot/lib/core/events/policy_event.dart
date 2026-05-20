// Governance catalog §16 — policy.version.* payloads (append-only version facts).

/// Stable wire names for policy-governance domain events (analytics / audit / bus).
abstract final class PolicyEventWire {
  static const versionCreated = 'policy.version.created';
  static const versionActivated = 'policy.version.activated';
}

/// Wire: [PolicyEventWire.versionCreated] / [PolicyEventWire.versionActivated] — domain key.
enum PolicyDomain {
  reward('reward'),
  trust('trust'),
  fraud('fraud'),
  campaign('campaign'),
  withdrawal('withdrawal');

  const PolicyDomain(this.wireValue);
  final String wireValue;
}

/// Base type for policy-version lifecycle events on [EventBus].
sealed class PolicyEvent {
  const PolicyEvent();
}

/// Wire: `policy.version.created`
///
/// Payload: `PolicyVersionCreatedPayload`
/// (`policyVersion`, `domain`, `createdBy`, optional `notes`).
final class PolicyVersionCreatedEvent extends PolicyEvent {
  const PolicyVersionCreatedEvent({
    required this.policyVersion,
    required this.domain,
    required this.createdBy,
    this.notes,
  });

  final String policyVersion;
  final PolicyDomain domain;
  final String createdBy;
  final String? notes;
}

/// Wire: `policy.version.activated`
///
/// Payload: `PolicyVersionActivatedPayload`
/// (`policyVersion`, `domain`, `activatedBy`, `activatedAt` ISO-8601).
final class PolicyVersionActivatedEvent extends PolicyEvent {
  const PolicyVersionActivatedEvent({
    required this.policyVersion,
    required this.domain,
    required this.activatedBy,
    required this.activatedAt,
  });

  final String policyVersion;
  final PolicyDomain domain;
  final String activatedBy;

  /// ISO-8601 timestamp when the version became active.
  final String activatedAt;
}
