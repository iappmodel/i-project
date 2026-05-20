import 'dart:ui';
import 'dart:math' as math;

import 'package:eye_tracking_app/attention_verification_result.dart';
import 'package:flutter/foundation.dart';

enum AttentionRewardTier {
  ignore,
  partial,
  full,
  premium,
}

enum AttentionIntent {
  passive,
  engaged,
  highIntent,
  fatigued,
  distracted,
}

class AttentionScore {
  final double presence;
  final double stability;
  final double engagement;

  const AttentionScore({
    required this.presence,
    required this.stability,
    required this.engagement,
  });

  double total() {
    final p = presence.clamp(0.0, 1.0).toDouble();
    final s = stability.clamp(0.0, 1.0).toDouble();
    final e = engagement.clamp(0.0, 1.0).toDouble();
    return (p * 0.4) + (s * 0.3) + (e * 0.3);
  }
}

AttentionRewardTier rewardTierForAttention(double score) {
  final clamped = score.clamp(0.0, 1.0).toDouble();
  if (clamped < 0.4) return AttentionRewardTier.ignore;
  if (clamped < 0.7) return AttentionRewardTier.partial;
  if (clamped < 0.85) return AttentionRewardTier.full;
  return AttentionRewardTier.premium;
}

double rewardMultiplierForAttention(double score) {
  final clamped = score.clamp(0.0, 1.0).toDouble();
  final tier = rewardTierForAttention(clamped);
  switch (tier) {
    case AttentionRewardTier.ignore:
      return 0.0;
    case AttentionRewardTier.partial:
      return clamped;
    case AttentionRewardTier.full:
      return 1.0;
    case AttentionRewardTier.premium:
      return 1.15;
  }
}

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
  final double score;
  final double confidence;
  final AttentionIntent intent;
  final int predictedDurationMs;
  final double fraudRisk;

  const AttentionState({
    required this.gaze,
    required this.stability,
    required this.isFixating,
    required this.blink,
    required this.timestamp,
    required this.score,
    required this.confidence,
    required this.intent,
    required this.predictedDurationMs,
    required this.fraudRisk,
  });
}

final class AttentionFeatures {
  const AttentionFeatures({
    required this.gazeStability,
    required this.eyeOpennessRatio,
    required this.blinkFrequency,
    required this.pupilVariance,
    required this.scrollSpeed,
    required this.pauseDurationMs,
    required this.interactionLatencyMs,
    required this.sessionTimeMs,
    required this.fatigueIndex,
    required this.contentType,
    required this.rewardExpectation,
  });

  final double gazeStability;
  final double eyeOpennessRatio;
  final double blinkFrequency;
  final double pupilVariance;
  final double scrollSpeed;
  final double pauseDurationMs;
  final double interactionLatencyMs;
  final int sessionTimeMs;
  final double fatigueIndex;
  final String contentType;
  final double rewardExpectation;
}

class AttentionKernel {
  AttentionKernel({void Function(VoidCallback fn)? safeUiUpdate})
      : _safeUiUpdate = safeUiUpdate ?? ((fn) => fn());

  // HARD LIMITS
  static const double minStability = 0.25;
  static const double maxPointerSpeed = 0.05;
  static const int minFixationMs = 120;
  static const int maxIdleMs = 600;

  final ValueNotifier<KernelTelemetry?> telemetryNotifier =
      ValueNotifier<KernelTelemetry?>(null);
  final void Function(VoidCallback fn) _safeUiUpdate;

  Offset _lastPointer = Offset.zero;
  int _lastFixationStart = 0;
  int _lastActiveTime = 0;
  double _rollingScore = 0.0;
  double _lastRawScore = 0.0;
  int _lastAttentionTs = 0;

