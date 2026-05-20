import 'package:flutter/material.dart';

import 'remote_commands.dart';
import 'remote_controller.dart';
import 'remote_router.dart';
import 'remote_theme.dart';
import 'remote_types.dart';

/// Compact contextual commands next to the orb.
final class RemoteQuickPanel extends StatelessWidget {
  const RemoteQuickPanel({super.key, required this.controller});

  final RemoteController controller;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final s = controller.remoteState;
        if (s.mode != RemoteMode.quick && s.mode != RemoteMode.expanded) {
          return const SizedBox.shrink();
        }
        final messenger = ScaffoldMessenger.maybeOf(context);

        return LayoutBuilder(
          builder: (context, constraints) {
            final w = constraints.maxWidth;
            final h = constraints.maxHeight;
            final p = s.position;
            final orbCx = (p.x * w).clamp(48.0, w - 48);
            final orbCy = (p.y * h).clamp(48.0, h - 48);
            final panelW = (w * 0.88).clamp(260.0, 400.0);
            var left = orbCx - panelW / 2;
            left = left.clamp(8.0, w - panelW - 8);
            final top = (orbCy - 220).clamp(8.0, h - 280);

            final cmds = remoteCommandsForSurface(
              s.surface,
              inputSource: s.inputSource,
            ).take(8).toList();

            return Positioned(
              left: left,
              top: top,
              width: panelW,
              child: Material(
                color: Colors.transparent,
                child: DecoratedBox(
                  decoration: RemoteTheme.glassPanel(radius: 18),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'iRemote',
                                style: RemoteTheme.heading(15),
                              ),
                            ),
                            IconButton(
                              tooltip: 'Command center',
                              onPressed: () =>
                                  controller.setRemoteMode(RemoteMode.commandCenter),
                              icon: const Icon(Icons.grid_view_rounded,
                                  color: RemoteTheme.textSecondary, size: 20),
                            ),
                            IconButton(
                              tooltip: 'Close',
                              onPressed: controller.closeRemote,
                              icon: const Icon(Icons.close,
                                  color: RemoteTheme.textSecondary, size: 22),
                            ),
                          ],
                        ),
                        Text(
                          '${s.surface.name} · demo',
                          style: RemoteTheme.body(12),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          alignment: WrapAlignment.center,
                          children: [
                            for (final c in cmds)
                              _CmdChip(
                                label: c.label,
                                onPressed: s.isLocked
                                    ? null
                                    : () {
                                        final r = controller.dispatchRemoteCommand(c);
                                        final msg = switch (r) {
                                          RemoteRouteBlocked(:final reason) =>
                                            'Blocked: $reason',
                                          RemoteRouteRateLimited(:final reason) =>
                                            reason,
                                          RemoteRouteConfirmationRequired() =>
                                            'Confirmation required',
                                          RemoteRouteExecuted() => 'Executed: ${c.label}',
                                          RemoteRouteIgnored(:final reason) =>
                                            reason,
                                        };
                                        messenger?.showSnackBar(
                                          SnackBar(
                                            content: Text(msg),
                                            duration: const Duration(seconds: 2),
                                          ),
                                        );
                                      },
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        TextButton.icon(
                          onPressed: s.isLocked
                              ? null
                              : () {
                                  final cmd = commandFromType(
                                    RemoteCommandTypes.openRemoteSettings,
                                    s.surface,
                                  );
                                  if (cmd != null) {
                                    controller.dispatchRemoteCommand(cmd);
                                  }
                                },
                          icon: const Icon(Icons.tune, size: 18, color: RemoteTheme.control),
                          label: Text('Remote settings', style: RemoteTheme.body(13)),
                        ),
                      ],
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

final class _CmdChip extends StatelessWidget {
  const _CmdChip({required this.label, required this.onPressed});

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      label: Text(label, style: RemoteTheme.body(12.5)),
      onPressed: onPressed,
      backgroundColor: const Color(0x22FFFFFF),
      side: const BorderSide(color: RemoteTheme.border),
    );
  }
}
