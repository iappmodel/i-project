import 'dart:convert';

import '../gaze_normalize.dart';

/// Local-only adaptive calibration profile (MVP scaffold).
///
/// Observe-only: not wired into zone math or verification yet.
/// See docs/technical/ADAPTIVE_CALIBRATION_SYSTEM.md.
final class GazeThresholds {
  const GazeThresholds({
    this.leftBound,
    this.centerNeutral,
    this.rightBound,
    this.deadband = 0.10,
  });

  /// Raw pipeline gazeX at user's comfortable look-left extreme.
  final double? leftBound;

  /// Raw pipeline gazeX at neutral center.
  final double? centerNeutral;

  /// Raw pipeline gazeX at user's comfortable look-right extreme.
  final double? rightBound;

  /// Half-width of center band in raw gazeX units ([getZone] deadband).
  final double deadband;

  GazeThresholds copyWith({
    double? leftBound,
    double? centerNeutral,
    double? rightBound,
    double? deadband,
  }) {
    return GazeThresholds(
      leftBound: leftBound ?? this.leftBound,
      centerNeutral: centerNeutral ?? this.centerNeutral,
      rightBound: rightBound ?? this.rightBound,
      deadband: deadband ?? this.deadband,
    );
  }

  Map<String, dynamic> toJson() => {
        'leftBound': leftBound,
        'centerNeutral': centerNeutral,
        'rightBound': rightBound,
        'deadband': deadband,
      };

  factory GazeThresholds.fromJson(Map<String, dynamic> json) {
    return GazeThresholds(
      leftBound: (json['leftBound'] as num?)?.toDouble(),
      centerNeutral: (json['centerNeutral'] as num?)?.toDouble(),
      rightBound: (json['rightBound'] as num?)?.toDouble(),
      deadband: (json['deadband'] as num?)?.toDouble() ?? 0.10,
    );
  }
}

/// Open-eye EAR baselines and blink hysteresis fractions.
final class EarBaseline {
  const EarBaseline({
    this.leftOpen,
    this.rightOpen,
    this.closeFraction = 0.7,
    this.openFraction = 0.9,
  });

  final double? leftOpen;
  final double? rightOpen;
  final double closeFraction;
  final double openFraction;

  double? get meanOpen {
    if (leftOpen == null || rightOpen == null) return null;
    return (leftOpen! + rightOpen!) / 2;
  }

  EarBaseline copyWith({
    double? leftOpen,
    double? rightOpen,
    double? closeFraction,
    double? openFraction,
  }) {
    return EarBaseline(
      leftOpen: leftOpen ?? this.leftOpen,
      rightOpen: rightOpen ?? this.rightOpen,
      closeFraction: closeFraction ?? this.closeFraction,
      openFraction: openFraction ?? this.openFraction,
    );
  }

  Map<String, dynamic> toJson() => {
        'leftOpen': leftOpen,
        'rightOpen': rightOpen,
        'closeFraction': closeFraction,
        'openFraction': openFraction,
      };

  factory EarBaseline.fromJson(Map<String, dynamic> json) {
    return EarBaseline(
      leftOpen: (json['leftOpen'] as num?)?.toDouble(),
      rightOpen: (json['rightOpen'] as num?)?.toDouble(),
      closeFraction: (json['closeFraction'] as num?)?.toDouble() ?? 0.7,
      openFraction: (json['openFraction'] as num?)?.toDouble() ?? 0.9,
    );
  }
}

/// Per-domain and overall calibration readiness \([0, 1]\).
final class CalibrationConfidence {
  const CalibrationConfidence({
    this.gazeLeftRight = 0,
    this.neutralGaze = 0,
    this.earOpen = 0,
    this.blinkClose = 0,
    this.headPose = 0,
  });

  final double gazeLeftRight;
  final double neutralGaze;
  final double earOpen;
  final double blinkClose;
  final double headPose;

  /// Weighted composite for verification gating (future).
  double get overall {
    const wGaze = 0.35;
    const wNeutral = 0.20;
    const wEar = 0.25;
    const wBlink = 0.10;
    const wHead = 0.10;
    final v = gazeLeftRight * wGaze +
        neutralGaze * wNeutral +
        earOpen * wEar +
        blinkClose * wBlink +
        headPose * wHead;
    return v.clamp(0.0, 1.0);
  }

  CalibrationConfidence copyWith({
    double? gazeLeftRight,
    double? neutralGaze,
    double? earOpen,
    double? blinkClose,
    double? headPose,
  }) {
    return CalibrationConfidence(
      gazeLeftRight: gazeLeftRight ?? this.gazeLeftRight,
      neutralGaze: neutralGaze ?? this.neutralGaze,
      earOpen: earOpen ?? this.earOpen,
      blinkClose: blinkClose ?? this.blinkClose,
      headPose: headPose ?? this.headPose,
    );
  }

