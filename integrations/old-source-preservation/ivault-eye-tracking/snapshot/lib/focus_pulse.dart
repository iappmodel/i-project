import 'package:flutter/material.dart';

import 'focus_item.dart';

/// Repeating scale pulse while [active] — e.g. when this target is [FocusLockState.currentItem].
///
/// When [active] is false, the child is shown at scale 1 with no animation ticks.
class FocusPulse extends StatefulWidget {
  const FocusPulse({
    super.key,
    required this.child,
    required this.active,
    this.pulseOpacity = false,
  });

  final Widget child;
  final bool active;

  /// If true, opacity oscillates between [focusItemPulseOpacityMin] and [focusItemPulseOpacityMax].
  final bool pulseOpacity;

  @override
  State<FocusPulse> createState() => _FocusPulseState();
}

class _FocusPulseState extends State<FocusPulse> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: focusItemPulsePeriod,
  );

  @override
  void initState() {
    super.initState();
    if (widget.active) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(covariant FocusPulse oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active == oldWidget.active) return;
    if (widget.active) {
      _controller.repeat(reverse: true);
    } else {
      _controller.stop();
      _controller.value = 0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        if (!widget.active) {
          return child!;
        }
        final t = Curves.easeInOut.transform(_controller.value);
        final scale =
            focusItemPulseScaleMin + (focusItemPulseScaleMax - focusItemPulseScaleMin) * t;
        Widget scaled = Transform.scale(scale: scale, child: child);
        if (widget.pulseOpacity) {
          final opacity = focusItemPulseOpacityMin +
              (focusItemPulseOpacityMax - focusItemPulseOpacityMin) * t;
          scaled = Opacity(opacity: opacity, child: scaled);
        }
        return scaled;
      },
      child: widget.child,
    );
  }
}
