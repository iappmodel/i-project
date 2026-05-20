import 'dart:typed_data';
import 'dart:ui';

import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

import 'camera_service.dart';
import 'face_detector.dart';
import 'frame_throttle.dart';

class FrameProcessor {
  final FaceDetectorService faceDetector;

  FrameProcessor(this.faceDetector);

  Future<void> process(CameraImage image) async {
    final inputImage = _convert(image);

    final face = await faceDetector.detect(inputImage);

    final faceDetected = face != null;

    final quality = _estimateQuality(face);

    // SEND INTO CORE PIPELINE
    // pipeline.processFrame(...)
    if (faceDetected && quality >= 0) {
      // Placeholder branch to keep interim values used.
    }
  }

  InputImage _convert(CameraImage image) {
    final builder = BytesBuilder(copy: false);
    for (final plane in image.planes) {
      builder.add(plane.bytes);
    }
    final bytes = builder.takeBytes();

    final metadata = InputImageMetadata(
      size: Size(image.width.toDouble(), image.height.toDouble()),
      rotation: InputImageRotation.rotation0deg,
      format: _inputImageFormat(image),
      bytesPerRow: image.planes.first.bytesPerRow,
    );

    return InputImage.fromBytes(bytes: bytes, metadata: metadata);
  }

  static InputImageFormat _inputImageFormat(CameraImage image) {
    switch (image.format.group) {
      case ImageFormatGroup.nv21:
        return InputImageFormat.nv21;
      case ImageFormatGroup.yuv420:
        return InputImageFormat.yuv_420_888;
      case ImageFormatGroup.bgra8888:
        return InputImageFormat.bgra8888;
      case ImageFormatGroup.jpeg:
      case ImageFormatGroup.unknown:
        return InputImageFormat.nv21;
    }
  }

  double _estimateQuality(Face? face) {
    if (face == null) return 0.0;
    return 0.7; // placeholder, upgrade later
  }
}

class PerceptionRunner {
  PerceptionRunner({required this.faceDetector});

  final FaceDetectorService faceDetector;

  late CameraService camera;
  late FrameProcessor processor;

  Future<void> start() async {
    camera = CameraService();
    await camera.init();

    processor = FrameProcessor(faceDetector);
    final throttle = FrameThrottle();

    camera.controller!.startImageStream((image) async {
      final ts = DateTime.now().millisecondsSinceEpoch;
      if (!throttle.shouldProcess(ts)) return;
      try {
        await processor.process(image);
      } finally {
        throttle.release();
      }
    });
  }
}