  Map<String, dynamic> toJson() => {
        'gazeLeftRight': gazeLeftRight,
        'neutralGaze': neutralGaze,
        'earOpen': earOpen,
        'blinkClose': blinkClose,
        'headPose': headPose,
        'overall': overall,
      };

  factory CalibrationConfidence.fromJson(Map<String, dynamic> json) {
    return CalibrationConfidence(
      gazeLeftRight: (json['gazeLeftRight'] as num?)?.toDouble() ?? 0,
      neutralGaze: (json['neutralGaze'] as num?)?.toDouble() ?? 0,
      earOpen: (json['earOpen'] as num?)?.toDouble() ?? 0,
      blinkClose: (json['blinkClose'] as num?)?.toDouble() ?? 0,
      headPose: (json['headPose'] as num?)?.toDouble() ?? 0,
    );
  }
}

/// Rolling session + long-term calibration state (local JSON, no video).
final class AdaptiveCalibrationProfile {
  AdaptiveCalibrationProfile({
    GazeThresholds? sessionGaze,
    GazeThresholds? longTermGaze,
    EarBaseline? sessionEar,
    EarBaseline? longTermEar,
    CalibrationConfidence? confidence,
    this.neutralHeadYaw,
    this.driftCorrectionX = 0,
    this.sessionSampleCount = 0,
    this.labeledZoneSelectCount = 0,
    this.registeredBlinkCount = 0,
    this.schemaVersion = 1,
    this.updatedAtMs,
  })  : sessionGaze = sessionGaze ?? const GazeThresholds(),
        longTermGaze = longTermGaze ?? const GazeThresholds(),
        sessionEar = sessionEar ?? const EarBaseline(),
        longTermEar = longTermEar ?? const EarBaseline(),
        confidence = confidence ?? const CalibrationConfidence();

  static const int schemaVersionCurrent = 1;

  final int schemaVersion;
  final GazeThresholds sessionGaze;
  final GazeThresholds longTermGaze;
  final EarBaseline sessionEar;
  final EarBaseline longTermEar;
  final CalibrationConfidence confidence;
  final double? neutralHeadYaw;
  final double driftCorrectionX;
  final int sessionSampleCount;
  final int labeledZoneSelectCount;
  final int registeredBlinkCount;
  final int? updatedAtMs;

  /// Population priors when user data is sparse (matches [gaze_normalize.dart]).
  GazeThresholds get effectiveGaze {
    final session = sessionGaze;
    final long = longTermGaze;
    return GazeThresholds(
      leftBound: session.leftBound ??
          long.leftBound ??
          populationGazeXLeft,
      centerNeutral: session.centerNeutral ?? long.centerNeutral,
      rightBound: session.rightBound ??
          long.rightBound ??
          populationGazeXRight,
      deadband: session.deadband,
    );
  }

  /// Observe one frame — stub; increments counters only. No threshold mutation yet.
  AdaptiveCalibrationProfile observeFrame({
    required double? gazeX,
    required double? leftEar,
    required double? rightEar,
    required double? headYawRaw,
    required bool headStable,
    required bool isBlinking,
    required bool likelyFake,
    required int timestampMs,
  }) {
    if (likelyFake || gazeX == null) return this;
    return copyWith(
      sessionSampleCount: sessionSampleCount + 1,
      updatedAtMs: timestampMs,
    );
  }

  /// Observe confirmed zone selection — stub for passive L/R learning.
  AdaptiveCalibrationProfile observeZoneSelection({
    required String zone,
    required double gazeX,
    required int timestampMs,
  }) {
    return copyWith(
      labeledZoneSelectCount: labeledZoneSelectCount + 1,
      updatedAtMs: timestampMs,
    );
  }

  /// Observe completed blink — stub for closure-depth learning.
  AdaptiveCalibrationProfile observeBlink({
    required double? meanEarAtClose,
    required int timestampMs,
  }) {
    if (meanEarAtClose == null) return this;
    return copyWith(
      registeredBlinkCount: registeredBlinkCount + 1,
      updatedAtMs: timestampMs,
    );
  }

