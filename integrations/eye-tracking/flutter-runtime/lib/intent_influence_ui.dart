import 'dart:ui' show Offset, Size;

/// Maps intent influence **weight** (0–1) to presentation only — not selection or dwell logic.
///
/// Use with [IntentInfluence.weight] (or any 0–1 signal) to adjust hit targets, emphasis, and
/// optional cursor pull. Callers pass results into widgets such as [GazeZoneButtons.zoneOffsets]
/// / [GazeZoneButtons.zoneOpacity].

/// Expands an interactive target by up to 30% at full weight.
double expandHitbox(double baseSize, double weight) {
  return baseSize * (1 + weight * 0.3);
}

/// Opacity in \[0.5, 1.0\] from full transparent-mid to full emphasis at weight 1.
double opacityFromWeight(double weight) {
  return 0.5 + weight * 0.5;
}

/// Subtle pull toward [target]: at weight 1 moves 10% of the gap — never a full snap.
Offset applyMagnetism(
  Offset pointer,
  Offset target,
  double weight,
) {
  final dx = target.dx - pointer.dx;
  final dy = target.dy - pointer.dy;

  return Offset(
    pointer.dx + dx * weight * 0.1,
    pointer.dy + dy * weight * 0.1,
  );
}

/// Pixel centers for `LEFT` / `CENTER` / `RIGHT` in the top gaze strip (thirds of width),
/// aligned with compact [GazeZoneButtons] (`top` padding + [rowHeight] / 2 below [safeTop]).
Map<String, Offset> gazeZoneStripCenters(
  Size viewSize,
  double safeTop, {
  bool compact = true,
  double topPadding = 4,
}) {
  final rowH = compact ? 120.0 : 200.0;
  final y = safeTop + topPadding + rowH / 2;
  final w = viewSize.width;
  return <String, Offset>{
    'LEFT': Offset(w / 6, y),
    'CENTER': Offset(w / 2, y),
    'RIGHT': Offset(5 * w / 6, y),
  };
}
