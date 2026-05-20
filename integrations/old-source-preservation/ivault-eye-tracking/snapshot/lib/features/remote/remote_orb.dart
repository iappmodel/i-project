import 'package:flutter/material.dart';

import 'remote_controller.dart';
import 'remote_theme.dart';
import 'remote_types.dart';

/// Floating iRemote orb — collapsed entry point.
final class RemoteOrb extends StatelessWidget {
  const RemoteOrb({super.key, required this.controller});

  final RemoteController controller;

  Color _orbColor(RemoteOrbVisualState v) {
    return switch (v) {
      RemoteOrbVisualState.idle => RemoteTheme.orbIdle,
      RemoteOrbVisualState.earning =>
        RemoteTheme.earn.withValues(alpha: 0.9),
      RemoteOrbVisualState.pending =>
        RemoteTheme.pending.withValues(alpha: 0.95),
      RemoteOrbVisualState.danger =>
        RemoteTheme.danger.withValues(alpha: 0.95),
      RemoteOrbVisualState.listening =>
        RemoteTheme.control.withValues(alpha: 0.9),
      RemoteOrbVisualState.verifying =>
        RemoteTheme.control.withValues(alpha: 0.85),
      RemoteOrbVisualState.locked => const Color(0xFF64748B),
      RemoteOrbVisualState.disabled => const Color(0xFF374151),
    };
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final s = controller.remoteState;
        if (s.mode == RemoteMode.disabled) {
          return const SizedBox.shrink();
        }
        final dur = s.reducedMotion
            ? Duration.zero
            : const Duration(milliseconds: 180);

        return LayoutBuilder(
          builder: (context, constraints) {
            final w = constraints.maxWidth;
            final h = constraints.maxHeight;
            final p = s.position;
            final left = (p.x * w).clamp(48.0, w - 48) - 28;
            final top = (p.y * h).clamp(48.0, h - 48) - 28;

            return Positioned(
              left: left,
              top: top,
              child: GestureDetector(
                onPanUpdate: s.isLocked
                    ? null
                    : (d) {
                        final nx =
                            ((left + d.delta.dx + 28) / w).clamp(0.08, 0.92);
                        final ny =
                            ((top + d.delta.dy + 28) / h).clamp(0.12, 0.92);
                        controller.updateOrbPosition(
                          RemotePosition(
                            x: nx,
                            y: ny,
                            anchor: RemoteAnchor.custom,
                          ),
                        );
                      },
                onPanStart: (_) => controller.setOrbDragging(true),
                onPanEnd: (_) => controller.setOrbDragging(false),
                onTap: s.isLocked
                    ? null
                    : () {
                        if (s.mode == RemoteMode.collapsed) {
                          controller.openRemote(RemoteMode.quick);
                        } else {
                          controller.closeRemote();
                        }
                      },
                child: Semantics(
                  button: true,
                  label: 'iRemote control',
                  child: AnimatedContainer(
                    duration: dur,
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _orbColor(s.orbVisual),
                      border: Border.all(color: RemoteTheme.border),
                      boxShadow: [
                        BoxShadow(
                          blurRadius:
                              s.orbVisual == RemoteOrbVisualState.danger ? 18 : 12,
                          spreadRadius: 0,
                          color: _orbColor(s.orbVisual).withValues(alpha: 0.45),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        'i',
                        style: RemoteTheme.heading(22).copyWith(
                          color: RemoteTheme.textPrimary,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}
