import { z } from "zod";

export const governancePolicyQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  category: z
    .enum([
      "mfa",
      "break_glass",
      "incident_review",
      "corrective_action",
      "notification",
      "retention",
      "archive",
      "verification",
      "deletion",
      "legal_hold",
      "audit",
      "session",
      "device",
      "general"
    ])
    .optional(),

  status: z
    .enum(["draft", "active", "paused", "superseded", "archived"])
    .optional()
});

export const governanceRuleQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 100))
    .pipe(z.number().int().min(1).max(250)),

  category: z.string().min(1).max(128).optional(),
  policyKey: z.string().min(1).max(256).optional()
});

export const policyEvaluationQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 100))
    .pipe(z.number().int().min(1).max(250)),

  policyKey: z.string().min(1).max(256).optional(),

  evaluationStatus: z
    .enum(["pass", "fail", "warn", "blocked", "not_applicable"])
    .optional()
});
