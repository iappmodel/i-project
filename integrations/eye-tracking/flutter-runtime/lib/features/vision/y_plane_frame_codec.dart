import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';

import 'frame_codec.dart';
import 'runtime_transport_config.dart';
import 'y_plane_buffer_pool.dart';

final YPlaneBufferPool _yPlanePool = YPlaneBufferPool();

/// Map payload for `vision_channel` `processFrame` when experimental transport is on.
///
/// Keys: `format` (`y8` | `jpeg`), dimensions, strides, optional `rotationDegrees`,
/// and `bytes` (Y-plane or JPEG).
typedef VisionChannelPayload = Map<String, Object>;

/// Builds the channel argument for one [CameraImage].
///
/// YUV420 → `format: y8` (no JPEG). BGRA / unknown → `format: jpeg` (baseline encode).
VisionChannelPayload cameraImageToVisionChannelPayload(
  CameraImage image, {
  int? rotationDegrees,
}) {
  switch (image.format.group) {
    case ImageFormatGroup.yuv420:
      final packed = yuv420Y8PlaneForVision(
        image,
        maxEdge: kExperimentalYPlaneMaxEdge,
      );
      return _y8Payload(
        width: packed.$1,
        height: packed.$2,
        rowStride: packed.$3,
        pixelStride: packed.$4,
        bytes: packed.$5,
        rotationDegrees: rotationDegrees,
      );
    case ImageFormatGroup.bgra8888:
    default:
      return _jpegPayload(
        bytes: cameraImageToJpegBytes(image),
        rotationDegrees: rotationDegrees,
      );
  }
}

VisionChannelPayload _y8Payload({
  required int width,
  required int height,
  required int rowStride,
  required int pixelStride,
  required Uint8List bytes,
  int? rotationDegrees,
}) {
  final map = <String, Object>{
    'format': 'y8',
    'width': width,
    'height': height,
    'rowStride': rowStride,
    'pixelStride': pixelStride,
    'bytes': bytes,
  };
  if (rotationDegrees != null) {
    map['rotationDegrees'] = rotationDegrees;
  }
  return map;
}

VisionChannelPayload _jpegPayload({
  required Uint8List bytes,
  int? rotationDegrees,
}) {
  final map = <String, Object>{
    'format': 'jpeg',
    'bytes': bytes,
  };
  if (rotationDegrees != null) {
    map['rotationDegrees'] = rotationDegrees;
  }
  return map;
}

/// Extracts (or downscales) the Y/luminance plane for native `y8` decode.
///
/// Returns `(outWidth, outHeight, rowStride, pixelStride, packedBytes)`.
/// Packed buffer is dense (`rowStride == outWidth`, `pixelStride == 1`).
(int, int, int, int, Uint8List) yuv420Y8PlaneForVision(
  CameraImage image, {
  required int maxEdge,
}) {
  final yPlane = image.planes[0];
  final w = image.width;
  final h = image.height;
  final row = yPlane.bytesPerRow;
  final pixelStride = yPlane.bytesPerPixel ?? 1;
  final outW = w <= maxEdge && h <= maxEdge
      ? w
      : (w >= h ? maxEdge : (maxEdge * w / h).round());
  final outH = w <= maxEdge && h <= maxEdge
      ? h
      : (h >= w ? maxEdge : (maxEdge * h / w).round());
  final out = _yPlanePool.acquire(outW * outH);
  if (w <= maxEdge && h <= maxEdge) {
    if (row == w) {
      out.setRange(0, w * h, yPlane.bytes, 0);
    } else {
      for (var y = 0; y < h; y++) {
        out.setRange(y * w, y * w + w, yPlane.bytes, y * row);
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
      out[oi++] = yPlane.bytes[ySrc * row + xSrc * pixelStride];
    }
  }
  return (outW, outH, outW, 1, out);
}

/// True when experimental Y-plane transport should run for this platform.
bool shouldUseExperimentalYPlaneTransport() =>
    useExperimentalYPlaneTransport &&
    defaultTargetPlatform == TargetPlatform.android;
