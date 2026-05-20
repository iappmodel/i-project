import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/features/gaze/held_face_policy.dart';
import 'package:eye_tracking_app/features/vision/vision_frame.dart';

const int _kHoldMs = 500;

VisionFrame _frame({List<dynamic> landmarks = const [0]}) {
  return VisionFrame(
    leftEar: null,
    rightEar: null,
    gazeX: 0.1,
    gazeY: 0.2,
    headYawRaw: null,
    headYaw: null,
    headPitch: null,
    headStable: null,
    landmarks: landmarks,
    leftEye: const [],
    rightEye: const [],
    hasFace: landmarks.isNotEmpty,
    attentionScore: 0,
    likelyFake: false,
    fakeStaticGaze: false,
    fakePerfectStability: false,
    fakeNoBlink: false,
    faceConfidence: 1.0,
  );
}

void main() {
  group('resolveHeldFace', () {
    test('fresh frame with landmarks uses fresh and requests hold refresh', () {
      final fresh = _frame(landmarks: const [1, 2]);
      final r = resolveHeldFace(
        fresh: fresh,
        nowMs: 10_000,
        lastFaceSeenMs: 0,
        lastHeldFace: null,
        faceHoldMs: _kHoldMs,
      );
      expect(r.face, same(fresh));
      expect(r.refreshHoldState, true);
      expect(r.holdAnchorMs, 10_000);
    });

    test('fresh null + valid hold window reuses last held', () {
      final held = _frame(landmarks: const [9]);
      final r = resolveHeldFace(
        fresh: null,
        nowMs: 1000,
        lastFaceSeenMs: 600,
        lastHeldFace: held,
        faceHoldMs: _kHoldMs,
      );
      expect(r.face, same(held));
      expect(r.refreshHoldState, false);
      expect(r.holdAnchorMs, isNull);
    });

    test('fresh empty landmarks + valid hold window reuses last held', () {
      final emptyFresh = _frame(landmarks: const []);
      final held = _frame(landmarks: const [9]);
      final r = resolveHeldFace(
        fresh: emptyFresh,
        nowMs: 1000,
        lastFaceSeenMs: 600,
        lastHeldFace: held,
        faceHoldMs: _kHoldMs,
      );
      expect(r.face, same(held));
      expect(r.refreshHoldState, false);
    });

    test('expired hold returns null face', () {
      final held = _frame();
      final r = resolveHeldFace(
        fresh: null,
        nowMs: 2000,
        lastFaceSeenMs: 1000,
        lastHeldFace: held,
        faceHoldMs: _kHoldMs,
      );
      expect(r.face, isNull);
      expect(r.refreshHoldState, false);
    });

    test('boundary: elapsed == faceHoldMs does not reuse', () {
      final held = _frame();
      final r = resolveHeldFace(
        fresh: null,
        nowMs: 1500,
        lastFaceSeenMs: 1000,
        lastHeldFace: held,
        faceHoldMs: _kHoldMs,
      );
      expect(r.face, isNull);
    });

    test('boundary: elapsed == faceHoldMs - 1 reuses', () {
      final held = _frame();
      final r = resolveHeldFace(
        fresh: null,
        nowMs: 1499,
        lastFaceSeenMs: 1000,
        lastHeldFace: held,
        faceHoldMs: _kHoldMs,
      );
      expect(r.face, same(held));
    });

    test('no fresh and no held returns null', () {
      final r = resolveHeldFace(
        fresh: null,
        nowMs: 5000,
        lastFaceSeenMs: 0,
        lastHeldFace: null,
        faceHoldMs: _kHoldMs,
      );
      expect(r.face, isNull);
      expect(r.refreshHoldState, false);
    });
  });
}
