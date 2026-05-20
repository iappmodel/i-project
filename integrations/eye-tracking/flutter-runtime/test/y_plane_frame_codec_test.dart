import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/features/vision/runtime_transport_config.dart';
import 'package:eye_tracking_app/features/vision/y_plane_frame_codec.dart';

void main() {
  group('runtime transport config', () {
    test('useExperimentalYPlaneTransport defaults false', () {
      expect(useExperimentalYPlaneTransport, isFalse);
    });

    test('kExperimentalYPlaneMaxEdge is 512', () {
      expect(kExperimentalYPlaneMaxEdge, 512);
    });
  });

  group('yuv420Y8PlaneForVision — dense pack', () {
    test('copies full Y plane when within maxEdge', () {
      const w = 4;
      const h = 3;
      const row = 4;
      final yPlane = Uint8List.fromList([
        10, 11, 12, 13,
        20, 21, 22, 23,
        30, 31, 32, 33,
      ]);
      final packed = packY8FromRawPlane(
        width: w,
        height: h,
        rowStride: row,
        pixelStride: 1,
        yPlaneBytes: yPlane,
        maxEdge: 512,
      );
      expect(packed.$1, w);
      expect(packed.$2, h);
      expect(packed.$3, w);
      expect(packed.$4, 1);
      expect(packed.$5, equals(yPlane.sublist(0, w * h)));
    });

    test('downscales when wider than maxEdge', () {
      const w = 8;
      const h = 4;
      final yPlane = Uint8List(w * h);
      for (var i = 0; i < yPlane.length; i++) {
        yPlane[i] = i % 256;
      }
      final packed = packY8FromRawPlane(
        width: w,
        height: h,
        rowStride: w,
        pixelStride: 1,
        yPlaneBytes: yPlane,
        maxEdge: 4,
      );
      expect(packed.$1, 4);
      expect(packed.$2, 2);
      expect(packed.$5.length, 8);
    });
  });
}

/// Test helper mirroring [yuv420Y8PlaneForVision] without [CameraImage].
(int, int, int, int, Uint8List) packY8FromRawPlane({
  required int width,
  required int height,
  required int rowStride,
  required int pixelStride,
  required Uint8List yPlaneBytes,
  required int maxEdge,
}) {
  final w = width;
  final h = height;
  final row = rowStride;
  final outW = w <= maxEdge && h <= maxEdge
      ? w
      : (w >= h ? maxEdge : (maxEdge * w / h).round());
  final outH = w <= maxEdge && h <= maxEdge
      ? h
      : (h >= w ? maxEdge : (maxEdge * h / w).round());
  final out = Uint8List(outW * outH);
  if (w <= maxEdge && h <= maxEdge) {
    if (row == w) {
      out.setRange(0, w * h, yPlaneBytes, 0);
    } else {
      for (var y = 0; y < h; y++) {
        out.setRange(y * w, y * w + w, yPlaneBytes, y * row);
      }
    }
    return (outW, outH, outW, 1, out);
  }
  final sx = w / outW;
  final sy = h / outH;
  var oi = 0;
  for (var oy = 0; oy < outH; oy++) {
    final ySrc = ((oy + 0.5) * sy).floor().clamp(0, h - 1);
    for (var ox = 0; ox < outW; ox++) {
      final xSrc = ((ox + 0.5) * sx).floor().clamp(0, w - 1);
      out[oi++] = yPlaneBytes[ySrc * row + xSrc * pixelStride];
    }
  }
  return (outW, outH, outW, 1, out);
}
