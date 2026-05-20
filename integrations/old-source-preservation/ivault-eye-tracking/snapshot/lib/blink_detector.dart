import 'dart:math' as math;

import 'ear_calibration.dart';

/// Phase of the mean EAR signal while detecting a blink.
///
/// [EyeState.opening] is used for optional partial reopen (between [minThreshold]
/// and [openThreshold]) before a full open completes the blink.
enum EyeState {
  open,
  closing,
  closed,
  opening,
}

/// Blink detection from Eye Aspect Ratio (EAR).
///
/// Uses a small state machine on the **mean** signal (raw or normalized) inspired
/// by hysteresis: [closeThreshold] → [closing], [minThreshold] → [closed],
/// [openThreshold] → reopen; a **real** blink increments [blinkCount] only if
/// closure duration is in \([minBlinkDurationMs], [maxBlinkDurationMs])\).
///
/// **Dynamic raw mean** when [rawMeanBaseline] is set with per-eye baselines: uses raw
/// `(left+right)/2` vs [rawMeanEarDynamicThresholds] (`close ≈ baseline×0.7`, …).
///
/// **Normalized mode** when per-eye baselines exist but [rawMeanBaseline] is omitted:
/// averaged ratios vs [NORMALIZED_MEAN_CLOSED_THRESHOLD].
///
/// **Dominance** (when [leftOpenBaseline] / [rightOpenBaseline] are set): tracks raw
/// minimum EAR per eye from first [closing] through [closed]; on a registered blink,
/// compares drops vs open baselines (same as before).
final class BlinkDetector {
  // ignore: constant_identifier_names
  static const double EAR_CLOSED_THRESHOLD = 0.08;

  /// Raw mean below this (but still [EyeState.closing]) counts as [EyeState.closed].
  /// Must be `<` [EAR_CLOSED_THRESHOLD] so a dip like `0.07 → 0.06 → 0.05` can reach [closed].
  // ignore: constant_identifier_names
  static const double rawMinThreshold = 0.069;

  /// Recover above this while [EyeState.closing] → [EyeState.open] (noise cancel).
  // ignore: constant_identifier_names
  static const double rawOpenThreshold = 0.12;

  // ignore: constant_identifier_names
  static const double NORMALIZED_MEAN_CLOSED_THRESHOLD = 0.42;

  /// Normalized mean below this counts as fully [EyeState.closed].
  // ignore: constant_identifier_names
  static const double normMinThreshold = 0.30;

  /// Normalized mean above this reopens (hysteresis).
  // ignore: constant_identifier_names
  static const double normOpenThreshold = 0.52;

  // ignore: constant_identifier_names
  static const double EAR_THRESHOLD = EAR_CLOSED_THRESHOLD;

  // ignore: constant_identifier_names
  static const int minBlinkDurationMs = 80;

  // ignore: constant_identifier_names
  static const int maxBlinkDurationMs = 400;

  // ignore: constant_identifier_names
  static const int BLINK_COOLDOWN_MS = 250;

  /// While [EyeState.open] and [signal] is still at or above [closeTh], ignore a frame if mean
  /// EAR **drops** by less than this vs the last processed sample (noise). Sub-threshold steps
  /// are never skipped so `0.08 → 0.079` can still enter [closing]. Rises and non-[open] states
  /// are unaffected.
  // ignore: constant_identifier_names
  static const double meanEarOpenNoiseIgnoreDrop = 0.02;

  EyeState state = EyeState.open;
  int blinkStart = 0;

  /// Last mean EAR ([signal]) after a frame that ran the FSM; used for open-state derivative gate.
  double? _prevMeanEar;

  bool isBlinking = false;
  int blinkCount = 0;

  int? _lastBlinkCountMs;

  double? _minLeftDuringBlink;
  double? _minRightDuringBlink;

  bool? lastBlinkIsRightDominant;
  double? lastBlinkLeftDrop;
  double? lastBlinkRightDrop;

  void _resetEpisodeMins() {
    _minLeftDuringBlink = null;
    _minRightDuringBlink = null;
  }

  void _noteEyeMins(double leftEar, double rightEar) {
    final mL = _minLeftDuringBlink;
    final mR = _minRightDuringBlink;
    _minLeftDuringBlink =
        mL == null ? leftEar : math.min(mL, leftEar);
    _minRightDuringBlink =
        mR == null ? rightEar : math.min(mR, rightEar);
  }

  void _clearDominance() {
    lastBlinkLeftDrop = null;
    lastBlinkRightDrop = null;
    lastBlinkIsRightDominant = null;
  }

  void _setDominanceForCompletedBlink({
    double? leftOpenBaseline,
    double? rightOpenBaseline,
  }) {
    final minL = _minLeftDuringBlink;
    final minR = _minRightDuringBlink;
    if (minL != null &&
        minR != null &&
        leftOpenBaseline != null &&
        rightOpenBaseline != null &&
        leftOpenBaseline > 1e-9 &&
        rightOpenBaseline > 1e-9) {
      final leftDrop = leftOpenBaseline - minL;
      final rightDrop = rightOpenBaseline - minR;
      lastBlinkLeftDrop = leftDrop;
      lastBlinkRightDrop = rightDrop;
      lastBlinkIsRightDominant = rightDrop > leftDrop;
    } else {
      _clearDominance();
    }
  }

