import 'dart:ui';

class PointerController {
  Offset _current = Offset.zero;
  Offset _velocity = Offset.zero;

  // tuning parameters
  final double smoothing = 0.2;
  final double friction = 0.85;
  final double maxSpeed = 50.0;

  Offset update(Offset target, double stability) {
    // stability gating (IMPORTANT)
    if (stability < 0.2) {
      return _current;
    }

    final delta = target - _current;

    // apply smoothing
    final smoothed = delta * smoothing;

    // velocity update
    _velocity = (_velocity + smoothed) * friction;

    // clamp speed
    if (_velocity.distance > maxSpeed) {
      _velocity = (_velocity / _velocity.distance) * maxSpeed;
    }

    _current += _velocity;

    return _current;
  }

  Offset get position => _current;

  void reset() {
    _current = Offset.zero;
    _velocity = Offset.zero;
  }

  // ACTIONS

  bool clickReady = true;

  void click() {
    if (!clickReady) return;

    clickReady = false;

    // TODO: integrate tap event
  }

  void releaseClick() {
    clickReady = true;
  }

  void dwellAction() {
    // TODO: hold / drag / long press
  }
}
