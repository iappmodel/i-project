import type {
  RemoteCommand,
  RemoteCommandType,
  RemoteInputSource,
  RemotePermissionResult,
  RemoteRiskLevel,
  RemoteUserPolicyContext,
} from "./types";

export const DEFAULT_REMOTE_POLICY_CONTEXT: RemoteUserPolicyContext = {
  ageGroup: "adult",
  kycVerified: true,
  trustTier: 2,
  walletLocked: false,
  fraudHoldActive: false,
  campaignBudgetAvailable: true,
  canPublishCampaign: true,
  canWithdraw: true,
  canPay: true,
  canTip: true,
};

const HIGH_RISK_COMMAND_TYPES = new Set<RemoteCommandType>([
  "WITHDRAW",
  "PAY",
  "TIP",
  "PUBLISH_CAMPAIGN",
  "CONVERT_COINS",
]);

const GAZE_BLOCKED_COMMAND_TYPES = new Set<RemoteCommandType>([
  "WITHDRAW",
  "PAY",
  "TIP",
  "PUBLISH_CAMPAIGN",
  "CONNECT_PLATFORM",
  "DISCONNECT_PLATFORM",
  "CONVERT_COINS",
]);

const MONEY_COMMAND_TYPES = new Set<RemoteCommandType>([
  "WITHDRAW",
  "PAY",
  "TIP",
  "CONVERT_COINS",
]);

const CONNECTOR_MUTATION_TYPES = new Set<RemoteCommandType>([
  "CONNECT_PLATFORM",
  "DISCONNECT_PLATFORM",
]);

export function evaluateRemotePermission(
  command: RemoteCommand,
  policy: RemoteUserPolicyContext,
  remoteLocked: boolean
): RemotePermissionResult {
  if (remoteLocked && command.type !== "UNLOCK_REMOTE") {
    return { allowed: false, reason: "Remote is locked.", requiresConfirmation: false };
  }

  if (policy.ageGroup === "minor" && command.requiresAdult) {
    return {
      allowed: false,
      reason: "This action is not available for this account.",
      requiresConfirmation: false,
    };
  }

  if (command.requiresKyc && !policy.kycVerified) {
    return {
      allowed: false,
      reason: "Identity verification required.",
      requiresConfirmation: false,
    };
  }

  if (
    command.trustTierRequired != null &&
    policy.trustTier < command.trustTierRequired
  ) {
    return { allowed: false, reason: "Trust tier too low.", requiresConfirmation: false };
  }

  if (policy.fraudHoldActive) {
    return {
      allowed: false,
      reason: "Action paused by safety review.",
      requiresConfirmation: false,
    };
  }

  if (command.type === "PUBLISH_CAMPAIGN" && !policy.canPublishCampaign) {
    return {
      allowed: false,
      reason: "Campaign publishing not allowed.",
      requiresConfirmation: false,
    };
  }

  if (!policy.campaignBudgetAvailable && command.type === "PUBLISH_CAMPAIGN") {
    return {
      allowed: false,
      reason: "Campaign budget not ready.",
      requiresConfirmation: false,
    };
  }

  if (
    (command.type === "PAY" && !policy.canPay) ||
    (command.type === "WITHDRAW" && !policy.canWithdraw) ||
    (command.type === "TIP" && !policy.canTip)
  ) {
    return { allowed: false, reason: "Wallet action not allowed.", requiresConfirmation: false };
  }

  if (
    (command.type === "PAY" ||
      command.type === "WITHDRAW" ||
      command.type === "TIP") &&
    policy.walletLocked
  ) {
    return { allowed: false, reason: "Wallet is locked.", requiresConfirmation: false };
  }

  if (command.inputSource === "gaze" && GAZE_BLOCKED_COMMAND_TYPES.has(command.type)) {
    return {
      allowed: false,
      reason: "This action cannot run from gaze input.",
      requiresConfirmation: false,
    };
  }

  const requiresConfirmation =
    command.riskLevel === "HIGH" ||
    command.riskLevel === "MEDIUM" ||
    command.requiresConfirmation === true;

  return { allowed: true, requiresConfirmation };
}

export function getRemoteRiskLevelForInput(
  inputSource: RemoteInputSource,
  commandType: RemoteCommandType
): RemoteRiskLevel {
  if (inputSource === "gaze" && GAZE_BLOCKED_COMMAND_TYPES.has(commandType)) {
    return "BLOCKED";
  }
  if (HIGH_RISK_COMMAND_TYPES.has(commandType)) {
    return "HIGH";
  }
  return "LOW";
}

export function buildConfirmationCopy(command: RemoteCommand): string {
  return `Confirm "${command.label}" (${command.type})? Risk: ${command.riskLevel}.`;
}

export function isMoneyCommand(type: RemoteCommandType): boolean {
  return MONEY_COMMAND_TYPES.has(type);
}

export function isCampaignSpendCommand(type: RemoteCommandType): boolean {
  return type === "PUBLISH_CAMPAIGN";
}

export function isConnectorMutationCommand(type: RemoteCommandType): boolean {
  return CONNECTOR_MUTATION_TYPES.has(type);
}

/** Used by router when inferring command risk from type alone. */
export function isHighRiskCommandType(type: RemoteCommandType): boolean {
  return HIGH_RISK_COMMAND_TYPES.has(type);
}
