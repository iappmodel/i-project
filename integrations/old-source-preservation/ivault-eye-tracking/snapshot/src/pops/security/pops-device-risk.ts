import type { PopsDeviceRiskInput, PopsDeviceRiskResult } from "./pops-security.types";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class PopsDeviceRiskEngine {
  private readonly usersByDevice = new Map<string, Set<string>>();

  assess(input: PopsDeviceRiskInput): PopsDeviceRiskResult {
    const reasons: string[] = [];
    let score = 0;

    const existingUsers = this.usersByDevice.get(input.deviceId) ?? new Set<string>();
    existingUsers.add(input.userId);
    this.usersByDevice.set(input.deviceId, existingUsers);

    if (input.emulator) {
      score += 0.4;
      reasons.push("EMULATOR_RISK");
    }
    if (input.rootedOrJailbroken) {
      score += 0.35;
      reasons.push("ROOT_OR_JAILBREAK_RISK");
    }
    if (input.automationFrameworkDetected) {
      score += 0.3;
      reasons.push("AUTOMATION_FRAMEWORK_RISK");
    }
    if (input.debugMode) {
      score += 0.15;
      reasons.push("DEBUG_MODE_RISK");
    }
    if (input.accessibilityAutomationSuspected) {
      score += 0.2;
      reasons.push("ACCESSIBILITY_AUTOMATION_RISK");
    }
    if (existingUsers.size > 3) {
      score += 0.25;
      reasons.push("REPEATED_ACCOUNTS_ON_DEVICE");
    }
    if (input.installAgeHours < 1 && input.sessionsLast24h > 10) {
      score += 0.2;
      reasons.push("ABNORMAL_INSTALL_SESSION_BEHAVIOR");
    }

    const normalized = clamp01(score);
    const riskTier: PopsDeviceRiskResult["riskTier"] =
      normalized >= 0.85 ? "CRITICAL" : normalized >= 0.6 ? "HIGH" : normalized >= 0.3 ? "MEDIUM" : "LOW";

    return {
      score: normalized,
      reasons,
      riskTier,
    };
  }
}
