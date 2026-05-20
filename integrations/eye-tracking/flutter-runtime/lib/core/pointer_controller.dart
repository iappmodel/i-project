import 'package:flutter/services.dart';

/// Maps smoothed gaze to a screen pointer with [stability]-scaled motion (0 = no follow).
final class PointerController {
  PointerController({
    this.baselineX = 0.09,
    this.baselineY = 0.0,
  });

  double baselineX;
  double baselineY;

  static const double _kMinStepNorm = 0.02;
  static const double _kAdaptiveStepRange = 0.05;

  Offset _pointerNorm = const Offset(0.5, 0.5);
  Size? _layoutSize;

  void setLayoutSize(Size? size) => _layoutSize = size;

  Offset _gazeToNormalized(double gazeX, double gazeY) {
    final amplifiedX = (gazeX - baselineX) * 10.0;
    final amplifiedY = (gazeY - baselineY) * 10.0;
    final nx = (0.5 + amplifiedX).clamp(0.0, 1.0);
    final ny = (0.5 + amplifiedY).clamp(0.0, 1.0);
    return Offset(nx, ny);
  }

  double adaptiveStep(double confidence) {
    final c = confidence.clamp(0.0, 1.0).toDouble();
    return (_kMinStepNorm + c * _kAdaptiveStepRange).clamp(
      _kMinStepNorm,
      _kMinStepNorm + _kAdaptiveStepRange,
    );
  }

  /// [stability] in \[0,1\] scales capped step toward [smooth] gaze; 0 forces no motion.
  Offset? update(Offset smooth, double stability) {
    final size = _layoutSize;
    if (size == null) return null;
    final s = stability.clamp(0.0, 1.0);
    final target = _gazeToNormalized(smooth.dx, smooth.dy);
    final maxStep = adaptiveStep(s);
    final dx = (target.dx - _pointerNorm.dx).clamp(-maxStep, maxStep);
    final dy = (target.dy - _pointerNorm.dy).clamp(-maxStep, maxStep);
    _pointerNorm = Offset(_pointerNorm.dx + dx, _pointerNorm.dy + dy);
    return Offset(
      size.width * _pointerNorm.dx,
      size.height * _pointerNorm.dy,
    );
  }

  void reset() {
    _pointerNorm = const Offset(0.5, 0.5);
  }

  /// Synthetic pointer activation at the current smoothed position (haptic only for now).
  void click() {
    HapticFeedback.lightImpact();
  }

  Offset? centerPixels() {
    final size = _layoutSize;
    if (size == null) return null;
    return Offset(size.width * 0.5, size.height * 0.5);
  }
}
