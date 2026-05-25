import 'dart:async';

import 'package:flutter/foundation.dart';

import '../core/events/proof_packet_sealed_event.dart';
import '../core/system.dart';
import 'proof_validator_client.dart';

/// Forwards sealed proof packets to the POP validator stub when configured.
final class ProofValidatorBridge {
  ProofValidatorBridge({ProofValidatorClient? client})
      : _client = client ?? ProofValidatorClient();

  final ProofValidatorClient _client;
  StreamSubscription<ProofPacketSealedEvent>? _subscription;

  bool get isEnabled => _client.isEnabled;

  void install() {
    if (!isEnabled) {
      debugPrint('PROOF_VALIDATOR: disabled (set POP_VALIDATOR_URL)');
      return;
    }

    _subscription ??= System.bus.proofPacketSealedEvents.listen(_onSealed);
    debugPrint('PROOF_VALIDATOR: listening → ${_client.baseUrl}');
  }

  Future<void> dispose() async {
    await _subscription?.cancel();
    _subscription = null;
  }

  Future<void> _onSealed(ProofPacketSealedEvent event) async {
    try {
      final result = await _client.submit(
        packet: event.packet,
        artifactId: event.artifactId,
      );
      if (result == null) return;

      debugPrint(
        'PROOF_VALIDATED: session=${result.sessionId} '
        'review=${result.reviewStatus} '
        'hold=${result.holdAmount ?? 0} (${result.holdOutcome})',
      );
    } catch (error, stack) {
      debugPrint('PROOF_VALIDATION_FAILED: $error');
      debugPrint('$stack');
    }
  }
}
