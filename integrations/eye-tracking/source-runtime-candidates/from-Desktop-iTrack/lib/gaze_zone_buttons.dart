import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'core/intent_os/intent_influence_pipeline.dart';
import 'intent_influence_ui.dart';

/// Three gaze targets (LEFT / CENTER / RIGHT) with animated focus and optional
/// selection highlight — intended as a dwell+blink calibration or demo UI.
///
/// Layout: [Row] of targets at the top and an optional bottom banner
/// `SELECTED: …` when [showSelectionLabel] is true (column + spacer when height
/// is bounded; compact column when height is unbounded).
///
/// When [influenceListenable] is set, the predicted target zone uses
/// [expandHitbox] / [opacityFromWeight] from [intent_influence_ui] (presentation only).
class GazeZoneButtons extends StatelessWidget {
  const GazeZoneButtons({
    super.key,
    required this.focused,
    required this.selected,
    this.zoneOffsets = const <String, Offset>{},
    this.zoneOpacity = const <String, double>{},
    this.compact = false,
    this.showSelectionLabel = true,
    this.influenceListenable,
  });

  /// Current gaze band ([getGazeZone] on normalized gaze), or null when unavailable.
  final String? focused;

  /// Zone confirmed after dwell + select blink; empty when none.
  final String selected;

  /// Per-zone visual translation (used by lock/exploration modes).
  final Map<String, Offset> zoneOffsets;

  /// Per-zone opacity override in [0, 1].
  final Map<String, double> zoneOpacity;

  /// Smaller sizes when shown as an overlay on the camera preview.
  final bool compact;

  /// When true (default), fills height and shows `SELECTED:` at [selectionBannerBottom].
  final bool showSelectionLabel;

  /// Optional: rebuilds targets when [IntentInfluence] updates (hitbox + opacity for predicted zone).
  final ValueListenable<IntentInfluence?>? influenceListenable;

  /// Distance from the bottom edge to the selection banner (matches typical FAB clearance).
  static const double selectionBannerBottom = 80;

  static const _labels = ['LEFT', 'CENTER', 'RIGHT'];

  @override
  Widget build(BuildContext context) {
    Widget content(IntentInfluence? influence) {
      final row = Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: _labels
            .map((label) => _buildButton(label, influence))
            .toList(),
      );

      if (!showSelectionLabel) {
        return row;
      }

      final selectedLine = selected.isEmpty ? '—' : selected;
      final bannerSize = compact ? 22.0 : 28.0;
      final banner = Center(
        child: Text(
          'SELECTED: $selectedLine',
          style: TextStyle(
            color: Colors.white,
            fontSize: bannerSize,
          ),
        ),
      );

      // Avoid [Stack] + [Positioned] top/bottom here: that path requires a finite
      // max height; some ancestors still pass unbounded height. [Column] + [Spacer]
      // pins the banner when height is bounded; a tight [Column] is used otherwise.
      return LayoutBuilder(
        builder: (context, constraints) {
          if (!constraints.hasBoundedHeight) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                row,
                SizedBox(height: selectionBannerBottom),
                banner,
              ],
            );
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              row,
              const Spacer(),
              Padding(
                padding: const EdgeInsets.only(bottom: selectionBannerBottom),
                child: banner,
              ),
            ],
          );
        },
      );
    }

    final listenable = influenceListenable;
    if (listenable != null) {
      return ValueListenableBuilder<IntentInfluence?>(
        valueListenable: listenable,
        builder: (context, influence, _) => content(influence),
      );
    }
    return content(null);
  }

  Widget _buildButton(String label, IntentInfluence? influence) {
    final isFocused = focused != null && focused == label;
    final isSelected = selected.isNotEmpty && selected == label;
    final offset = zoneOffsets[label] ?? Offset.zero;
    final big = compact ? 120.0 : 200.0;
    final small = compact ? 96.0 : 160.0;
    final fontSize = compact ? 16.0 : 22.0;

    final inf = influence;
    final useInfluence = inf != null;
    final isTarget = useInfluence && inf.zone == label;
    final weight = isTarget ? inf.weight : 0.0;
    final baseSize = isFocused ? big : small;
    final size = useInfluence ? expandHitbox(baseSize, weight) : baseSize;
    final opacity = useInfluence
        ? opacityFromWeight(weight)
        : (zoneOpacity[label] ?? 1.0).clamp(0.0, 1.0);

    return AnimatedSlide(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      offset: Offset(offset.dx / 120.0, offset.dy / 120.0),
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 180),
        opacity: opacity,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: isFocused ? Colors.blue : Colors.grey[800],
            borderRadius: BorderRadius.circular(20),
            border: isSelected
                ? Border.all(color: Colors.amberAccent, width: 3)
                : null,
            boxShadow: isFocused
                ? const [BoxShadow(color: Colors.blue, blurRadius: 20)]
                : const [],
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(color: Colors.white, fontSize: fontSize),
            ),
          ),
        ),
      ),
    );
  }
}
