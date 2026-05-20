/// Step 2 — client vs server event ownership for attention ingestion.
///
/// See AGENTS.md Rule 22 and §18 in [build_spec_v01.dart](build_spec_v01.dart).
library;

import 'package:eye_tracking_app/canonical/build_spec_v01.dart';

/// Exact `eventType` strings an **untrusted client** may submit for attention
/// ingestion (session facts + throttled signals only).
abstract final class ClientAttentionIngestAllowlistV01 {
  static const Set<String> eventTypes = {
    CanonicalAttentionEventTypesV01.sessionStarted,
    CanonicalAttentionEventTypesV01.sessionCompleted,
    CanonicalAttentionEventTypesV01.sessionAbandoned,
    CanonicalAttentionEventTypesV01.runtimeSignalSampled,
  };
}

/// Economics / governance types the client attention path must not mint.
///
/// Built from [MvpBackendEventSetV01] minus [ClientAttentionIngestAllowlistV01],
/// plus wire types that are server-owned but omitted from the MVP backend set.
abstract final class ServerOwnedEconomicsEventTypesV01 {
  static final Set<String> eventTypes = _build();

  static Set<String> _build() {
    final s = <String>{
      for (final e in MvpBackendEventSetV01.eventTypes)
        if (!ClientAttentionIngestAllowlistV01.eventTypes.contains(e)) e,
      CanonicalRewardEventTypesV01.decisionHeld,
      CanonicalTrustEventTypesV01.limitChanged,
      CanonicalBudgetEventTypesV01.depleted,
      CanonicalCampaignEventTypesV01.submittedForReview,
      CanonicalCampaignEventTypesV01.approved,
      CanonicalCampaignEventTypesV01.rejected,
    };
    return Set<String>.unmodifiable(s);
  }
}

sealed class ClientAttentionIngestValidationV01 {
  const ClientAttentionIngestValidationV01();
}

/// [wireType] is in [ClientAttentionIngestAllowlistV01.eventTypes].
final class ClientAttentionIngestAcceptedV01 extends ClientAttentionIngestValidationV01 {
  const ClientAttentionIngestAcceptedV01();
}

/// Client path must reject this `eventType`.
final class ClientAttentionIngestRejectedV01 extends ClientAttentionIngestValidationV01 {
  const ClientAttentionIngestRejectedV01({
    required this.code,
    required this.wireType,
  });

  /// `server_owned` — known economics server type; `not_allowlisted` — anything else.
  final String code;
  final String wireType;
}

/// Validates a wire `eventType` for **untrusted client → attention inbox** only.
///
/// Returns [ClientAttentionIngestAcceptedV01] iff [wireType] is exactly one of
/// [ClientAttentionIngestAllowlistV01.eventTypes].
ClientAttentionIngestValidationV01 validateClientAttentionIngestEventType(
  String wireType,
) {
  final t = wireType.trim();
  if (t.isEmpty) {
    return ClientAttentionIngestRejectedV01(code: 'empty', wireType: wireType);
  }
  if (ClientAttentionIngestAllowlistV01.eventTypes.contains(t)) {
    return const ClientAttentionIngestAcceptedV01();
  }
  if (ServerOwnedEconomicsEventTypesV01.eventTypes.contains(t)) {
    return ClientAttentionIngestRejectedV01(code: 'server_owned', wireType: t);
  }
  return ClientAttentionIngestRejectedV01(code: 'not_allowlisted', wireType: t);
}
