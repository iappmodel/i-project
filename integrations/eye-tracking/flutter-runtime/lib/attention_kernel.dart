import 'dart:ui';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';

class KernelTelemetry {
  final double confidence;
  final double stability;
  final double headPenalty;
  final double velocityPenalty;
  final int fixationDuration;
  final bool isFixating;
  final bool passed;
  final String reason;

  const KernelTelemetry({
    required this.confidence,
    required this.stability,
    required this.headPenalty,
    required this.velocityPenalty,
    required this.fixationDuration,
    required this.isFixating,
    required this.passed,
    required this.reason,
  });
}

class AttentionState {
  final Offset gaze;
  final double stability;
  final bool isFixating;
  final bool blink;
  final int timestamp;

  const AttentionState({
    required this.gaze,
    required this.stability,
    required this.isFixating,
    required this.blink,
    required this.timestamp,
  });
}

class AttentionKernel {
  // HARD LIMITS
  static const double minStability = 0.25;
  static const double maxPointerSpeed = 0.05;
  static const int minFixationMs = 120;
  static const int maxIdleMs = 600;

  final ValueNotifier<KernelTelemetry?> telemetryNotifier =
      ValueNotifier<KernelTelemetry?>(null);

  Offset _lastPointer = Offset.zero;
  int _lastFixationStart = 0;
  int _lastActiveTime = 0;

  AttentionState? process({
    required Offset rawGaze,
    required double stability,
    required bool isFixating,
    required bool blink,
    required int now,
    double headPenalty = 0,
  }) {
    final clampedHeadPenalty = headPenalty.clamp(0.0, 1.0).toDouble();
    final fixationDuration = isFixating && _lastFixationStart != 0
        ? now - _lastFixationStart
        : 0;

    if (stability < minStability) {
      telemetryNotifier.value = KernelTelemetry(
        confidence: (stability * (1.0 - clampedHeadPenalty))
            .clamp(0.0, 1.0)
            .toDouble(),
        stability: stability,
        headPenalty: clampedHeadPenalty,
        velocityPenalty: 1.0,
        fixationDuration: fixationDuration,
        isFixating: isFixating,
        passed: false,
        reason: 'low_stability',
      );
      return null;
    }

    if (isFixating) {
      _lastFixationStart = _lastFixationStart == 0 ? now : _lastFixationStart;
      final nextFixationDuration = now - _lastFixationStart;
      if (nextFixationDuration < minFixationMs) {
        telemetryNotifier.value = KernelTelemetry(
          confidence: (stability * (1.0 - clampedHeadPenalty))
              .clamp(0.0, 1.0)
              .toDouble(),
          stability: stability,
          headPenalty: clampedHeadPenalty,
          velocityPenalty: 1.0,
          fixationDuration: nextFixationDuration,
          isFixating: true,
          passed: false,
          reason: 'fixation_too_short',
        );
        return null;
      }
    } else {
      _lastFixationStart = 0;
    }

    final dx = (rawGaze.dx - _lastPointer.dx)
        .clamp(-maxPointerSpeed, maxPointerSpeed)
        .toDouble();
    final dy = (rawGaze.dy - _lastPointer.dy)
        .clamp(-maxPointerSpeed, maxPointerSpeed)
        .toDouble();
    final velocity = math.sqrt(dx * dx + dy * dy);
    final velocityPenalty = (velocity / maxPointerSpeed).clamp(0.0, 1.0);

    final filteredPointer = Offset(
      _lastPointer.dx + dx,
      _lastPointer.dy + dy,
    );

    _lastPointer = filteredPointer;
    _lastActiveTime = now;
    final nextFixationDuration = isFixating && _lastFixationStart != 0
        ? now - _lastFixationStart
        : 0;
    final confidence = (stability * (1.0 - clampedHeadPenalty) * (1.0 - velocityPenalty))
        .clamp(0.0, 1.0)
        .toDouble();
    telemetryNotifier.value = KernelTelemetry(
      confidence: confidence,
      stability: stability,
      headPenalty: clampedHeadPenalty,
      velocityPenalty: velocityPenalty,
      fixationDuration: nextFixationDuration,
      isFixating: isFixating,
      passed: true,
      reason: 'ok',
    );

    return AttentionState(
      gaze: filteredPointer,
      stability: stability,
      isFixating: isFixating,
      blink: blink,
      timestamp: now,
    );
  }

  bool isIdle(int now) {
    return (now - _lastActiveTime) > maxIdleMs;
  }

  void reset() {
    _lastPointer = Offset.zero;
    _lastFixationStart = 0;
    _lastActiveTime = 0;
    telemetryNotifier.value = null;
  }

  void dispose() {
    telemetryNotifier.dispose();
  }
}
