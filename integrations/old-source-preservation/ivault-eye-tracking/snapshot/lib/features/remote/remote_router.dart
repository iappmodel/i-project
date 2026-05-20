import 'remote_commands.dart';
import 'remote_policy.dart';
import 'remote_types.dart';

/// Outcome from [routeRemoteCommand].
sealed class RemoteRouteResult {}

final class RemoteRouteExecuted extends RemoteRouteResult {
  RemoteRouteExecuted(this.command);
  final RemoteCommand command;
}

final class RemoteRouteBlocked extends RemoteRouteResult {
  RemoteRouteBlocked(this.reason);
  final String reason;
}

final class RemoteRouteConfirmationRequired extends RemoteRouteResult {
  RemoteRouteConfirmationRequired({
    required this.command,
    required this.confirmationCopy,
  });
  final RemoteCommand command;
  final String confirmationCopy;
}

final class RemoteRouteRateLimited extends RemoteRouteResult {
  RemoteRouteRateLimited(this.reason);
  final String reason;
}

final class RemoteRouteIgnored extends RemoteRouteResult {
  RemoteRouteIgnored(this.reason);
  final String reason;
}

/// Sliding window rate limiter (in-memory MVP).
final class RemoteRateLimiter {
  RemoteRateLimiter({
    this.maxPerWindow = 24,
    this.window = const Duration(seconds: 10),
  });

  final int maxPerWindow;
  final Duration window;
  final Map<String, List<DateTime>> _hits = {};

  bool isLimited(String commandType) {
    final now = DateTime.now();
    final list = _hits.putIfAbsent(commandType, () => []);
    list.removeWhere((t) => now.difference(t) > window);
    return list.length >= maxPerWindow;
  }

  void record(String commandType) {
    final now = DateTime.now();
    _hits.putIfAbsent(commandType, () => []).add(now);
  }

  void reset() => _hits.clear();
}

String buildConfirmationCopy(RemoteCommand command) {
  return 'Confirm "${command.label}" (${command.type})? '
      'Risk: ${command.riskLevel.name}.';
}

/// Single entry point for remote commands (spec §12–§13).
RemoteRouteResult routeRemoteCommand({
  required RemoteCommand command,
  required RemotePolicyContext policy,
  required RemoteRateLimiter rateLimiter,
  required bool remoteLockedFromState,
  required bool strictConfirmations,
}) {
  if (command.riskLevel == RemoteRiskLevel.blocked ||
      command.disabledReason != null) {
    return RemoteRouteBlocked(
      command.disabledReason ?? 'Command is blocked.',
    );
  }

  if (rateLimiter.isLimited(command.type)) {
    return RemoteRouteRateLimited('Too many commands. Slow down.');
  }

  final permission = evaluateRemotePermission(
    command,
    policy,
    remoteLocked: remoteLockedFromState,
  );
  if (!permission.allowed) {
    return RemoteRouteBlocked(permission.reason ?? 'Not allowed.');
  }

  final mustConfirm = permission.requiresConfirmation &&
      (strictConfirmations ||
          command.riskLevel == RemoteRiskLevel.high ||
          kRemoteCommandRegistry[command.type]?.riskLevel ==
              RemoteRiskLevel.high);

  if (mustConfirm) {
    return RemoteRouteConfirmationRequired(
      command: command,
      confirmationCopy: buildConfirmationCopy(command),
    );
  }

  rateLimiter.record(command.type);
  return RemoteRouteExecuted(command);
}
