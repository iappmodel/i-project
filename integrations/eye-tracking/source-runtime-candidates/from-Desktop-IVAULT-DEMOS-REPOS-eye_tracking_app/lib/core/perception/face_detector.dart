import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

class FaceDetectorService {
  final detector = FaceDetector(
    options: FaceDetectorOptions(
      enableLandmarks: true,
      enableClassification: true,
      performanceMode: FaceDetectorMode.fast,
    ),
  );

  Future<Face?> detect(InputImage image) async {
    final faces = await detector.processImage(image);
    if (faces.isEmpty) return null;
    return faces.first;
  }
}

