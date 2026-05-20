/// Observe-only verification stability for promoted Android eye-tracking runtime.
///
/// Smooths noisy Dart-side signals over a short rolling window and exposes an
/// operator-readable confidence band. Does not gate rewards, dwell, or native pipeline.
library;

/// Discrete gaze band used by verification smoothing (aligned with [getZone] labels).
enum VerificationZoneState {
  left('LEFT'),
  center('CENTER'),
  right('RIGHT'),
  unknown('—');

  const VerificationZoneState(this.label);
  final String label;

  static VerificationZoneState fromZoneLabel(String? zone) {
    switch (zone) {
      case 'LEFT':
        return VerificationZoneState.left;
      case 'RIGHT':
        return VerificationZoneState.right;
      case 'CENTER':
        return VerificationZoneState.center;
      default:
        return VerificationZoneState.unknown;
    }
  }
}

/// Operator-facing confidence band (not production scoring).
enum VerificationConfidenceBand {
  poor('POOR'),
  warming('WARMING'),
  usable('USABLE'),
  strong('STRONG');

  const VerificationConfidenceBand(this.label);
  final String label;
}

/// One frame of inputs fed into the rolling window.
final class VerificationSignalSample {
  const VerificationSignalSample({
    required this.timestampMs,
    this.zone,
    this.gazeX,
    this.normalizedGazeX,
    this.meanEar,
    this.blinkDetected = false,
    this.validFrame = false,
    this.processedFps = 0,
    this.dwellReady = false,
  });

  final int timestampMs;
  final String? zone;
  final double? gazeX;
  final double? normalizedGazeX;
  final double? meanEar;
  final bool blinkDetected;
  final bool validFrame;
  final double processedFps;
  final bool dwellReady;
}

/// Immutable snapshot after [VerificationStabilityLayer.ingest].
final class VerificationStabilitySnapshot {
  const VerificationStabilitySnapshot({
    required this.stableZone,
    required this.confidenceBand,
    required this.validFrameRatio,
    required this.zoneConsistency,
    required this.dwellReadiness,
    required this.blinkConfidence,
    required this.fpsConfidence,
    required this.reason,
    required this.sampleCount,
    required this.windowMs,
  });

  final VerificationZoneState stableZone;
  final VerificationConfidenceBand confidenceBand;
  final double validFrameRatio;
  final double zoneConsistency;
  final double dwellReadiness;
  final double blinkConfidence;
  final double fpsConfidence;
  final String reason;
  final int sampleCount;
  final int windowMs;

  static const VerificationStabilitySnapshot empty = VerificationStabilitySnapshot(
    stableZone: VerificationZoneState.unknown,
    confidenceBand: VerificationConfidenceBand.poor,
    validFrameRatio: 0,
    zoneConsistency: 0,
    dwellReadiness: 0,
    blinkConfidence: 0,
    fpsConfidence: 0,
    reason: 'warming window',
    sampleCount: 0,
    windowMs: 0,
  );
}

/// Rolling-window smoother (~2s) for runtime verification telemetry.
final class VerificationStabilityLayer {
  VerificationStabilityLayer({this.windowDurationMs = 2000});

  final int windowDurationMs;
  final List<VerificationSignalSample> _samples = <VerificationSignalSample>[];
  VerificationZoneState _lastStableZone = VerificationZoneState.unknown;
  VerificationStabilitySnapshot _snapshot = VerificationStabilitySnapshot.empty;

  VerificationStabilitySnapshot get snapshot => _snapshot;

  /// Adds [sample], prunes stale entries, returns the latest [snapshot].
  VerificationStabilitySnapshot ingest(VerificationSignalSample sample) {
    _samples.add(sample);
    _prune(sample.timestampMs);
    _snapshot = _compute(sample.timestampMs);
    return _snapshot;
  }

  void reset() {
    _samples.clear();
    _lastStableZone = VerificationZoneState.unknown;
    _snapshot = VerificationStabilitySnapshot.empty;
  }

