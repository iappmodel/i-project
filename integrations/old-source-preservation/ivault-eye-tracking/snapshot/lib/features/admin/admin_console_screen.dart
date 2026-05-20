import 'package:eye_tracking_app/admin/admin_console_engine.dart';
import 'package:eye_tracking_app/admin/admin_console_models.dart';
import 'package:flutter/material.dart';

/// Minimal admin shell: audit log + read-only policy list (safe intents only).
class AdminConsoleScreen extends StatelessWidget {
  const AdminConsoleScreen({super.key, required this.engine});

  final AdminConsoleEngine engine;

  @override
  Widget build(BuildContext context) {
    final audits = engine.auditLogs;
    final policies = engine.policyVersions;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin console'),
        backgroundColor: Colors.black87,
        foregroundColor: Colors.white70,
      ),
      backgroundColor: Colors.black,
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          const Text(
            'Recent audit (newest last)',
            style: TextStyle(
              color: Colors.white70,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          if (audits.isEmpty)
            const Text(
              'No entries yet.',
              style: TextStyle(color: Colors.white38, fontSize: 13),
            )
          else
            ...audits.reversed.take(24).map(_auditTile),
          const SizedBox(height: 20),
          const Text(
            'Policy versions',
            style: TextStyle(
              color: Colors.white70,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          if (policies.isEmpty)
            const Text(
              'None registered.',
              style: TextStyle(color: Colors.white38, fontSize: 13),
            )
          else
            ...policies.map(
              (p) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  '${p.version} — ${p.summary}',
                  style: const TextStyle(color: Colors.white54, fontSize: 12),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _auditTile(AdminAuditLogEntry e) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${e.createdAt.toUtc().toIso8601String()} · ${e.module.name} · ${e.action}',
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
              if (e.resourceId != null)
                Text(
                  'resource: ${e.resourceId}',
                  style: const TextStyle(color: Colors.white38, fontSize: 11),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
