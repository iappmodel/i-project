import 'package:flutter/material.dart';

/// Faint screen-space grid for alignment / debug overlays.
class ScreenGridPainter extends CustomPainter {
  final int divisions;
  final Color color;
  final bool highlightCenter;

  ScreenGridPainter({
    this.divisions = 6,
    this.color = const Color(0x55BBBBBB),
    this.highlightCenter = true,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (divisions <= 1) return;

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    final centerPaint = Paint()
      ..color = color.withValues(alpha: 0.9)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    for (var i = 1; i < divisions; i++) {
      final dx = size.width * i / divisions;
      final dy = size.height * i / divisions;

      final isCenter = highlightCenter && i == divisions ~/ 2;

      canvas.drawLine(
        Offset(dx, 0),
        Offset(dx, size.height),
        isCenter ? centerPaint : paint,
      );

      canvas.drawLine(
        Offset(0, dy),
        Offset(size.width, dy),
        isCenter ? centerPaint : paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant ScreenGridPainter old) {
    return old.divisions != divisions ||
        old.color != color ||
        old.highlightCenter != highlightCenter;
  }
}
