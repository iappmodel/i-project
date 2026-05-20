import '../vision/vision_frame.dart';

/// Outcome of [resolveHeldFace]: which [face] to use and whether [main] must
/// refresh [_lastFaceSeenMs], [_faceLocked], [_lastHeldFace] (matches prior
/// inline branch when `fresh != null && fresh.landmarks.isNotEmpty`).
final class HeldFacePolicyResult {
  const HeldFacePolicyResult({
    required this.face,
    required this.refreshHoldState,
    this.holdAnchorMs,
  });

  /// Frame to feed the rest of the pipeline; `null` triggers hard-loss handling.
  final VisionFrame? face;

  /// When true, caller must assign `_lastFaceSeenMs = holdAnchorMs!`,
  /// `_faceLocked = true`, `_lastHeldFace = face` (face is non-null fresh).
  final bool refreshHoldState;

  /// Wall-clock ms to store as last face seen; only when [refreshHoldState].
  final int? holdAnchorMs;
}

/// Pure held-face continuity: live landmarks win; else reuse [lastHeldFace]
/// within [faceHoldMs] of [lastFaceSeenMs]; else null.
///
/// Mirrors prior `main.dart` logic:
/// - `rawHasFace` iff `fresh != null && fresh.landmarks.isNotEmpty`
/// - hold iff `lastHeldFace != null && (nowMs - lastFaceSeenMs) < faceHoldMs`
HeldFacePolicyResult resolveHeldFace({
  required VisionFrame? fresh,
  required int nowMs,
  required int lastFaceSeenMs,
  required VisionFrame? lastHeldFace,
  required int faceHoldMs,
}) {
  final rawHasFace = fresh != null && fresh.landmarks.isNotEmpty;
  if (rawHasFace) {
    return HeldFacePolicyResult(
      face: fresh,
      refreshHoldState: true,
      holdAnchorMs: nowMs,
    );
  }
  if (lastHeldFace != null && (nowMs - lastFaceSeenMs) < faceHoldMs) {
    return HeldFacePolicyResult(
      face: lastHeldFace,
      refreshHoldState: false,
      holdAnchorMs: null,
    );
  }
  return const HeldFacePolicyResult(
    face: null,
    refreshHoldState: false,
    holdAnchorMs: null,
  );
}