  void _prune(int nowMs) {
    final cutoff = nowMs - windowDurationMs;
    while (_samples.isNotEmpty && _samples.first.timestampMs < cutoff) {
      _samples.removeAt(0);
    }
  }

  VerificationStabilitySnapshot _compute(int nowMs) {
    if (_samples.isEmpty) {
      return VerificationStabilitySnapshot.empty;
    }

    final total = _samples.length;
    final validCount =
        _samples.where((s) => s.validFrame).length;
    final validFrameRatio = validCount / total;

    final validSamples =
        _samples.where((s) => s.validFrame && s.zone != null).toList();
    final zoneVotes = <String, int>{};
    for (final s in validSamples) {
      final z = s.zone!;
      zoneVotes[z] = (zoneVotes[z] ?? 0) + 1;
    }

    String? dominantZone;
    var dominantShare = 0.0;
    if (zoneVotes.isNotEmpty) {
      var best = 0;
      for (final e in zoneVotes.entries) {
        if (e.value > best) {
          best = e.value;
          dominantZone = e.key;
        }
      }
      dominantShare = best / validSamples.length;
    }

    var zoneConsistency = 0.0;
    if (validSamples.isNotEmpty && dominantZone != null) {
      final matches =
          validSamples.where((s) => s.zone == dominantZone).length;
      zoneConsistency = matches / validSamples.length;
    }

    final stableZone = _resolveStableZone(
      dominantZone: dominantZone,
      dominantShare: dominantShare,
    );
    _lastStableZone = stableZone;

    final dwellReadyCount =
        _samples.where((s) => s.dwellReady).length;
    final dwellReadiness = dwellReadyCount / total;

    final blinkConfidence = _blinkConfidence(_samples);
    final fpsConfidence = _fpsConfidence(_samples);

    final band = _confidenceBand(
      validFrameRatio: validFrameRatio,
      zoneConsistency: zoneConsistency,
      dwellReadiness: dwellReadiness,
      blinkConfidence: blinkConfidence,
      fpsConfidence: fpsConfidence,
    );

    final reason = _reasonFor(
      band: band,
      validFrameRatio: validFrameRatio,
      zoneConsistency: zoneConsistency,
      dwellReadiness: dwellReadiness,
      blinkConfidence: blinkConfidence,
      fpsConfidence: fpsConfidence,
      stableZone: stableZone,
    );

    final windowMs = nowMs - _samples.first.timestampMs;

    return VerificationStabilitySnapshot(
      stableZone: stableZone,
      confidenceBand: band,
      validFrameRatio: validFrameRatio,
      zoneConsistency: zoneConsistency,
      dwellReadiness: dwellReadiness,
      blinkConfidence: blinkConfidence,
      fpsConfidence: fpsConfidence,
      reason: reason,
      sampleCount: total,
      windowMs: windowMs.clamp(0, windowDurationMs),
    );
  }

  VerificationZoneState _resolveStableZone({
    required String? dominantZone,
    required double dominantShare,
  }) {
    if (dominantZone == null) {
      return _lastStableZone == VerificationZoneState.unknown
          ? VerificationZoneState.unknown
          : _lastStableZone;
    }
    const adoptThreshold = 0.55;
    const holdThreshold = 0.45;
    final candidate = VerificationZoneState.fromZoneLabel(dominantZone);
    if (candidate == VerificationZoneState.unknown) {
      return _lastStableZone;
    }
    if (_lastStableZone == VerificationZoneState.unknown) {
      return dominantShare >= adoptThreshold ? candidate : VerificationZoneState.unknown;
    }
    if (candidate == _lastStableZone) {
      return _lastStableZone;
    }
    if (dominantShare >= adoptThreshold) {
      return candidate;
    }
    if (dominantShare >= holdThreshold) {
      return _lastStableZone;
    }
    return VerificationZoneState.unknown;
  }

