import 'package:pop_core/pop_core.dart';

/// Emitted when a proof packet is sealed at session end.
///
/// No wallet or backend listeners in PR1 — observability hook only.
final class ProofPacketSealedEvent {
  const ProofPacketSealedEvent({
    required this.artifactId,
    required this.sessionId,
    required this.sealedAt,
    required this.packet,
  });

  /// Stable fixture id, e.g. `PP-000001`.
  final String artifactId;

  final String sessionId;

  /// ISO-8601 UTC seal timestamp.
  final String sealedAt;

  final ProofPacketV0 packet;
}
