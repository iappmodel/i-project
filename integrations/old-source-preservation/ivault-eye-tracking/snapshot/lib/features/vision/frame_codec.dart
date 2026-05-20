import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:image/image.dart' as img;

/// Wider edge cap for frames sent to Android vision (MediaPipe). Landmarks are
/// normalized; smaller bitmaps cut Dart encode, channel transfer, and native work.
const int kVisionPipelineMaxEdge = 512;

/// JPEG bytes for Android `vision_channel` / BitmapFactory.decodeByteArray.
Uint8List cameraImageToJpegBytes(CameraImage image) {
  final img.Image bitmap;
  switch (image.format.group) {
    case ImageFormatGroup.bgra8888:
      bitmap = _bgraCameraImageToImage(image, maxEdge: kVisionPipelineMaxEdge);
      break;
    case ImageFormatGroup.yuv420:
    default:
      bitmap = _yuv420LumaGrayscaleImage(
        image,
        maxEdge: kVisionPipelineMaxEdge,
      );
      break;
  }
  return Uint8List.fromList(img.encodeJpg(bitmap, quality: 75));
}

/// Argument map for `vision_channel` `processFrame`: `y8` on YUV420 (no JPEG),
/// `jpeg` on BGRA8888 (encode path unchanged).
Map<String, Object> cameraImageToVisionChannelPayload(CameraImage image) {
  switch (image.format.group) {
    case ImageFormatGroup.yuv420:
      final packed = _yuv420Y8PlaneForVision(
        image,
        maxEdge: kVisionPipelineMaxEdge,
      );
      return {
        'format': 'y8',
        'width': packed.$1,
        'height': packed.$2,
        'rowStride': packed.$1,
        'bytes': packed.$3,
      };
    case ImageFormatGroup.bgra8888:
    default:
      return {
        'format': 'jpeg',
        'bytes': cameraImageToJpegBytes(image),
      };
  }
}

/// Y-plane bytes for vision (same footprint as [_yuv420LumaGrayscaleImage]).
(int outW, int outH, Uint8List bytes) _yuv420Y8PlaneForVision(
  CameraImage image, {
  required int maxEdge,
}) {
  final yPlane = image.planes[0];
  final w = image.width;
  final h = image.height;
  final row = yPlane.bytesPerRow;
  final outW = w <= maxEdge && h <= maxEdge
      ? w
      : (w >= h ? maxEdge : (maxEdge * w / h).round());
  final outH = w <= maxEdge && h <= maxEdge
      ? h
      : (h >= w ? maxEdge : (maxEdge * h / w).round());
  final out = Uint8List(outW * outH);
  if (w <= maxEdge && h <= maxEdge) {
    if (row == w) {
      out.setRange(0, w * h, yPlane.bytes, 0);
    } else {
      for (var y = 0; y < h; y++) {
        out.setRange(y * w, y * w + w, yPlane.bytes, y * row);
      }
    }
    return (outW, outH, out);
  }
  final sx = w / outW;
  final sy = h / outH;
  var oi = 0;
  for (var oy = 0; oy < outH; oy++) {
    final ySrc = ((oy + 0.5) * sy).floor().clamp(0, h - 1);
    for (var ox = 0; ox < outW; ox++) {
      final xSrc = ((ox + 0.5) * sx).floor().clamp(0, w - 1);
      out[oi++] = yPlane.bytes[ySrc * row + xSrc];
    }
  }
  return (outW, outH, out);
}

img.Image _bgraCameraImageToImage(CameraImage image, {required int maxEdge}) {
  final plane = image.planes[0];
  final w = image.width;
  final h = image.height;
  final rowStride = plane.bytesPerRow;
  if (w <= maxEdge && h <= maxEdge) {
    final out = img.Image(width: w, height: h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        final i = y * rowStride + x * 4;
        final b = plane.bytes[i];
        final g = plane.bytes[i + 1];
        final r = plane.bytes[i + 2];
        out.setPixelRgb(x, y, r, g, b);
      }
    }
    return out;
  }
  final outW = w >= h ? maxEdge : (maxEdge * w / h).round();
  final outH = h >= w ? maxEdge : (maxEdge * h / w).round();
  final sx = w / outW;
  final sy = h / outH;
  final out = img.Image(width: outW, height: outH);
  for (var oy = 0; oy < outH; oy++) {
    final ySrc = ((oy + 0.5) * sy).floor().clamp(0, h - 1);
    for (var ox = 0; ox < outW; ox++) {
      final xSrc = ((ox + 0.5) * sx).floor().clamp(0, w - 1);
      final i = ySrc * rowStride + xSrc * 4;
      final b = plane.bytes[i];
      final g = plane.bytes[i + 1];
      final r = plane.bytes[i + 2];
      out.setPixelRgb(ox, oy, r, g, b);
    }
  }
  return out;
}

/// Y-plane-only grayscale (nearest-neighbor downscale when wider than [maxEdge]).
img.Image _yuv420LumaGrayscaleImage(CameraImage image, {required int maxEdge}) {
  final yPlane = image.planes[0];
  final w = image.width;
  final h = image.height;
  final row = yPlane.bytesPerRow;
  if (w <= maxEdge && h <= maxEdge) {
    final out = img.Image(width: w, height: h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        final v = yPlane.bytes[y * row + x];
        out.setPixelRgb(x, y, v, v, v);
      }
    }
    return out;
  }
  final outW = w >= h ? maxEdge : (maxEdge * w / h).round();
  final outH = h >= w ? maxEdge : (maxEdge * h / w).round();
  final sx = w / outW;
  final sy = h / outH;
  final out = img.Image(width: outW, height: outH);
  for (var oy = 0; oy < outH; oy++) {
    final ySrc = ((oy + 0.5) * sy).floor().clamp(0, h - 1);
    for (var ox = 0; ox < outW; ox++) {
      final xSrc = ((ox + 0.5) * sx).floor().clamp(0, w - 1);
      final v = yPlane.bytes[ySrc * row + xSrc];
      out.setPixelRgb(ox, oy, v, v, v);
    }
  }
  return out;
}
