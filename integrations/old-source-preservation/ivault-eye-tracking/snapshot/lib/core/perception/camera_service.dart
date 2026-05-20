import 'package:camera/camera.dart';

class CameraService {
  CameraController? controller;
  bool isInitialized = false;

  Future<void> init() async {
    final cameras = await availableCameras();
    final front = cameras.first;

    controller = CameraController(
      front,
      ResolutionPreset.medium,
      enableAudio: false,
    );

    await controller!.initialize();
    isInitialized = true;
  }

  Stream<CameraImage> startStream() async* {
    if (!isInitialized) return;

    controller!.startImageStream((image) {
      // frame emitted
    });
  }

  void dispose() {
    controller?.dispose();
  }
}

