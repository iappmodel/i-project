import { randomUUID } from "crypto";
import type {
  PopsAdminOverrideDecision,
  PopsAdminOverrideInput,
  PopsPayloadValidationOptions,
  PopsPayloadValidationResult,
  PopsRateLimitDecision,
  PopsRateLimitRule,
} from "./pops-security.types";

interface RateWindowEntry {
  atMs: number;
}

export class PopsAbuseRulesEngine {
  private readonly counters = new Map<string, RateWindowEntry[]>();

  enforceRateLimit(rule: PopsRateLimitRule, atMs: number): PopsRateLimitDecision {
    const entries = this.counters.get(rule.key) ?? [];
    const kept = entries.filter((entry) => atMs - entry.atMs <= rule.windowMs);
    this.counters.set(rule.key, kept);

    if (kept.length >= rule.max) {
      const oldest = kept[0];
      const retryAfterMs = Math.max(0, rule.windowMs - (atMs - oldest.atMs));
      return { allowed: false, retryAfterMs };
    }

    kept.push({ atMs });
    this.counters.set(rule.key, kept);
    return { allowed: true, retryAfterMs: 0 };
  }

  validatePayload(
    eventType: string,
    payload: Record<string, unknown>,
    options: PopsPayloadValidationOptions,
  ): PopsPayloadValidationResult {
    const reasons: string[] = [];
    const payloadSize = Buffer.byteLength(JSON.stringify(payload), "utf8");

    if (payloadSize > options.maxPayloadBytes) {
      reasons.push("PAYLOAD_OVERSIZED");
    }

    if (!options.allowlistedEventTypes.includes(eventType as PopsPayloadValidationOptions["allowlistedEventTypes"][0])) {
      reasons.push("UNKNOWN_EVENT_TYPE");
    }

    const proofLevel = payload.proofLevel;
    if (typeof proofLevel === "string" && !options.allowlistedProofLevels.includes(proofLevel as never)) {
      reasons.push("INVALID_PROOF_LEVEL");
    }

    const confidenceKeys = ["presenceConfidence", "attentionConfidence", "intentConfidence", "finalConfidence"];
    for (const key of confidenceKeys) {
      const value = payload[key];
      if (value !== undefined && (typeof value !== "number" || value < 0 || value > 1)) {
        reasons.push("INVALID_CONFIDENCE_SCORE");
        break;
      }
    }

    if (payload.finalConfidence !== undefined || payload.finalDecisionConfidence !== undefined) {
      reasons.push("CLIENT_FINAL_CONFIDENCE_OVERRIDE_REJECTED");
    }

    if (!options.allowRawMediaUpload && (payload.rawMediaBlob || payload.rawCameraBytes || payload.rawAudioBytes)) {
      reasons.push("RAW_MEDIA_UPLOAD_REJECTED");
    }

    return {
      accepted: reasons.length === 0,
      reasons,
    };
  }

  authorizeAdminOverride(input: PopsAdminOverrideInput): PopsAdminOverrideDecision {
    const reasons: string[] = [];
    const isAuthenticated = input.adminUserId.trim().length > 0;
    if (!isAuthenticated) reasons.push("ADMIN_AUTH_REQUIRED");
    if (!input.adminRoles.includes("pops:admin_override")) reasons.push("ADMIN_ROLE_PERMISSION_REQUIRED");
    if (!input.reason || input.reason.trim().length < 8) reasons.push("ADMIN_REASON_REQUIRED");
    if (input.rewardMutationRequested) reasons.push("SILENT_REWARD_MUTATION_BLOCKED");

    if (reasons.length > 0) {
      return { allowed: false, reasons };
    }

    return {
      allowed: true,
      reasons: [],
      auditRecord: {
        id: `pops_admin_override_${randomUUID()}`,
        adminUserId: input.adminUserId,
        reason: input.reason!.trim(),
        rewardMutationRequested: input.rewardMutationRequested,
        atMs: input.atMs,
      },
    };
  }
}

export function buildDefaultPopsAbuseRateRules(input: {
  userId: string;
  deviceId: string;
  campaignId: string;
  nowMs: number;
}): PopsRateLimitRule[] {
  void input.nowMs;
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;
  return [
    { key: `sessions:user:${input.userId}`, max: 12, windowMs: hourMs },
    { key: `sessions:device:${input.deviceId}`, max: 20, windowMs: hourMs },
    { key: `reward_attempts:campaign:${input.campaignId}:user:${input.userId}`, max: 4, windowMs: dayMs },
    { key: `failed_verification:user:${input.userId}`, max: 10, windowMs: dayMs },
    { key: `disputes:user:${input.userId}`, max: 5, windowMs: dayMs },
    { key: `high_value_attempts:user:${input.userId}`, max: 3, windowMs: dayMs },
  ];
}
