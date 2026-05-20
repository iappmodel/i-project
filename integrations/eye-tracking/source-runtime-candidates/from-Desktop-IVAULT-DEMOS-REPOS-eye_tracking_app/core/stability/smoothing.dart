import 'dart:ui';

class Smoothing {
  Offset? _last;

  Offset apply(Offset current, double alpha) {
    if (_last == null) {
      _last = current;
      return current;
    }

    final smoothed = Offset(
      _last!.dx + alpha * (current.dx - _last!.dx),
      _last!.dy + alpha * (current.dy - _last!.dy),
    );

    _last = smoothed;
    return smoothed;
  }
}
