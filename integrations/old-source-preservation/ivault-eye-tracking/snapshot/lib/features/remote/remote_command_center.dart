import 'package:flutter/material.dart';

import 'remote_commands.dart';
import 'remote_controller.dart';
import 'remote_router.dart';
import 'remote_theme.dart';
import 'remote_types.dart';

/// Full command center overlay (MVP).
final class RemoteCommandCenter extends StatelessWidget {
  const RemoteCommandCenter({super.key, required this.controller});

  final RemoteController controller;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final s = controller.remoteState;
        if (s.mode != RemoteMode.commandCenter) {
          return const SizedBox.shrink();
        }
        final messenger = ScaffoldMessenger.maybeOf(context);
        final cmds = remoteCommandsForSurface(s.surface, inputSource: s.inputSource);
        final log = controller.eventLog.reversed.take(12).toList(growable: false);

        return Positioned.fill(
          child: Material(
            color: Colors.black.withValues(alpha: 0.72),
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: DecoratedBox(
                  decoration: RemoteTheme.glassPanel(radius: 20),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text('Command center',
                                  style: RemoteTheme.heading(18)),
                            ),
                            IconButton(
                              onPressed: controller.closeRemote,
                              icon: const Icon(Icons.close,
                                  color: RemoteTheme.textSecondary),
                            ),
                          ],
                        ),
                        Text('Surface', style: RemoteTheme.body(11)),
                        DropdownButtonFormField<RemoteSurface>(
                          value: s.surface,
                          dropdownColor: const Color(0xFF0F172A),
                          style: RemoteTheme.body(14).copyWith(color: RemoteTheme.textPrimary),
                          decoration: const InputDecoration(
                            isDense: true,
                            border: OutlineInputBorder(),
                          ),
                          items: RemoteSurface.values
                              .map(
                                (e) => DropdownMenuItem(
                                  value: e,
                                  child: Text(e.name),
                                ),
                              )
                              .toList(),
                          onChanged: (v) {
                            if (v != null) controller.setRemoteSurface(v);
                          },
                        ),
                        const SizedBox(height: 12),
                        Text('Primary actions', style: RemoteTheme.body(11)),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final c in cmds)
                              FilledButton.tonal(
                                onPressed: s.isLocked
                                    ? null
                                    : () {
                                        final r = controller.dispatchRemoteCommand(c);
                                        _snack(messenger, r, c.label);
                                      },
                                child: Text(c.label, style: RemoteTheme.body(13)),
                              ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: FilledButton(
                                style: FilledButton.styleFrom(
                                  backgroundColor: RemoteTheme.danger,
                                ),
                                onPressed: () {
                                  controller.dispatchRemoteCommand(
                                    commandFromType(
                                      RemoteCommandTypes.emergencyStop,
                                      s.surface,
                                    )!,
                                  );
                                  _snack(messenger, null, 'Emergency stop');
                                },
                                child: const Text('Emergency stop'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: OutlinedButton(
                                onPressed: s.isLocked
                                    ? controller.unlockRemote
                                    : controller.lockRemote,
                                child: Text(s.isLocked ? 'Unlock' : 'Lock remote'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text('Recent log', style: RemoteTheme.body(11)),
                        Expanded(
                          child: ListView.builder(
                            itemCount: log.length,
                            itemBuilder: (context, i) {
                              final e = log[i];
                              return Padding(
                                padding: const EdgeInsets.symmetric(vertical: 3),
                                child: Text(
                                  '${e.at.toIso8601String().substring(11, 19)} · ${e.type}'
                                  '${e.commandType != null ? ' · ${e.commandType}' : ''}'
                                  '${e.detail != null ? ' — ${e.detail}' : ''}',
                                  style: RemoteTheme.mono(11),
                                ),
                              );
                            },
                          ),
                        ),
                        Text(
                          'Safety: ${s.safety.riskLevel.name} · locked=${s.isLocked}',
                          style: RemoteTheme.body(12),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  static void _snack(
    ScaffoldMessengerState? m,
    RemoteRouteResult? r,
    String fallback,
  ) {
    final text = r == null
        ? fallback
        : switch (r) {
            RemoteRouteBlocked(:final reason) => 'Blocked: $reason',
            RemoteRouteRateLimited(:final reason) => reason,
            RemoteRouteConfirmationRequired() => 'Confirm in dialog',
            RemoteRouteExecuted(:final command) => 'OK: ${command.label}',
            RemoteRouteIgnored(:final reason) => reason,
          };
    m?.showSnackBar(SnackBar(content: Text(text)));
  }
}