  void _incrementBlinkIfCooldownAllows(int clockMs) {
    final lastMs = _lastBlinkCountMs ?? 0;
    if (clockMs - lastMs > BLINK_COOLDOWN_MS) {
      blinkCount += 1;
      _lastBlinkCountMs = clockMs;
    }
  }

  void _completeReopenFromClosedOrOpening({
    required int clockMs,
    double? leftOpenBaseline,
    double? rightOpenBaseline,
  }) {
    final duration = clockMs - blinkStart;
    if (duration > minBlinkDurationMs && duration < maxBlinkDurationMs) {
      _setDominanceForCompletedBlink(
        leftOpenBaseline: leftOpenBaseline,
        rightOpenBaseline: rightOpenBaseline,
      );
      _incrementBlinkIfCooldownAllows(clockMs);
    } else {
      _clearDominance();
    }
    state = EyeState.open;
    _resetEpisodeMins();
  }

  /// One frame: updates [state], [isBlinking], and optionally [blinkCount].
  ///
  /// [signal] is raw or normalized **mean** EAR; [leftEar] / [rightEar] are raw for
  /// dominance. If either raw EAR is null or non-finite, state is unchanged.
  Map<String, Object?> updateEar(
    double? leftEar,
    double? rightEar, {
    double? leftOpenBaseline,
    double? rightOpenBaseline,
    /// Mean `(leftOpen+rightOpen)/2` for [rawMeanEarDynamicThresholds]; raw path only (ignored in normalized mode).
    double? rawMeanBaseline,
    int? clockMs,
  }) {
    if (leftEar == null ||
        rightEar == null ||
        !leftEar.isFinite ||
        !rightEar.isFinite) {
      return _snapshot();
    }

    final int ts = clockMs ?? DateTime.now().millisecondsSinceEpoch;

    final double signal;
    final double closeTh;
    final double minTh;
    final double openTh;
    final useDynamicRaw = rawMeanBaseline != null &&
        rawMeanBaseline > 1e-9 &&
        leftOpenBaseline != null &&
        rightOpenBaseline != null &&
        leftOpenBaseline > 1e-9 &&
        rightOpenBaseline > 1e-9;
    if (useDynamicRaw) {
      signal = (leftEar + rightEar) / 2.0;
      final t = rawMeanEarDynamicThresholds(rawMeanBaseline);
      closeTh = t.closeTh;
      minTh = t.minTh;
      openTh = t.openTh;
    } else if (leftOpenBaseline != null &&
        rightOpenBaseline != null &&
        leftOpenBaseline > 1e-9 &&
        rightOpenBaseline > 1e-9) {
      final leftNorm = leftEar / leftOpenBaseline;
      final rightNorm = rightEar / rightOpenBaseline;
      signal = (leftNorm + rightNorm) / 2.0;
      closeTh = NORMALIZED_MEAN_CLOSED_THRESHOLD;
      minTh = normMinThreshold;
      openTh = normOpenThreshold;
    } else {
      signal = (leftEar + rightEar) / 2.0;
      closeTh = EAR_CLOSED_THRESHOLD;
      minTh = rawMinThreshold;
      openTh = rawOpenThreshold;
    }

    if (state == EyeState.open &&
        _prevMeanEar != null &&
        signal >= closeTh) {
      final drop = _prevMeanEar! - signal;
      if (drop > 0 && drop < meanEarOpenNoiseIgnoreDrop) {
        return _snapshot();
      }
    }

    switch (state) {
      case EyeState.open:
        if (signal < closeTh) {
          state = EyeState.closing;
          blinkStart = ts;
          _minLeftDuringBlink = leftEar;
          _minRightDuringBlink = rightEar;
        }
        break;

      case EyeState.closing:
        if (signal < minTh) {
          state = EyeState.closed;
          _noteEyeMins(leftEar, rightEar);
        } else if (signal > openTh) {
          state = EyeState.open;
          _resetEpisodeMins();
        } else {
          _noteEyeMins(leftEar, rightEar);
        }
        break;

      case EyeState.closed:
        if (signal > openTh) {
          _completeReopenFromClosedOrOpening(
            clockMs: ts,
            leftOpenBaseline: leftOpenBaseline,
            rightOpenBaseline: rightOpenBaseline,
          );
        } else if (signal > minTh) {
          state = EyeState.opening;
          _noteEyeMins(leftEar, rightEar);
        } else {
          _noteEyeMins(leftEar, rightEar);
        }
        break;

      case EyeState.opening:
        if (signal > openTh) {
          _completeReopenFromClosedOrOpening(
            clockMs: ts,
            leftOpenBaseline: leftOpenBaseline,
            rightOpenBaseline: rightOpenBaseline,
          );
        } else if (signal < closeTh) {
          state = EyeState.closing;
          blinkStart = ts;
        } else {
          _noteEyeMins(leftEar, rightEar);
        }
        break;
    }

    isBlinking = state == EyeState.closing || state == EyeState.closed;
    _prevMeanEar = signal;
    return _snapshot();
  }

  Map<String, Object?> _snapshot() => {
        'isBlinking': isBlinking,
        'blinkCount': blinkCount,
        'isRightDominant': lastBlinkIsRightDominant,
        'leftDrop': lastBlinkLeftDrop,
        'rightDrop': lastBlinkRightDrop,
      };

  void reset() {
    state = EyeState.open;
    blinkStart = 0;
    isBlinking = false;
    blinkCount = 0;
    _lastBlinkCountMs = null;
    _prevMeanEar = null;
    _resetEpisodeMins();
    _clearDominance();
  }
}
