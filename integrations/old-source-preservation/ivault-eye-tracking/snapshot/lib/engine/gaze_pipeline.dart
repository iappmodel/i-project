import '../gaze_buffer.dart';
import '../gaze_dead_zone.dart';
import '../gaze_filter_stack.dart';
import '../gaze_quality.dart';
import '../head_confidence.dart' show kHeadPoseLimit;

final class GazePipelineOutput {
  const GazePipelineOutput._({
    required this.valid,
    this.x,
    this.y,
    this.quality,
    this.varX,
    this.varY,
  });

  const GazePipelineOutput.valid({
    required double x,
    required double y,
    required double quality,
    required double varX,
    required double varY,
  }) : this._(
          valid: true,
          x: x,
          y: y,
          quality: quality,
          varX: varX,
          varY: varY,
        );

  const GazePipelineOutput.invalid()
      : this._(
          valid: false,
          x: null,
          y: null,
          quality: null,
          varX: null,
          varY: null,
        );

  final bool valid;
  final double? x;
  final double? y;
  final double? quality;
  final double? varX;
  final double? varY;
}

class GazePipeline {
  final GazeBuffer buffer = GazeBuffer();
  final GazeFilterStack filter = GazeFilterStack();
  final GazeQuality quality = GazeQuality();
  final GazeBuffer _temporalBuffer = GazeBuffer(maxSize: 5);

  /// Same scale as native [headYaw] / [headPitch] (inter-eye normalized). Beyond this,
  /// gaze input is held at [lastX] / [lastY] (no hard drop).
  static const double kHeadGazeMaxAbs = kHeadPoseLimit;

  double lastX = 0;
  double lastY = 0;
  int lastValid = 0;
  int _lastSampleTimeMs = 0;
  double _preBlinkX = 0;
  double _preBlinkY = 0;
  double _velocityPrevX = 0;
  double _velocityPrevY = 0;
  bool _hasVelocitySeed = false;

  static const double _velocityLimitPerMs = 0.0025;
  static const double _interEyeScaleX = 1.0;
  static const double _interEyeScaleY = 1.0;
  static const double _outputClampAbs = 1.0;

  static bool _headPoseOk(double? yaw, double? pitch) {
    if (yaw == null || pitch == null || !yaw.isFinite || !pitch.isFinite) {
      return true;
    }
    return yaw.abs() < kHeadGazeMaxAbs && pitch.abs() < kHeadGazeMaxAbs;
  }

  /// [x] and [y] must be **finite** raw gaze values in the filter’s coordinate space
  /// (e.g. normalized horizontal gaze and vertical component). Hold timing for invalid
  /// samples is handled by the caller; when [valid] is false, this returns `valid: false`
  /// without applying an internal hold.
  ///
  /// When [valid] is true but [headYaw]/[headPitch] exceed [kHeadGazeMaxAbs], input gaze
  /// is replaced with [lastX]/[lastY] and those stored values are not overwritten.
  ///
  /// On success returns a valid [GazePipelineOutput] with `x`, `y`, `quality`, `varX`, `varY`.
  /// On invalid input returns [GazePipelineOutput.invalid] — fixation is updated by caller
  /// using [buffer] and variances.
  GazePipelineOutput update({
    required double x,
    required double y,
    required bool valid,
    required int now,
    bool blink = false,
    double? headYaw,
    double? headPitch,
    /// When set, overrides [GazeFilter] default alpha (e.g. [smoothingAlphaFromConfidence]).
    double? filterAlpha,
  }) {
    quality.add(valid);

    var xIn = x;
    var yIn = y;

    if (!valid) return const GazePipelineOutput.invalid();

    lastValid = now;
    final normalized = _normalizeInterEye(xIn, yIn);
    var stagedX = normalized.$1;
    var stagedY = normalized.$2;

    final headOk = _headPoseOk(headYaw, headPitch);
    final headCompensated = _compensateHead(stagedX, stagedY, headOk);
    stagedX = headCompensated.$1;
    stagedY = headCompensated.$2;

    stagedX = applyDeadZone(stagedX, kGazeDeadZoneThreshold);
    stagedY = applyDeadZone(stagedY, kGazeDeadZoneThreshold);

    final velocityFiltered = _velocityFilter(stagedX, stagedY, now);
    stagedX = velocityFiltered.$1;
    stagedY = velocityFiltered.$2;

    if (!blink) {
      _preBlinkX = stagedX;
      _preBlinkY = stagedY;
    } else {
      stagedX = _preBlinkX;
      stagedY = _preBlinkY;
    }

    final ema = filter.update(stagedX, stagedY, alpha: filterAlpha);
    final temporal = _temporalSmooth(ema.$1, ema.$2, now);
    final clamped = _clampOutput(temporal.$1, temporal.$2);
    final sx = clamped.$1;
    final sy = clamped.$2;

    buffer.add(sx, sy, now);

    final varX = filter.varianceX();
    final varY = filter.varianceY();

    return GazePipelineOutput.valid(
      x: sx,
      y: sy,
      quality: quality.ratio,
      varX: varX,
      varY: varY,
    );
  }

  /// Filter variance on X (same as latest [update] `varX`); lower is steadier.
  double varianceX() => filter.varianceX();

  void reset() {
    filter.reset();
    buffer.clear();
    _temporalBuffer.clear();
    quality.reset();
    lastX = 0;
    lastY = 0;
    lastValid = 0;
    _lastSampleTimeMs = 0;
    _preBlinkX = 0;
    _preBlinkY = 0;
    _velocityPrevX = 0;
    _velocityPrevY = 0;
    _hasVelocitySeed = false;
  }

  (double, double) _normalizeInterEye(double x, double y) =>
      (x * _interEyeScaleX, y * _interEyeScaleY);

  (double, double) _compensateHead(double x, double y, bool headOk) {
    if (headOk) {
      lastX = x;
      lastY = y;
      return (x, y);
    }
    return (lastX, lastY);
  }

  (double, double) _velocityFilter(double x, double y, int now) {
    if (_lastSampleTimeMs == 0 || !_hasVelocitySeed) {
      _lastSampleTimeMs = now;
      _velocityPrevX = x;
      _velocityPrevY = y;
      _hasVelocitySeed = true;
      return (x, y);
    }
    final dtMs = (now - _lastSampleTimeMs).clamp(1, 1000);
    _lastSampleTimeMs = now;
    final maxStep = dtMs * _velocityLimitPerMs;
    final nextX = _velocityPrevX + (x - _velocityPrevX).clamp(-maxStep, maxStep);
    final nextY = _velocityPrevY + (y - _velocityPrevY).clamp(-maxStep, maxStep);
    _velocityPrevX = nextX.toDouble();
    _velocityPrevY = nextY.toDouble();
    return (nextX.toDouble(), nextY.toDouble());
  }

  (double, double) _temporalSmooth(double x, double y, int now) {
    _temporalBuffer.add(x, y, now);
    final samples = _temporalBuffer.samples;
    if (samples.isEmpty) return (x, y);
    var sumX = 0.0;
    var sumY = 0.0;
    for (final s in samples) {
      sumX += s.x;
      sumY += s.y;
    }
    return (sumX / samples.length, sumY / samples.length);
  }

  (double, double) _clampOutput(double x, double y) => (
        x.clamp(-_outputClampAbs, _outputClampAbs).toDouble(),
        y.clamp(-_outputClampAbs, _outputClampAbs).toDouble(),
      );
}