  static double _fpsConfidence(List<VerificationSignalSample> samples) {
    final fpsValues = samples
        .map((s) => s.processedFps)
        .where((f) => f.isFinite && f > 0)
        .toList();
    if (fpsValues.isEmpty) return 0;
    final avg = fpsValues.reduce((a, b) => a + b) / fpsValues.length;
    if (avg < 2) return (avg / 2) * 0.35;
    if (avg < 4) return 0.35 + ((avg - 2) / 2) * 0.2;
    if (avg < 6) return 0.55 + ((avg - 4) / 2) * 0.2;
    if (avg < 10) return 0.75 + ((avg - 6) / 4) * 0.2;
    return 0.95;
  }

  static double _blinkConfidence(List<VerificationSignalSample> samples) {
    if (samples.isEmpty) return 0;

    var earScore = 0.0;
    var earCount = 0;
    var blinkTransitions = 0;
    bool? prevBlink;

    for (final s in samples) {
      final ear = s.meanEar;
      if (ear != null && ear.isFinite) {
        earCount++;
        if (ear >= 0.08 && ear <= 0.42) {
          earScore += 1;
        } else if (ear > 0.42) {
          earScore += 0.7;
        } else {
          earScore += 0.4;
        }
      }
      if (prevBlink != null && prevBlink != s.blinkDetected) {
        blinkTransitions++;
      }
      prevBlink = s.blinkDetected;
    }

    final earConfidence =
        earCount == 0 ? 0.5 : (earScore / earCount).clamp(0.0, 1.0);
    final maxTransitions = (samples.length / 3).ceil().clamp(1, samples.length);
    final stability =
        (1.0 - (blinkTransitions / maxTransitions)).clamp(0.0, 1.0);
    return (earConfidence * 0.65 + stability * 0.35).clamp(0.0, 1.0);
  }

  static VerificationConfidenceBand _confidenceBand({
    required double validFrameRatio,
    required double zoneConsistency,
    required double dwellReadiness,
    required double blinkConfidence,
    required double fpsConfidence,
  }) {
    final score = validFrameRatio * 0.30 +
        zoneConsistency * 0.25 +
        fpsConfidence * 0.20 +
        blinkConfidence * 0.15 +
        dwellReadiness * 0.10;

    if (validFrameRatio < 0.40 || fpsConfidence < 0.25) {
      return VerificationConfidenceBand.poor;
    }
    if (score < 0.48) {
      return VerificationConfidenceBand.poor;
    }
    if (score < 0.62 ||
        validFrameRatio < 0.65 ||
        zoneConsistency < 0.50) {
      return VerificationConfidenceBand.warming;
    }
    if (score < 0.78 ||
        validFrameRatio < 0.75 ||
        zoneConsistency < 0.65 ||
        fpsConfidence < 0.55) {
      return VerificationConfidenceBand.usable;
    }
    return VerificationConfidenceBand.strong;
  }

  static String _reasonFor({
    required VerificationConfidenceBand band,
    required double validFrameRatio,
    required double zoneConsistency,
    required double dwellReadiness,
    required double blinkConfidence,
    required double fpsConfidence,
    required VerificationZoneState stableZone,
  }) {
    final parts = <String>[
      'zone=${stableZone.label}',
      'valid=${(validFrameRatio * 100).round()}%',
      'consist=${(zoneConsistency * 100).round()}%',
      'fps=${(fpsConfidence * 100).round()}%',
      'blink=${(blinkConfidence * 100).round()}%',
      if (dwellReadiness > 0) 'dwell=${(dwellReadiness * 100).round()}%',
    ];

    switch (band) {
      case VerificationConfidenceBand.poor:
        if (validFrameRatio < 0.5) {
          parts.add('low valid frames');
        }
        if (fpsConfidence < 0.4) {
          parts.add('low processed fps');
        }
        break;
      case VerificationConfidenceBand.warming:
        parts.add('stabilizing');
        break;
      case VerificationConfidenceBand.usable:
        parts.add('operator-observable');
        break;
      case VerificationConfidenceBand.strong:
        parts.add('stable window');
        break;
    }
    return parts.join(' · ');
  }
}
