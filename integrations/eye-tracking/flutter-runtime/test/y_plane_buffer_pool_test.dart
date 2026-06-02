import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/features/vision/y_plane_buffer_pool.dart';

void main() {
  test('YPlaneBufferPool reuses backing store across acquire calls', () {
    final pool = YPlaneBufferPool();
    final a = pool.acquire(100);
    a[0] = 42;
    final b = pool.acquire(100);
    expect(b[0], 42);
    final larger = pool.acquire(200);
    expect(larger.length, 200);
    larger[0] = 99;
    expect(pool.acquire(200)[0], 99);
  });

  test('YPlaneBufferPool clear drops cache', () {
    final pool = YPlaneBufferPool();
    pool.acquire(50);
    pool.clear();
    final b = pool.acquire(50);
    expect(b.length, 50);
  });
}
