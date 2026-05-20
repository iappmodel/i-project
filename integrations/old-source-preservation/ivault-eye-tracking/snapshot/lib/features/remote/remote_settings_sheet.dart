import 'package:flutter/material.dart';

import 'remote_controller.dart';
import 'remote_theme.dart';
import 'remote_types.dart';

/// Remote preferences (MVP sheet).
final class RemoteSettingsSheet extends StatelessWidget {
  const RemoteSettingsSheet({super.key, required this.controller});

  final RemoteController controller;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final s = controller.remoteState;
        final p = controller.preferences;
        if (s.mode != RemoteMode.expanded) {
          return const SizedBox.shrink();
        }

        return Positioned.fill(
          child: Material(
            color: Colors.black.withValues(alpha: 0.65),
            child: GestureDetector(
              onTap: controller.closeRemote,
              behavior: HitTestBehavior.opaque,
              child: Align(
                alignment: Alignment.bottomCenter,
                child: GestureDetector(
                  onTap: () {},
                  child: DecoratedBox(
                    decoration: RemoteTheme.glassPanel(radius: 20),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text('iRemote settings',
                                    style: RemoteTheme.heading(17)),
                              ),
                              IconButton(
                                onPressed: controller.closeRemote,
                                icon: const Icon(Icons.close,
                                    color: RemoteTheme.textSecondary),
                              ),
                            ],
                          ),
                          SwitchListTile(
                            title: Text('Strict confirmations',
                                style: RemoteTheme.body(14)),
                            value: p.strictConfirmations,
                            onChanged: (v) {
                              controller.updatePreferences(
                                p.copyWith(strictConfirmations: v),
                              );
                            },
                          ),
                          SwitchListTile(
                            title: Text('Reduced motion',
                                style: RemoteTheme.body(14)),
                            value: p.reducedMotion,
                            onChanged: (v) {
                              controller.updatePreferences(
                                p.copyWith(reducedMotion: v),
                              );
                            },
                          ),
                          SwitchListTile(
                            title: Text('Left-handed layout',
                                style: RemoteTheme.body(14)),
                            value: p.leftHanded,
                            onChanged: (v) {
                              controller.updatePreferences(
                                p.copyWith(leftHanded: v),
                              );
                            },
                          ),
                          Text('Orb opacity', style: RemoteTheme.body(12)),
                          Slider(
                            value: p.opacity,
                            min: 0.5,
                            max: 1,
                            onChanged: (v) {
                              controller.updatePreferences(
                                p.copyWith(opacity: v),
                              );
                            },
                          ),
                          Text('Demo policy', style: RemoteTheme.heading(14)),
                          SwitchListTile(
                            title: Text('KYC verified', style: RemoteTheme.body(14)),
                            value: controller.policy.kycVerified,
                            onChanged: (v) {
                              controller.mutatePolicy((pol) {
                                pol.kycVerified = v;
                              });
                            },
                          ),
                          SwitchListTile(
                            title: Text('Wallet locked', style: RemoteTheme.body(14)),
                            value: controller.policy.walletLocked,
                            onChanged: (v) {
                              controller.mutatePolicy((pol) {
                                pol.walletLocked = v;
                              });
                            },
                          ),
                          SwitchListTile(
                            title: Text('Fraud hold', style: RemoteTheme.body(14)),
                            value: controller.policy.fraudHoldActive,
                            onChanged: (v) {
                              controller.mutatePolicy((pol) {
                                pol.fraudHoldActive = v;
                              });
                            },
                          ),
                          SwitchListTile(
                            title: Text('Minor account', style: RemoteTheme.body(14)),
                            value: controller.policy.ageGroup == 'minor',
                            onChanged: (v) {
                              controller.mutatePolicy((pol) {
                                pol.ageGroup = v ? 'minor' : 'adult';
                              });
                            },
                          ),
                        ],
                      ),
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
}
