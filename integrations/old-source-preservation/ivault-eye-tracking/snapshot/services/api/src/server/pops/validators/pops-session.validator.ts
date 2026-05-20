import { z } from "zod";
import { POPS_PROOF_LEVEL, POPS_SESSION_TYPE } from "../../../pops/types/pops.types";

const proofLevels = Object.values(POPS_PROOF_LEVEL) as [string, ...string[]];
const sessionTypes = Object.values(POPS_SESSION_TYPE) as [string, ...string[]];

export const popsSessionStartSchema = z.object({
  userId: z.string().uuid(),
  deviceId: z.string().min(3).max(128),
  contentId: z.string().min(1).max(256).optional(),
  campaignId: z.string().uuid().optional(),
  sessionType: z.enum(sessionTypes),
  proofLevel: z.enum(proofLevels),
  clientStartedAt: z.string().datetime(),
  requiredDurationMs: z.number().int().min(1).max(1000 * 60 * 60 * 8),
  clientContext: z.record(z.unknown()).default({}),
  privacyMode: z.string().min(2).max(64)
});

export const popsSessionIdParamSchema = z.object({
  sessionId: z.string().uuid()
});

export const popsDecisionIdParamSchema = z.object({
  decisionId: z.string().uuid()
});

export const popsCloseSessionSchema = z.object({
  reason: z.string().min(2).max(120),
  detail: z.string().max(1024).optional(),
  createPrivacyReceipt: z.boolean().optional().default(true)
});
