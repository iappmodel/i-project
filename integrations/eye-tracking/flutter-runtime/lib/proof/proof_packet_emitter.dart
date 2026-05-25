import 'package:pop_core/pop_core.dart';

import '../core/events/proof_packet_sealed_event.dart';
import '../core/system.dart';
import '../verification/verification_stability_layer.dart';
import 'proof_packet_builder.dart';
import 'proof_session_collector.dart';
import 'proof_session_context.dart';

/// Seals and emits a proof packet at session end.
///
/// PR1: local emission + bus event only — no wallet or backend calls.
final class ProofPacketEmitter {
  ProofPacketEmitter({
    ProofPacketBuilder builder = const ProofPacketBuilder(),
  }) : _builder = builder;

  final ProofPacketBuilder _builder;

  ProofSessionContext? _context;
  ProofSessionCollector? _collector;

  bool get isActive => _context != null;

  void startSession(ProofSessionContext context) {
    _context = context;
    _collector = ProofSessionCollector()
      ..reset(sessionStartMs: context.startedAt.millisecondsSinceEpoch);
  }

  ProofSessionCollector? get collector => _collector;

  /// Builds, validates, and emits [ProofPacketSealedEvent].
  ///
  /// Throws [StateError] if no active session.
  ProofPacketSealedEvent sealAndEmit({
    required String artifactId,
    required VerificationStabilitySnapshot vslSnapshot,
    DateTime? endedAt,
  }) {
    final context = _context;
    final collector = _collector;
    if (context == null || collector == null) {
      throw StateError('Cannot seal proof packet without an active session');
    }

    final sealTime = endedAt ?? DateTime.now().toUtc();
    final packet = _builder.build(
      context: context,
      collector: collector,
      vslSnapshot: vslSnapshot,
      endedAt: sealTime,
    );

    _validateMvpSubset(packet);

    final event = ProofPacketSealedEvent(
      artifactId: artifactId,
      sessionId: context.sessionId,
      sealedAt: sealTime.toUtc().toIso8601String(),
      packet: packet,
    );

    System.bus.emit(event);

    _context = null;
    _collector = null;

    return event;
  }

  void _validateMvpSubset(ProofPacketV0 packet) {
    if (packet.review.status != ProofReviewStatus.pending) {
      throw StateError('Device-emitted packet must have review.status=pending');
    }
    if (ProofPacketV0.packetVersion != '0') {
      throw StateError('packetVersion must be 0');
    }
  }
}
