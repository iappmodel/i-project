import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:image/image.dart' as img;

/// JPEG quality sent to Android [BitmapFactory.decodeByteArray] via `vision_channel`.
///
/// Must remain 75. Changing this value requires a coordinated native update and
/// an explicit authorization issue — see governance.md §2.
const int kFrameJpegQuality = 75;

/// Encodes a [CameraImage] to JPEG bytes for the Android `vision_channel` bridge.
///
/// Supports [ImageFormatGroup.bgra8888] and [ImageFormatGroup.yuv420]
/// (yuv420 is also the default/fallback for unknown formats).
/// Behavior is identical to the original top-level function in `lib/main.dart`.
Uint8List cameraImageToJpegBytes(CameraImage image) {
  final img.Image bitmap;
  switch (image.format.group) {
    case ImageFormatGroup.bgra8888:
      bitmap = _bgraCameraImageToImage(image);
      break;
    case ImageFormatGroup.yuv420:
    default:
      bitmap = _yuv420LumaGrayscaleImage(image);
      break;
  }
  return encodeImageToJpeg(bitmap);
}

/// Encodes an [img.Image] bitmap to JPEG bytes at [kFrameJpegQuality].
///
/// Extracted from [cameraImageToJpegBytes] for testability.
/// The encoding step does not depend on the camera plugin and can be unit-tested
/// with plain [img.Image] objects.
Uint8List encodeImageToJpeg(img.Image bitmap) {
  return Uint8List.fromList(img.encodeJpg(bitmap, quality: kFrameJpegQuality));
}

/// Converts a BGRA8888 [CameraImage] to an [img.Image].
///
/// Reads plane[0] with its reported [bytesPerRow] stride so that non-contiguous
/// rows (common on iOS) are handled correctly.
img.Image _bgraCameraImageToImage(CameraImage image) {
  final plane = image.planes[0];
  final w = image.width;
  final h = image.height;
  final rowStride = plane.bytesPerRow;
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

/// Simple Y-plane–only grayscale (full resolution, respects row stride).
///
/// Converts a YUV420 [CameraImage] to a grayscale [img.Image] using only the
/// luma plane. Chroma planes are discarded; this is sufficient for MediaPipe
/// face landmark processing on Android.
img.Image _yuv420LumaGrayscaleImage(CameraImage image) {
  final yPlane = image.planes[0];
  final w = image.width;
  final h = image.height;
  final out = img.Image(width: w, height: h);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      final v = yPlane.bytes[y * yPlane.bytesPerRow + x];
      out.setPixelRgb(x, y, v, v, v);
    }
  }
  return out;
}
