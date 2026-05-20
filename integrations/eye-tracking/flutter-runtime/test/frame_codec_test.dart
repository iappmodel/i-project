import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;

import 'package:eye_tracking_app/features/vision/frame_codec.dart';

// NOTE: cameraImageToJpegBytes is not directly tested here because
// CameraImage requires the camera platform plugin and cannot be instantiated
// in pure unit tests without a mock framework (mockito / mocktail is not in
// this project's dev_dependencies).  The call path
//   cameraImageToJpegBytes → _bgraCameraImageToImage / _yuv420LumaGrayscaleImage → encodeImageToJpeg
// is tested indirectly below by verifying the public encodeImageToJpeg helper
// that receives the already-decoded img.Image.  The format-dispatch logic
// (_bgraCameraImageToImage / _yuv420LumaGrayscaleImage) is private and
// covered by integration / device tests.

void main() {
  group('FrameCodec — constants', () {
    test('kFrameJpegQuality is 75 (native bridge contract)', () {
      // This value is read by BitmapFactory.decodeByteArray on Android.
      // Changing it requires a coordinated native update.
      expect(kFrameJpegQuality, 75);
    });
  });

  group('FrameCodec — encodeImageToJpeg', () {
    test('returns a Uint8List', () {
      final bitmap = img.Image(width: 2, height: 2);
      final result = encodeImageToJpeg(bitmap);
      expect(result, isA<Uint8List>());
    });

    test('output is non-empty', () {
      final bitmap = img.Image(width: 1, height: 1);
      final result = encodeImageToJpeg(bitmap);
      expect(result.length, greaterThan(0));
    });

    test('output starts with JPEG magic bytes 0xFF 0xD8', () {
      final bitmap = img.Image(width: 4, height: 4);
      final result = encodeImageToJpeg(bitmap);
      expect(result[0], 0xFF);
      expect(result[1], 0xD8);
    });

    test('output ends with JPEG end-of-image marker 0xFF 0xD9', () {
      final bitmap = img.Image(width: 4, height: 4);
      final result = encodeImageToJpeg(bitmap);
      final n = result.length;
      expect(result[n - 2], 0xFF);
      expect(result[n - 1], 0xD9);
    });

    test('encodes a solid-colour image without throwing', () {
      final bitmap = img.Image(width: 8, height: 8);
      for (var y = 0; y < 8; y++) {
        for (var x = 0; x < 8; x++) {
          bitmap.setPixelRgb(x, y, 200, 100, 50);
        }
      }
      expect(() => encodeImageToJpeg(bitmap), returnsNormally);
    });

    test('encodes a gradient image to a plausible byte count', () {
      final bitmap = img.Image(width: 16, height: 16);
      for (var y = 0; y < 16; y++) {
        for (var x = 0; x < 16; x++) {
          bitmap.setPixelRgb(x, y, x * 16, y * 16, 127);
        }
      }
      final result = encodeImageToJpeg(bitmap);
      // A real 16×16 JPEG is always well over 100 bytes.
      expect(result.length, greaterThan(100));
    });

    test('two identical bitmaps produce identical JPEG bytes', () {
      img.Image make() {
        final b = img.Image(width: 4, height: 4);
        for (var y = 0; y < 4; y++) {
          for (var x = 0; x < 4; x++) {
            b.setPixelRgb(x, y, x * 60, y * 60, 30);
          }
        }
        return b;
      }

      final a = encodeImageToJpeg(make());
      final b = encodeImageToJpeg(make());
      expect(a, equals(b));
    });
  });
}
