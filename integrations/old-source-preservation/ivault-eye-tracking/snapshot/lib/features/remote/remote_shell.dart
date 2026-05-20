import 'package:flutter/material.dart';

import 'remote_command_center.dart';
import 'remote_controller.dart';
import 'remote_orb.dart';
import 'remote_quick_panel.dart';
import 'remote_router.dart';
import 'remote_settings_sheet.dart';
import 'remote_theme.dart';
import 'remote_types.dart' show RemoteCommand;

/// Stacks the app under iRemote overlays + confirmation dialog host.
final class RemoteShell extends StatefulWidget {
  const RemoteShell({
    super.key,
    required this.child,
    required this.controller,
  });

  final Widget child;
  final RemoteController controller;

  @override
  State<RemoteShell> createState() => _RemoteShellState();
}

final class _RemoteShellState extends State<RemoteShell> {
  String? _lastPendingId;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.controller,
      builder: (context, _) {
        final pending = widget.controller.pendingConfirmation;
        if (pending != null && pending.id != _lastPendingId) {
          _lastPendingId = pending.id;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            _openConfirmDialog(context, pending);
          });
        } else if (pending == null) {
          _lastPendingId = null;
        }

        return Stack(
          fit: StackFit.expand,
          clipBehavior: Clip.none,
          children: [
            widget.child,
            RemoteCommandCenter(controller: widget.controller),
            RemoteSettingsSheet(controller: widget.controller),
            RemoteQuickPanel(controller: widget.controller),
            RemoteOrb(controller: widget.controller),
          ],
        );
      },
    );
  }

  Future<void> _openConfirmDialog(
    BuildContext context,
    RemoteCommand command,
  ) async {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: const Color(0xFF0F172A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: RemoteTheme.border),
          ),
          title: Text('Confirm action', style: RemoteTheme.heading(17)),
          content: Text(
            buildConfirmationCopy(command),
            style: RemoteTheme.body(14),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                widget.controller.cancelPendingCommand();
              },
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                widget.controller.confirmPendingCommand();
              },
              child: const Text('Confirm'),
            ),
          ],
        );
      },
    );
  }
}
