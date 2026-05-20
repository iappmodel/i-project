import 'remote_commands.dart';
import 'remote_types.dart';

/// Gaze cannot execute these (spec §18).
const Set<String> kGazeBlockedCommandTypes = {
  RemoteCommandTypes.withdraw,
  RemoteCommandTypes.pay,
  RemoteCommandTypes.tip,
  RemoteCommandTypes.publishCampaign,
  RemoteCommandTypes.connectPlatform,
  RemoteCommandTypes.disconnectPlatform,
  RemoteCommandTypes.convertCoins,
};

/// Mutable policy snapshot for MVP demos and tests.
final class RemotePolicyContext {
  RemotePolicyContext({
    this.ageGroup = 'adult',
    this.kycVerified = true,
    this.trustTier = 2,
    this.walletLocked = false,
    this.fraudHoldActive = false,
    this.campaignBudgetReady = true,
  });

  /// `'minor'` or `'adult'`.
  String ageGroup;
  bool kycVerified;
  int trustTier;
  bool walletLocked;
  bool fraudHoldActive;
  bool campaignBudgetReady;
}

/// Result of [evaluateRemotePermission].
final class RemotePermissionResult {
  const RemotePermissionResult({
    required this.allowed,
    this.reason,
    this.requiresConfirmation = false,
  });

  final bool allowed;
  final String? reason;
  final bool requiresConfirmation;
}

RemotePermissionResult evaluateRemotePermission(
  RemoteCommand command,
  RemotePolicyContext policy, {
  required bool remoteLocked,
}) {
  if (remoteLocked && command.type != RemoteCommandTypes.unlockRemote) {
    return const RemotePermissionResult(
      allowed: false,
      reason: 'Remote is locked.',
    );
  }

  if (policy.ageGroup == 'minor' && command.requiresAdult) {
    return const RemotePermissionResult(
      allowed: false,
      reason: 'This action is not available for this account.',
    );
  }

  if (command.requiresKyc && !policy.kycVerified) {
    return const RemotePermissionResult(
      allowed: false,
      reason: 'Identity verification required.',
    );
  }

  if (command.trustTierRequired != null &&
      policy.trustTier < command.trustTierRequired!) {
    return const RemotePermissionResult(
      allowed: false,
      reason: 'Trust tier too low.',
    );
  }

  if (policy.fraudHoldActive) {
    return const RemotePermissionResult(
      allowed: false,
      reason: 'Action paused by safety review.',
    );
  }

  if (command.type == RemoteCommandTypes.publishCampaign &&
      !policy.campaignBudgetReady) {
    return const RemotePermissionResult(
      allowed: false,
      reason: 'Campaign budget not ready.',
    );
  }

  if ((command.type == RemoteCommandTypes.pay ||
          command.type == RemoteCommandTypes.withdraw ||
          command.type == RemoteCommandTypes.tip) &&
      policy.walletLocked) {
    return const RemotePermissionResult(
      allowed: false,
      reason: 'Wallet is locked.',
    );
  }

  if (command.inputSource == RemoteInputSource.gaze &&
      kGazeBlockedCommandTypes.contains(command.type)) {
    return const RemotePermissionResult(
      allowed: false,
      reason: 'This action cannot run from gaze input.',
    );
  }

  final spec = kRemoteCommandRegistry[command.type];
  final specRisk = spec?.riskLevel ?? command.riskLevel;
  final requiresConfirmation = command.riskLevel == RemoteRiskLevel.high ||
      command.riskLevel == RemoteRiskLevel.medium ||
      specRisk == RemoteRiskLevel.high ||
      specRisk == RemoteRiskLevel.medium ||
      command.requiresConfirmation ||
      (spec?.requiresConfirmation ?? false);

  return RemotePermissionResult(
    allowed: true,
    requiresConfirmation: requiresConfirmation,
  );
}