  /// Recompute confidence from counters — placeholder heuristic until device tuning.
  AdaptiveCalibrationProfile recomputeConfidence() {
    final gazeLr = (labeledZoneSelectCount >= 3 ? 0.5 : 0.0) +
        (sessionGaze.leftBound != null && sessionGaze.rightBound != null
            ? 0.5
            : 0.0);
    final neutral = (sessionSampleCount >= 30 ? 1.0 : sessionSampleCount / 30.0)
        .clamp(0.0, 1.0);
    final ear = sessionEar.meanOpen != null ? 0.8 : 0.0;
    final blink =
        (registeredBlinkCount / 5.0).clamp(0.0, 1.0);
    final head = neutralHeadYaw != null ? 0.7 : 0.0;
    return copyWith(
      confidence: CalibrationConfidence(
        gazeLeftRight: gazeLr.clamp(0.0, 1.0),
        neutralGaze: neutral,
        earOpen: ear,
        blinkClose: blink,
        headPose: head,
      ),
    );
  }

  /// Clear session + long-term state (user reset).
  AdaptiveCalibrationProfile reset() {
    return AdaptiveCalibrationProfile(updatedAtMs: DateTime.now().millisecondsSinceEpoch);
  }

  AdaptiveCalibrationProfile copyWith({
    GazeThresholds? sessionGaze,
    GazeThresholds? longTermGaze,
    EarBaseline? sessionEar,
    EarBaseline? longTermEar,
    CalibrationConfidence? confidence,
    double? neutralHeadYaw,
    double? driftCorrectionX,
    int? sessionSampleCount,
    int? labeledZoneSelectCount,
    int? registeredBlinkCount,
    int? updatedAtMs,
  }) {
    return AdaptiveCalibrationProfile(
      sessionGaze: sessionGaze ?? this.sessionGaze,
      longTermGaze: longTermGaze ?? this.longTermGaze,
      sessionEar: sessionEar ?? this.sessionEar,
      longTermEar: longTermEar ?? this.longTermEar,
      confidence: confidence ?? this.confidence,
      neutralHeadYaw: neutralHeadYaw ?? this.neutralHeadYaw,
      driftCorrectionX: driftCorrectionX ?? this.driftCorrectionX,
      sessionSampleCount: sessionSampleCount ?? this.sessionSampleCount,
      labeledZoneSelectCount:
          labeledZoneSelectCount ?? this.labeledZoneSelectCount,
      registeredBlinkCount: registeredBlinkCount ?? this.registeredBlinkCount,
      schemaVersion: schemaVersion,
      updatedAtMs: updatedAtMs ?? this.updatedAtMs,
    );
  }

  Map<String, dynamic> toJson() => {
        'schemaVersion': schemaVersion,
        'sessionGaze': sessionGaze.toJson(),
        'longTermGaze': longTermGaze.toJson(),
        'sessionEar': sessionEar.toJson(),
        'longTermEar': longTermEar.toJson(),
        'confidence': confidence.toJson(),
        'neutralHeadYaw': neutralHeadYaw,
        'driftCorrectionX': driftCorrectionX,
        'sessionSampleCount': sessionSampleCount,
        'labeledZoneSelectCount': labeledZoneSelectCount,
        'registeredBlinkCount': registeredBlinkCount,
        'updatedAtMs': updatedAtMs,
      };

  factory AdaptiveCalibrationProfile.fromJson(Map<String, dynamic> json) {
    return AdaptiveCalibrationProfile(
      schemaVersion: json['schemaVersion'] as int? ?? 1,
      sessionGaze: GazeThresholds.fromJson(
        Map<String, dynamic>.from(json['sessionGaze'] as Map? ?? {}),
      ),
      longTermGaze: GazeThresholds.fromJson(
        Map<String, dynamic>.from(json['longTermGaze'] as Map? ?? {}),
      ),
      sessionEar: EarBaseline.fromJson(
        Map<String, dynamic>.from(json['sessionEar'] as Map? ?? {}),
      ),
      longTermEar: EarBaseline.fromJson(
        Map<String, dynamic>.from(json['longTermEar'] as Map? ?? {}),
      ),
      confidence: CalibrationConfidence.fromJson(
        Map<String, dynamic>.from(json['confidence'] as Map? ?? {}),
      ),
      neutralHeadYaw: (json['neutralHeadYaw'] as num?)?.toDouble(),
      driftCorrectionX: (json['driftCorrectionX'] as num?)?.toDouble() ?? 0,
      sessionSampleCount: json['sessionSampleCount'] as int? ?? 0,
      labeledZoneSelectCount: json['labeledZoneSelectCount'] as int? ?? 0,
      registeredBlinkCount: json['registeredBlinkCount'] as int? ?? 0,
      updatedAtMs: json['updatedAtMs'] as int?,
    );
  }

  String toJsonString() => jsonEncode(toJson());

  factory AdaptiveCalibrationProfile.fromJsonString(String source) {
    return AdaptiveCalibrationProfile.fromJson(
      Map<String, dynamic>.from(jsonDecode(source) as Map),
    );
  }
}
