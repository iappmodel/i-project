import 'dart:ui' show Offset, Rect;

/// A region that can accumulate a focus score; selection uses [getFocusedItem] by proximity to center.
class FocusItem {
  FocusItem({
    required this.id,
    required this.bounds,
    this.focusScore = 0,
  });

  final String id;
  final Rect bounds;
  double focusScore;

  @override
  bool operator ==(Object other) => other is FocusItem && other.id == id;

  @override
  int get hashCode => id.hashCode;
}

/// [Transform.scale] factor for the widget whose [FocusItem.id] matches [FocusLockState.currentItem].
const double focusItemHighlightScale = 1.1;

/// [Opacity] for that highlighted widget (slightly soft so it reads as emphasis, not a bug).
const double focusItemHighlightOpacity = 0.9;

/// When true, draw a soft glow (e.g. [BoxShadow] blur) around the focused target.
const bool focusItemHighlightGlow = true;

/// When true, use the “active” border treatment (e.g. [Border.all] with [ColorScheme.primary] or `width: 2`).
const bool focusItemHighlightActiveBorder = true;

/// One half-cycle of the [FocusPulse] scale animation (full in+out = 2× this).
const Duration focusItemPulsePeriod = Duration(milliseconds: 1500);

const double focusItemPulseScaleMin = 1;
const double focusItemPulseScaleMax = 1.06;

/// Used when [FocusPulse.pulseOpacity] is true.
const double focusItemPulseOpacityMin = 0.88;
const double focusItemPulseOpacityMax = 1;

/// Hysteresis for [getFocusedItem]: same candidate raises [lockStrength], another lowers it; commit when above [focusLockCommitThreshold].
const double focusLockSameStep = 0.1;
const double focusLockOtherStep = 0.2;
const double focusLockCommitThreshold = 0.5;

/// Upper bound for [FocusLockState.progressRing] (dwell / “click by looking” completion).
const double focusDwellRingMax = 1;

/// Holds [currentItem] and [lockStrength]; call [apply] each frame with the raw best candidate.
class FocusLockState {
  FocusItem? currentItem;
  double lockStrength = 0;

  /// Fills with elapsed time while [newItem] matches [currentItem]; resets when the candidate changes. Clamp 0…[focusDwellRingMax].
  double progressRing = 0;

  /// [newItem] is typically from [getFocusedItem]. Uses [FocusItem.id] for equality.
  ///
  /// Pass [deltaTime] as the frame step in seconds (e.g. `elapsed.inMicroseconds / 1e6`) so [progressRing] advances with `progressRing += time`.
  void apply(FocusItem? newItem, {double deltaTime = 0}) {
    if (currentItem == null && newItem != null) {
      currentItem = newItem;
      lockStrength = 1;
      progressRing = 0;
      return;
    }

    if (newItem == currentItem) {
      lockStrength += focusLockSameStep;
      progressRing += deltaTime;
    } else {
      lockStrength -= focusLockOtherStep;
      progressRing = 0;
    }
    lockStrength = lockStrength.clamp(0, 1);
    progressRing = progressRing.clamp(0, focusDwellRingMax);

    if (lockStrength > focusLockCommitThreshold) {
      currentItem = newItem;
    }
  }
}

/// Default blend for [lerpCursorTowardItem] (`cursor = lerp(cursor, item.center, t)`).
const double focusCursorLerpBlend = 0.2;

/// Smooths [cursor] toward [item.bounds.center]: `lerp(cursor, item.center, t)`.
///
/// Uses [Offset.lerp]; [t] is clamped to \[0, 1\]. Typical per-frame call with
/// `t == [focusCursorLerpBlend]` pulls the cursor 20% toward the target each step.
Offset lerpCursorTowardItem(Offset cursor, FocusItem item, [double t = focusCursorLerpBlend]) {
  return Offset.lerp(cursor, item.bounds.center, t.clamp(0.0, 1.0))!;
}

/// Avoid division by zero when [cursor] matches [Rect.center].
const double _inverseDistanceEpsilon = 1e-3;

/// Weight on normalized proximity (0–1) in [combinedFocusScore].
const double focusScoreProximityWeight = 0.7;

/// Weight on normalized dwell (0–1) in [combinedFocusScore].
const double focusScoreDwellWeight = 0.3;

/// Blended focus score: `proximity01 * 0.7 + dwell01 * 0.3`.
///
/// Both inputs are expected in **0–1** (caller normalizes raw metrics). Values outside range are clamped.
double combinedFocusScore(double proximity01, double dwell01) {
  final p = proximity01.clamp(0.0, 1.0);
  final d = dwell01.clamp(0.0, 1.0);
  return p * focusScoreProximityWeight + d * focusScoreDwellWeight;
}

/// Picks the best [FocusItem] for [cursor].
///
/// When [dwellFractionById] is **null**, ranking uses raw inverse distance only (same winner as before).
///
/// When [dwellFractionById] is set, each item gets **normalized** proximity (relative to the strongest
/// inverse-distance in the list) and a **0–1** dwell fraction from the map (missing keys → `0`),
/// then [combinedFocusScore] is applied.
FocusItem? getFocusedItem(
  List<FocusItem> items,
  Offset cursor, {
  Map<String, double>? dwellFractionById,
}) {
  if (items.isEmpty) return null;

  final proxRaw = <double>[];
  for (final item in items) {
    final dist = (cursor - item.bounds.center).distance;
    proxRaw.add(1 / (dist + _inverseDistanceEpsilon));
  }
  var maxProx = 0.0;
  for (final p in proxRaw) {
    if (p > maxProx) maxProx = p;
  }

  FocusItem? best;
  var bestScore = -double.maxFinite;

  for (var i = 0; i < items.length; i++) {
    final item = items[i];
    final pr = proxRaw[i];
    final double score;
    if (dwellFractionById == null) {
      score = pr;
    } else {
      final proxNorm = maxProx > 0 ? pr / maxProx : 0.0;
      final dwell = dwellFractionById[item.id];
      score = combinedFocusScore(proxNorm, dwell ?? 0.0);
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
}