  AttentionState? process({
    required Offset rawGaze,
    required double stability,
    required bool isFixating,
    required bool blink,
    required int now,
    double headPenalty = 0,
    AttentionFeatures? features,
  }) {
    final clampedHeadPenalty = headPenalty.clamp(0.0, 1.0).toDouble();
    final fixationDuration = isFixating && _lastFixationStart != 0
        ? now - _lastFixationStart
        : 0;

    if (stability < minStability) {
      _setTelemetry(KernelTelemetry(
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
      ));
      return null;
    }

    if (isFixating) {
      _lastFixationStart = _lastFixationStart == 0 ? now : _lastFixationStart;
      final nextFixationDuration = now - _lastFixationStart;
      if (nextFixationDuration < minFixationMs) {
        _setTelemetry(KernelTelemetry(
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
        ));
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
    _setTelemetry(KernelTelemetry(
      confidence: confidence,
      stability: stability,
      headPenalty: clampedHeadPenalty,
      velocityPenalty: velocityPenalty,
      fixationDuration: nextFixationDuration,
      isFixating: isFixating,
      passed: true,
      reason: 'ok',
    ));

    final resolvedFeatures = features ??
        _deriveFeatures(
          stability: stability,
          isFixating: isFixating,
          blink: blink,
          now: now,
        );
    final scored = _computeAttentionState(
      features: resolvedFeatures,
      baseStability: stability,
      velocityPenalty: velocityPenalty,
      headPenalty: clampedHeadPenalty,
      now: now,
    );

    return AttentionState(
      gaze: filteredPointer,
      stability: stability,
      isFixating: isFixating,
      blink: blink,
      timestamp: now,
      score: scored.$1,
      confidence: scored.$2,
      intent: scored.$3,
      predictedDurationMs: scored.$4,
      fraudRisk: scored.$5,
    );
  }

  bool isIdle(int now) {
    return (now - _lastActiveTime) > maxIdleMs;
  }

  void reset() {
    _lastPointer = Offset.zero;
    _lastFixationStart = 0;
    _lastActiveTime = 0;
    _rollingScore = 0.0;
    _lastRawScore = 0.0;
    _lastAttentionTs = 0;
    _setTelemetry(null);
  }

  AttentionFeatures _deriveFeatures({
    required double stability,
    required bool isFixating,
    required bool blink,
    required int now,
  }) {
    final dtMs = _lastAttentionTs == 0 ? 16 : (now - _lastAttentionTs).clamp(16, 1000);
    _lastAttentionTs = now;
    final inferredBlinkFrequency = blink ? 1.0 : (1000 / dtMs) * 0.04;
    return AttentionFeatures(
      gazeStability: stability.clamp(0.0, 1.0).toDouble(),
      eyeOpennessRatio: blink ? 0.2 : 0.9,
      blinkFrequency: inferredBlinkFrequency.clamp(0.0, 1.0).toDouble(),
      pupilVariance: (1.0 - stability).clamp(0.0, 1.0).toDouble(),
      scrollSpeed: 0.0,
      pauseDurationMs: isFixating ? dtMs.toDouble() : 0.0,
      interactionLatencyMs: isFixating ? 240.0 : 520.0,
      sessionTimeMs: now,
      fatigueIndex: (1.0 - stability).clamp(0.0, 1.0).toDouble(),
      contentType: 'mixed',
      rewardExpectation: 0.5,
    );
  }

  (double, double, AttentionIntent, int, double) _computeAttentionState({
    required AttentionFeatures features,
    required double baseStability,
    required double velocityPenalty,
    required double headPenalty,
    required int now,
  }) {
    // 1) Detection: are they actually looking?
    final attentionRaw = (
      (features.gazeStability * 0.35) +
      (features.eyeOpennessRatio * 0.25) +
      ((1.0 - features.blinkFrequency).clamp(0.0, 1.0) * 0.2) +
      ((1.0 - features.pupilVariance).clamp(0.0, 1.0) * 0.2)
    ).clamp(0.0, 1.0).toDouble();

    // 2) Behavior: engaged vs idle stare.
    final pauseSignal = (features.pauseDurationMs / 1800.0).clamp(0.0, 1.0);
    final scrollSignal = (1.0 - features.scrollSpeed).clamp(0.0, 1.0);
    final latencySignal = (1.0 - (features.interactionLatencyMs / 2000.0))
        .clamp(0.0, 1.0);
    final attentionBehavior = (
      (pauseSignal * 0.45) +
      (scrollSignal * 0.30) +
      (latencySignal * 0.25)
    ).clamp(0.0, 1.0).toDouble();

    // 3) Prediction confidence: expected next-5s continuity.
    final continuity = (1.0 - (velocityPenalty * 0.7 + headPenalty * 0.3))
        .clamp(0.0, 1.0)
        .toDouble();
    final predictionConfidence = (
      (continuity * 0.5) +
      (attentionBehavior * 0.3) +
      (features.rewardExpectation.clamp(0.0, 1.0) * 0.2)
    ).clamp(0.0, 1.0).toDouble();

    final attentionScore = (
      (attentionRaw * 0.4) +
      (attentionBehavior * 0.35) +
      (predictionConfidence * 0.25)
    ).clamp(0.0, 1.0).toDouble();

    _rollingScore = (_rollingScore * 0.7) + (attentionScore * 0.3);

    final confidence = (
      baseStability * (1.0 - velocityPenalty) * (1.0 - headPenalty)
    ).clamp(0.0, 1.0).toDouble();

    final fatigueFromSession = (features.sessionTimeMs / (25 * 60 * 1000))
        .clamp(0.0, 1.0)
        .toDouble();
    final fatigue = ((features.fatigueIndex * 0.65) + (fatigueFromSession * 0.35))
        .clamp(0.0, 1.0)
        .toDouble();

    // Projected hold time in ms for "next best content".
    final predictedDurationMs = (
      800 +
      (_rollingScore * 5200) -
      (fatigue * 1800)
    ).round().clamp(500, 7000);

    final noMovementAnomaly = velocityPenalty < 0.03 && _rollingScore > 0.75;
    final perfectCurveAnomaly = (_rollingScore - _lastRawScore).abs() < 0.0008 &&
        _rollingScore > 0.85;
    final offPatternPenalty = features.gazeStability < 0.2 && _rollingScore > 0.7;
    _lastRawScore = _rollingScore;
    final fraudRisk = (
      (noMovementAnomaly ? 0.35 : 0.0) +
      (perfectCurveAnomaly ? 0.3 : 0.0) +
      (offPatternPenalty ? 0.25 : 0.0) +
      ((1.0 - confidence) * 0.2)
    ).clamp(0.0, 1.0).toDouble();

    final intent = _classifyIntent(_rollingScore, fatigue, fraudRisk);

    return (_rollingScore, confidence, intent, predictedDurationMs, fraudRisk);
  }

  AttentionIntent _classifyIntent(
    double score,
    double fatigue,
    double fraudRisk,
  ) {
    if (fatigue >= 0.72) return AttentionIntent.fatigued;
    if (fraudRisk >= 0.7 || score < 0.3) return AttentionIntent.distracted;
    if (score > 0.8) return AttentionIntent.highIntent;
    if (score >= 0.6) return AttentionIntent.engaged;
    return AttentionIntent.passive;
  }

  void _setTelemetry(KernelTelemetry? value) {
    _safeUiUpdate(() {
      telemetryNotifier.value = value;
    });
  }

  void dispose() {
    telemetryNotifier.dispose();
  }
}

final class AttentionSignalFrame {
  const AttentionSignalFrame({
    required this.timestampMs,
    required this.hasFace,
    required this.gaze,
    required this.ear,
    required this.headYawDeg,
    required this.headPitchDeg,
    required this.isFixating,
    required this.blinkEdge,
    required this.interactionSignal,
    required this.nativeFraudFlags,
    this.confidence,
    this.contentVisibility = 1.0,
    this.appInForeground = true,
  });

  final int timestampMs;
  final bool hasFace;
  final Offset? gaze;
  final double? ear;
  final double? headYawDeg;
  final double? headPitchDeg;
  final bool isFixating;
  final bool blinkEdge;
  final double interactionSignal;
  final bool nativeFraudFlags;
  /// Optional per-frame detector confidence (0–1); omitted frames use engine roll-up.
  final double? confidence;
  /// Fraction of content area visible / unobstructed (0–1).
  final double contentVisibility;
  final bool appInForeground;
}

final class AttentionSessionResult {
  const AttentionSessionResult({
    required this.attentionScore,
    required this.fraudScore,
    required this.valid,
    required this.focusTimeMs,
    required this.gazeRatio,
    required this.entropyScore,
  });

  final double attentionScore;
  final double fraudScore;
  final bool valid;
  final int focusTimeMs;
  final double gazeRatio;
  final double entropyScore;
}

final class AttentionVerificationSnapshot {
  const AttentionVerificationSnapshot({
    required this.instantAttentionScore,
    required this.rollingAttentionScore,
    required this.confidenceScore,
    required this.fraudScore,
    required this.focusTimeMs,
    required this.gazeRatio,
    required this.entropyScore,
    required this.state,
    required this.valid,
    required this.reason,
    required this.flags,
  });

  final double instantAttentionScore;
  final double rollingAttentionScore;
  final double confidenceScore;
  final double fraudScore;
  final int focusTimeMs;
  final double gazeRatio;
  final double entropyScore;
  final AttentionRuntimeState state;
  final bool valid;
  final String reason;
  final List<String> flags;
}

enum AttentionRuntimeState {
  noFace,
  lowAttention,
  active,
  highFocus,
  fraudSuspect,
}

final class AttentionVerificationEngine {
  AttentionVerificationEngine({
    Rect? contentBounds,
    this.earThreshold = 0.2,
    this.requiredFocusMs = 3000,
    this.rollingWindowMs = 5000,
    this.validAttentionThreshold = 0.5,
    this.confidenceThreshold = 0.6,
    this.fraudThreshold = 0.6,
    this.faceMissingFailMs = 1500,
    this.gazeOffScreenFailMs = 2000,
  }) : contentBounds = contentBounds ?? const Rect.fromLTWH(0.15, 0.2, 0.7, 0.6);

  final Rect contentBounds;
  final double earThreshold;
  final int requiredFocusMs;
  final int rollingWindowMs;
  final double validAttentionThreshold;
  final double confidenceThreshold;
  final double fraudThreshold;
  final int faceMissingFailMs;
  final int gazeOffScreenFailMs;

  final List<AttentionSignalFrame> _frames = <AttentionSignalFrame>[];
  final List<double> _blinkIntervalsMs = <double>[];
  final List<double> _gazeDelta = <double>[];

  Offset? _lastGaze;
  int? _lastTimestampMs;
  int? _lastBlinkMs;
  double _rollingAttention = 0.0;
  double _fraudScore = 0.0;
  double _confidenceScore = 0.0;
  String _lastReason = 'not_ready';
  List<String> _lastFlags = const <String>[];
  AttentionRuntimeState _state = AttentionRuntimeState.noFace;
  int _faceMissingMs = 0;
  int _gazeOffScreenMs = 0;

  AttentionVerificationSnapshot update(AttentionSignalFrame frame) {
    final dtMs = (_lastTimestampMs == null)
        ? 0
        : (frame.timestampMs - _lastTimestampMs!).clamp(0, 250);
    _frames.add(frame);
    _trimWindow(frame.timestampMs);
    _updateTemporalFeatures(frame);
    _updateFailDurations(frame, dtMs);

    final facePresenceScore = _facePresenceScore();
    final gazeScore = _gazeScore();
    final eyeOpenScore = _eyeOpenScore();
    final headAlignmentScore = _headAlignmentScore();
    final microMotionScore = _microMotionScore();
    final temporalConsistencyScore = _temporalConsistencyScore(frame);
    final entropyScore = _entropyScore();
    final faceVisibility = _faceVisibilityScore();
    final lightingQuality = _lightingQualityScore();
    final landmarkStability = _landmarkStabilityScore();
    final blinkScore = _blinkValidityScore();

    // Core verify-layer formula (0..1): weighted multi-signal fusion.
    final instantAttention = (facePresenceScore * 0.15) +
        (eyeOpenScore * 0.15) +
        (gazeScore * 0.25) +
        (headAlignmentScore * 0.10) +
        (microMotionScore * 0.15) +
        (temporalConsistencyScore * 0.20);
    final continuityFactor = _continuityFactor().clamp(0.0, 1.0);
    final authenticityFactor = ((microMotionScore * 0.45) +
            (blinkScore * 0.35) +
            ((1.0 - (_fraudScore / 100.0).clamp(0.0, 1.0)) * 0.20))
        .clamp(0.0, 1.0);
    final sessionAttention = (instantAttention *
            (0.6 + (continuityFactor * 0.4)) *
            (0.6 + (authenticityFactor * 0.4)))
        .clamp(0.0, 1.0);
    _rollingAttention = (_rollingAttention * 0.55) + (sessionAttention * 0.45);

    _confidenceScore =
        ((lightingQuality * 0.30) +
                (faceVisibility * 0.20) +
                (landmarkStability * 0.20) +
                (temporalConsistencyScore * 0.20) +
                (blinkScore * 0.10))
            .clamp(0.0, 1.0);
    _fraudScore = _computeFraudScore(frame).clamp(0.0, 1.0);
    final decision = _evaluateDecision(frame);
    _lastReason = decision.$1;
    _lastFlags = decision.$2;
    _state = _deriveState(frame);
    final valid = _isSessionValid(decision.$2);

    return AttentionVerificationSnapshot(
      instantAttentionScore: instantAttention * 100.0,
      rollingAttentionScore: _rollingAttention * 100.0,
      confidenceScore: _confidenceScore,
      fraudScore: _fraudScore * 100.0,
      focusTimeMs: _focusTimeMs(),
      gazeRatio: gazeScore,
      entropyScore: entropyScore,
      state: _state,
      valid: valid,
      reason: _lastReason,
      flags: _lastFlags,
    );
  }

  AttentionSessionResult finalize() {
    return AttentionSessionResult(
      attentionScore: (_rollingAttention * 100.0).clamp(0.0, 100.0),
      fraudScore: (_fraudScore * 100.0).clamp(0.0, 100.0),
      valid: _isSessionValid(_lastFlags),
      focusTimeMs: _focusTimeMs(),
      gazeRatio: _gazeScore(),
      entropyScore: _entropyScore(),
    );
  }

  void reset() {
    _frames.clear();
    _blinkIntervalsMs.clear();
    _gazeDelta.clear();
    _lastGaze = null;
    _lastTimestampMs = null;
    _lastBlinkMs = null;
    _rollingAttention = 0.0;
    _fraudScore = 0.0;
    _confidenceScore = 0.0;
    _lastReason = 'not_ready';
    _lastFlags = const <String>[];
    _state = AttentionRuntimeState.noFace;
    _faceMissingMs = 0;
    _gazeOffScreenMs = 0;
  }

  /// Seals the current rolling window into the canonical proof record used for
  /// reward gates. Call after [update]; [snapshot] must be from the same tick.
  AttentionVerificationResult buildVerificationResult({
    required String sessionId,
    required String userId,
    String? campaignId,
    required String contentId,
    required AttentionVerificationSnapshot snapshot,
    DateTime? createdAt,
  }) {
    final at = createdAt ?? DateTime.now().toUtc();
    final watchedMs = _watchedSpanMs();
    final verifiedMs = _focusTimeMs();
    final gazeValidRatio = _gazeScore();
    final facePresentRatio = _facePresenceScore();
    final blinkNaturalnessScore = _blinkValidityScore();
    final interactionScore = _meanInteractionSignal();
    final qualityScore = (_confidenceScore *
            _meanContentVisibility() *
            _foregroundRatio())
        .clamp(0.0, 1.0)
        .toDouble();
    final attentionScore = _rollingAttention.clamp(0.0, 1.0).toDouble();
    final fraudRisk = _fraudScore.clamp(0.0, 1.0).toDouble();
    final verified = snapshot.valid;
    final failureReason = verified ? null : _failureReason(snapshot);

    return AttentionVerificationResult(
      sessionId: sessionId,
      userId: userId,
      campaignId: campaignId,
      contentId: contentId,
      verified: verified,
      attentionScore: attentionScore,
      qualityScore: qualityScore,
      fraudRisk: fraudRisk,
      watchedMs: watchedMs,
      verifiedMs: verifiedMs,
      requiredMs: requiredFocusMs,
      gazeValidRatio: gazeValidRatio,
      facePresentRatio: facePresentRatio,
      blinkNaturalnessScore: blinkNaturalnessScore,
      interactionScore: interactionScore,
      failureReason: failureReason,
      createdAt: at.toIso8601String(),
    );
  }

  int _watchedSpanMs() {
    if (_frames.length < 2) return 0;
    return (_frames.last.timestampMs - _frames.first.timestampMs)
        .clamp(0, rollingWindowMs);
  }

  double _meanInteractionSignal() {
    if (_frames.isEmpty) return 0.0;
    final sum =
        _frames.map((f) => f.interactionSignal).reduce((a, b) => a + b);
    return (sum / _frames.length).clamp(0.0, 1.0).toDouble();
  }

  double _meanContentVisibility() {
    if (_frames.isEmpty) return 1.0;
    final sum =
        _frames.map((f) => f.contentVisibility.clamp(0.0, 1.0)).reduce((a, b) => a + b);
    return (sum / _frames.length).clamp(0.0, 1.0).toDouble();
  }

  double _foregroundRatio() {
    if (_frames.isEmpty) return 0.0;
    final fg = _frames.where((f) => f.appInForeground).length;
    return (fg / _frames.length).clamp(0.0, 1.0).toDouble();
  }

  String _failureReason(AttentionVerificationSnapshot snapshot) {
    final hard = snapshot.flags.where((f) => f.startsWith('hard_fail:')).toList();
    if (hard.isNotEmpty) return hard.first;
    if (snapshot.flags.any((f) => f.startsWith('fraud:'))) {
      return snapshot.flags.firstWhere((f) => f.startsWith('fraud:'));
    }
    return snapshot.reason;
  }

  void _trimWindow(int nowMs) {
    _frames.removeWhere((f) => nowMs - f.timestampMs > rollingWindowMs);
  }

  void _updateTemporalFeatures(AttentionSignalFrame frame) {
    if (frame.gaze != null && _lastGaze != null) {
      final dx = frame.gaze!.dx - _lastGaze!.dx;
      final dy = frame.gaze!.dy - _lastGaze!.dy;
      _gazeDelta.add(math.sqrt((dx * dx) + (dy * dy)));
      if (_gazeDelta.length > 120) _gazeDelta.removeAt(0);
    }
    if (frame.gaze != null) _lastGaze = frame.gaze;
    if (frame.blinkEdge) {
      if (_lastBlinkMs != null) {
        _blinkIntervalsMs.add((frame.timestampMs - _lastBlinkMs!).toDouble());
        if (_blinkIntervalsMs.length > 40) _blinkIntervalsMs.removeAt(0);
      }
      _lastBlinkMs = frame.timestampMs;
    }
    _lastTimestampMs = frame.timestampMs;
  }

  double _gazeScore() {
    if (_frames.isEmpty) return 0.0;
    final withGaze = _frames.where((f) => f.gaze != null).toList();
    if (withGaze.isEmpty) return 0.0;
    final inside = withGaze.where((f) => contentBounds.contains(f.gaze!)).length;
    return (inside / withGaze.length).clamp(0.0, 1.0);
  }

  double _facePresenceScore() {
    if (_frames.isEmpty) return 0.0;
    final withFace = _frames.where((f) => f.hasFace).length;
    return (withFace / _frames.length).clamp(0.0, 1.0);
  }

  double _focusDurationScore() {
    if (_frames.isEmpty) return 0.0;
    final focusMs = _focusTimeMs();
    return (focusMs / requiredFocusMs).clamp(0.0, 1.0);
  }

  double _temporalConsistencyScore(AttentionSignalFrame frame) {
    final focus = _focusDurationScore();
    final offScreenPenalty = (_gazeOffScreenMs / gazeOffScreenFailMs).clamp(0.0, 1.0);
    final noFacePenalty = (_faceMissingMs / faceMissingFailMs).clamp(0.0, 1.0);
    final continuity = (1.0 - (offScreenPenalty * 0.6) - (noFacePenalty * 0.4))
        .clamp(0.0, 1.0);
    final fixatingBoost = frame.isFixating ? 1.0 : 0.85;
    return (focus * continuity * fixatingBoost).clamp(0.0, 1.0);
  }

  int _focusTimeMs() {
    if (_frames.length < 2) return 0;
    var total = 0;
    for (var i = 1; i < _frames.length; i++) {
      final prev = _frames[i - 1];
      final curr = _frames[i];
      if (prev.isFixating && curr.hasFace) {
        total += (curr.timestampMs - prev.timestampMs).clamp(0, 200);
      }
    }
    return total;
  }

  double _eyeOpenScore() {
    final withEar = _frames.where((f) => f.ear != null).toList();
    if (withEar.isEmpty) return 0.0;
    final open = withEar.where((f) => f.ear! >= earThreshold).length;
    return (open / withEar.length).clamp(0.0, 1.0);
  }

  double _headAlignmentScore() {
    final withHead = _frames
        .where((f) => f.headYawDeg != null && f.headPitchDeg != null)
        .toList();
    if (withHead.isEmpty) return 0.0;
    final aligned = withHead
        .where(
          (f) => f.headYawDeg!.abs() <= 30.0 && f.headPitchDeg!.abs() <= 25.0,
        )
        .length;
    return (aligned / withHead.length).clamp(0.0, 1.0);
  }

  double _faceVisibilityScore() {
    final withFace = _frames.where((f) => f.hasFace).toList();
    if (withFace.isEmpty) return 0.0;
    final gazeAvailable = withFace.where((f) => f.gaze != null).length;
    return (gazeAvailable / withFace.length).clamp(0.0, 1.0);
  }

  double _lightingQualityScore() {
    final withEar = _frames.where((f) => f.ear != null).toList();
    if (withEar.isEmpty) return 0.35;
    final earVar = _normalizedVariance(
      withEar.map((f) => f.ear!).toList(),
      scale: 0.02,
    );
    // Very low variance can indicate either stable good lighting or dead feed.
    // Blend with face presence to avoid overconfident static frames.
    final facePresence = _facePresenceScore();
    return ((1.0 - (earVar - 0.15).abs()) * 0.65 + facePresence * 0.35)
        .clamp(0.0, 1.0);
  }

  double _landmarkStabilityScore() {
    if (_gazeDelta.isEmpty) return 0.0;
    final jitter = _normalizedVariance(_gazeDelta, scale: 0.02);
    return (1.0 - jitter).clamp(0.0, 1.0);
  }

  double _microMotionScore() {
    if (_gazeDelta.length < 4) return 0.0;
    final mean = _gazeDelta.reduce((a, b) => a + b) / _gazeDelta.length;
    // Reward natural micro movement band, penalize frozen and wildly erratic traces.
    if (mean < 0.0015) return 0.0;
    if (mean > 0.08) return 0.25;
    final centered = 1.0 - ((mean - 0.015).abs() / 0.03);
    return centered.clamp(0.0, 1.0);
  }

  double _entropyScore() {
    if (_gazeDelta.isEmpty && _blinkIntervalsMs.isEmpty) return 0.0;
    final gazeVar = _normalizedVariance(_gazeDelta, scale: 0.02);
    final blinkVar = _normalizedVariance(_blinkIntervalsMs, scale: 3500.0);
    final combined = (gazeVar * 0.7) + (blinkVar * 0.3);
    return combined.clamp(0.0, 1.0);
  }

  double _computeFraudScore(AttentionSignalFrame frame) {
    var score = frame.nativeFraudFlags ? 0.50 : 0.0;
    final lowGazeVariance = _normalizedVariance(_gazeDelta, scale: 0.02) < 0.08;
    if (lowGazeVariance && _frames.length > 20) score += 0.20; // static gaze

    final blinkVar = _normalizedVariance(_blinkIntervalsMs, scale: 3500.0);
    if (_blinkIntervalsMs.length >= 4 && blinkVar < 0.06) {
      score += 0.15; // loop-like blink timing
    }

    final noFaceSwitches = _noFaceSwitchCount();
    if (noFaceSwitches >= 3) score += 0.10;

    final lowCameraNoise = _normalizedVariance(_gazeDelta, scale: 0.01) < 0.03;
    if (lowCameraNoise && _frames.length > 40) score += 0.10;

    final multiFaceSuspicion = _noFaceSwitchCount() >= 6;
    if (multiFaceSuspicion) score += 0.08;

    final offAngleRatio = 1.0 - _headAlignmentScore();
    if (offAngleRatio > 0.7) score += 0.08;

    if (!frame.hasFace) score += 0.05;
    return score;
  }

  (String, List<String>) _evaluateDecision(AttentionSignalFrame frame) {
    final flags = <String>[];

    if (_faceMissingMs > faceMissingFailMs) {
      return ('fail_face_missing', <String>['hard_fail:face_missing']);
    }
    if (_gazeOffScreenMs > gazeOffScreenFailMs) {
      return ('fail_gaze_off_screen', <String>['hard_fail:gaze_off_screen']);
    }
    if (!frame.hasFace) {
      flags.add('warning:no_face_frame');
    }

    final blinkRate = _blinkRatePerMinute();
    if (blinkRate == 0.0 && _frames.length >= 30) {
      flags.add('suspicious:zero_blink_rate');
    }
    if (_gazeDelta.length >= 20) {
      final gazeVar = _normalizedVariance(_gazeDelta, scale: 0.02);
      if (gazeVar < 0.035) {
        flags.add('suspicious:perfect_gaze_stability');
      }
      if (gazeVar > 0.90) {
        flags.add('suspicious:gaze_chaotic');
      }
    }
    if (_blinkIntervalsMs.length >= 3 &&
        _normalizedVariance(_blinkIntervalsMs, scale: 3500.0) < 0.05) {
      flags.add('suspicious:repeated_blink_pattern');
    }
    if ((_fraudScore * 100.0) >= 75.0) {
      flags.add('fraud:high_fraud_score');
    }
    if (frame.nativeFraudFlags) {
      flags.add('fraud:native_signal');
    }
    if (_confidenceScore < 0.6) {
      flags.add('reject:low_confidence');
    }
    if (_rollingAttention < 0.5) {
      flags.add('reject:low_attention');
    }

    if (flags.any((f) => f.startsWith('fraud:'))) {
      return ('fail_fraud_detected', flags);
    }
    if (_confidenceScore < 0.6) {
      return ('reject_low_confidence', flags);
    }
    if (_rollingAttention < 0.5) {
      return ('reject_low_attention', flags);
    }
    return ('ok', flags);
  }

  int _noFaceSwitchCount() {
    if (_frames.length < 2) return 0;
    var switches = 0;
    for (var i = 1; i < _frames.length; i++) {
      final prev = _frames[i - 1].hasFace;
      final curr = _frames[i].hasFace;
      if (prev != curr) switches++;
    }
    return switches;
  }

  bool _isSessionValid(List<String> flags) {
    final hasFraud = flags.any((f) => f.startsWith('fraud:'));
    final hardFail = flags.any((f) => f.startsWith('hard_fail:'));
    final suspiciousCombo = flags.contains('suspicious:perfect_gaze_stability') &&
        flags.contains('suspicious:repeated_blink_pattern');
    if (hardFail || hasFraud) return false;
    if (suspiciousCombo) return false;
    return _rollingAttention >= validAttentionThreshold &&
        _confidenceScore >= confidenceThreshold &&
        _fraudScore < fraudThreshold &&
        _focusTimeMs() >= requiredFocusMs &&
        _state != AttentionRuntimeState.noFace;
  }

  AttentionRuntimeState _deriveState(AttentionSignalFrame frame) {
    if (!frame.hasFace || _facePresenceScore() < 0.2) {
      return AttentionRuntimeState.noFace;
    }
    if (_fraudScore >= fraudThreshold) {
      return AttentionRuntimeState.fraudSuspect;
    }
    if (_rollingAttention >= 0.85 && _confidenceScore >= 0.65) {
      return AttentionRuntimeState.highFocus;
    }
    if (_rollingAttention < 0.55) {
      return AttentionRuntimeState.lowAttention;
    }
    return AttentionRuntimeState.active;
  }

  double _normalizedVariance(List<double> values, {required double scale}) {
    if (values.length < 2) return 0.0;
    final mean = values.reduce((a, b) => a + b) / values.length;
    var variance = 0.0;
    for (final v in values) {
      final d = v - mean;
      variance += d * d;
    }
    variance /= values.length;
    return (variance / scale).clamp(0.0, 1.0);
  }

  double _blinkRatePerMinute() {
    if (_frames.length < 2) return 0.0;
    final first = _frames.first.timestampMs;
    final last = _frames.last.timestampMs;
    final windowMs = (last - first).clamp(1, rollingWindowMs);
    final blinkCount = _blinkIntervalsMs.length;
    if (blinkCount == 0) return 0.0;
    return (blinkCount * 60000.0) / windowMs;
  }

  double _blinkValidityScore() {
    final rate = _blinkRatePerMinute();
    if (_frames.length < 20) return 0.5;
    if (rate <= 0.01) return 0.0;
    if (rate >= 10.0 && rate <= 25.0) return 1.0;
    if (rate > 25.0) {
      return (1.0 - ((rate - 25.0) / 40.0)).clamp(0.0, 1.0);
    }
    return (rate / 10.0).clamp(0.0, 1.0);
  }

  double _continuityFactor() {
    if (_frames.length < 2) return 0.0;
    final first = _frames.first.timestampMs;
    final last = _frames.last.timestampMs;
    final duration = (last - first).clamp(1, rollingWindowMs);
    final focusRatio = (_focusTimeMs() / duration).clamp(0.0, 1.0);
    final noFacePenalty = (_faceMissingMs / faceMissingFailMs).clamp(0.0, 1.0);
    final offScreenPenalty = (_gazeOffScreenMs / gazeOffScreenFailMs).clamp(0.0, 1.0);
    return (focusRatio * (1.0 - noFacePenalty) * (1.0 - offScreenPenalty))
        .clamp(0.0, 1.0);
  }

  void _updateFailDurations(AttentionSignalFrame frame, int dtMs) {
    if (frame.hasFace) {
      _faceMissingMs = 0;
    } else {
      _faceMissingMs += dtMs;
    }

    final gazeOnScreen = frame.gaze != null && contentBounds.contains(frame.gaze!);
    if (gazeOnScreen) {
      _gazeOffScreenMs = 0;
    } else if (frame.hasFace) {
      _gazeOffScreenMs += dtMs;
    }
  }
}
