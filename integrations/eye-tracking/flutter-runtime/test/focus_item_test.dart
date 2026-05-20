import 'dart:ui' show Offset, Rect;

import 'package:eye_tracking_app/focus_item.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('combinedFocusScore', () {
    test('matches 0.7 / 0.3 blend', () {
      expect(combinedFocusScore(1.0, 0.0), closeTo(0.7, 1e-9));
      expect(combinedFocusScore(0.0, 1.0), closeTo(0.3, 1e-9));
      expect(combinedFocusScore(1.0, 1.0), closeTo(1.0, 1e-9));
      expect(combinedFocusScore(0.5, 0.5), closeTo(0.5, 1e-9));
    });

    test('clamps inputs to 0–1', () {
      expect(combinedFocusScore(2.0, -1.0), closeTo(0.7 * 1.0 + 0.3 * 0.0, 1e-9));
    });
  });

  group('getFocusedItem', () {
    test('without dwell picks closest center', () {
      final a = FocusItem(id: 'a', bounds: const Rect.fromLTWH(0, 0, 10, 10));
      final b = FocusItem(id: 'b', bounds: const Rect.fromLTWH(100, 0, 10, 10));
      const cursor = Offset(5, 5);
      expect(getFocusedItem([a, b], cursor), a);
      expect(getFocusedItem([b, a], cursor), a);
    });

    test('with dwell can override when proximity is almost tied', () {
      // B is slightly closer to cursor → higher raw proximity; A wins only with dwell bonus.
      final a = FocusItem(
        id: 'a',
        bounds: Rect.fromCenter(center: const Offset(-0.15, 0), width: 1, height: 1),
      );
      final b = FocusItem(
        id: 'b',
        bounds: Rect.fromCenter(center: Offset.zero, width: 1, height: 1),
      );
      const cursor = Offset(1, 0);
      expect(getFocusedItem([a, b], cursor), b);
      final picked = getFocusedItem(
        [a, b],
        cursor,
        dwellFractionById: {'a': 1.0, 'b': 0.0},
      );
      expect(picked, a);
    });
  });

  group('lerpCursorTowardItem', () {
    test('default t moves 20% toward bounds center', () {
      final item = FocusItem(id: 'a', bounds: const Rect.fromLTWH(0, 0, 10, 10));
      const cursor = Offset.zero;
      final next = lerpCursorTowardItem(cursor, item);
      expect(next, const Offset(1, 1));
    });

    test('respects explicit t', () {
      final item = FocusItem(
        id: 'b',
        bounds: const Rect.fromLTWH(10, 20, 10, 10),
      );
      const cursor = Offset(10, 10);
      final next = lerpCursorTowardItem(cursor, item, 0.5);
      expect(next.dx, closeTo(12.5, 1e-9));
      expect(next.dy, closeTo(17.5, 1e-9));
    });
  });
}
