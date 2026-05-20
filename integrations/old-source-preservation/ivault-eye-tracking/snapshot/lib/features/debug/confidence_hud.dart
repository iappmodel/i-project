import 'package:flutter/material.dart';

import '../../attention_kernel.dart';
import '../../core/intent_os/autonomous_execution_kernel.dart';

/// Read-only debug overlay (mount only when kDebugMode is true).
final class ConfidenceHud extends StatelessWidget {
  const ConfidenceHud({
    super.key,
    required this.currentZone,
    required this.fixationLabel,
    required this.dwellProgress,
    required this.trackingLabel,
    required this.governanceStatus,
    required this.safetyStatus,
    required this.lastBlockedGate,
    required this.invalidSum,
    required this.invalidNoFace,
    required this.invalidGaze,
    required this.processedFps,
    required this.avgEncodeMs,
    required this.avgChannelMs,
    required this.lastNativeTotalMs,
    required this.attentionScore,
    required this.confidenceScore,
    required this.fraudScore,
    required this.attentionState,
    required this.attentionValid,
  });

  /// False in release (`dart.vm.product`); parent should still gate with `kDebugMode`.
  static const bool debugShowConfidenceHud =
      !bool.fromEnvironment('dart.vm.product');

  final String? currentZone;
  final String fixationLabel;
  final double dwellProgress;
  final String trackingLabel;
  final String governanceStatus;
  final String safetyStatus;
  final String? lastBlockedGate;
  final int invalidSum;
  final int invalidNoFace;
  final int invalidGaze;
  final double processedFps;
  final double avgEncodeMs;
  final double avgChannelMs;
  final double lastNativeTotalMs;
  final double attentionScore;
  final double confidenceScore;
  final double fraudScore;
  final AttentionRuntimeState attentionState;
  final bool attentionValid;

  static String governanceStatusFromGate(AutonomousActionGateResult? r) {
    if (r == null) return '—';
    return switch (r) {
      AutonomousActionGateResult.allowed => 'ok',
      AutonomousActionGateResult.blockedGovernance => 'blocked',
      AutonomousActionGateResult.blockedSafety => 'ok',
      AutonomousActionGateResult.blockedPrefilter ||
      AutonomousActionGateResult.blockedEmergencyKillSwitch ||
      AutonomousActionGateResult.blockedSandbox =>
        'skip',
    };
  }

  static String safetyStatusFromGate(AutonomousActionGateResult? r) {
    if (r == null) return '—';
    return switch (r) {
      AutonomousActionGateResult.allowed => 'ok',
      AutonomousActionGateResult.blockedSafety => 'blocked',
      AutonomousActionGateResult.blockedGovernance ||
      AutonomousActionGateResult.blockedPrefilter ||
      AutonomousActionGateResult.blockedEmergencyKillSwitch ||
      AutonomousActionGateResult.blockedSandbox =>
        'skip',
    };
  }

  @override
  Widget build(BuildContext context) {
    final zone = currentZone ?? '—';
    final gate = lastBlockedGate ?? '—';
    const textStyle = TextStyle(
      color: Colors.white70,
      fontSize: 11,
      height: 1.25,
      fontFamily: 'monospace',
    );

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 320),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.72),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.white24),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: DefaultTextStyle(
            style: textStyle,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'CONFIDENCE HUD',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                Text('zone: $zone  fix: $fixationLabel'),
                Text(
                  'dwell: ${dwellProgress.toStringAsFixed(2)}  track: $trackingLabel',
                ),
                Text('gov: $governanceStatus  safe: $safetyStatus  gate: $gate'),
                Text(
                  'invalid: sum=$invalidSum noFace=$invalidNoFace gaze=$invalidGaze',
                ),
                Text(
                  'fps(proc)=${processedFps.toStringAsFixed(1)} '
                  'ms(enc)=${avgEncodeMs.toStringAsFixed(2)} '
                  'ch=${avgChannelMs.toStringAsFixed(2)} '
                  'nativeΣ=${lastNativeTotalMs.toStringAsFixed(1)}',
                ),
                Text(
                  'attn=${attentionScore.toStringAsFixed(2)} '
                  'conf=${confidenceScore.toStringAsFixed(2)} '
                  'fraud=${fraudScore.toStringAsFixed(1)} '
                  'state=${attentionState.name} '
                  'valid=$attentionValid',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
