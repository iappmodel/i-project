import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const reviewWithdrawalSchema = z.object({
  reviewNote: z.string().min(1).max(1024)
});

export const withdrawalIdParamSchema = z.object({
  id: uuidSchema
});

export const userIdParamSchema = z.object({
  userId: uuidSchema
});

export const deviceIdParamSchema = z.object({
  deviceId: uuidSchema
});

export const addTrustComponentSchema = z.object({
  componentKey: z.string().min(1).max(128),

  componentCategory: z.enum([
    "identity",
    "wallet",
    "attention",
    "reward",
    "withdrawal",
    "device",
    "behavior",
    "fraud",
    "admin",
    "system"
  ]),

  scoreDelta: z.number().min(-1).max(1).default(0),
  riskDelta: z.number().min(-1).max(1).default(0),
  weight: z.number().min(0).max(10).default(1),

  reasonCode: z.string().min(1).max(128),
  reasonMessage: z.string().min(1).max(1024).optional(),

  metadata: boundedMetadataSchema
});

export const updateDeviceStatusSchema = z.object({
  status: z.enum(["active", "trusted", "suspicious", "blocked"]),

  reasonCode: z.string().min(1).max(128),
  reasonMessage: z.string().min(1).max(1024),
  reviewedBy: z.string().min(1).max(128),

  metadata: boundedMetadataSchema
});

export const adminPaginationQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  userId: uuidSchema.optional(),

  decision: z.enum(["allow", "review", "block"]).optional(),

  status: z.string().min(1).max(64).optional()
});

export const privilegedActionQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z
    .enum(["pending", "approved", "rejected", "expired", "executed", "cancelled"])
    .optional()
});

export const privilegedActionIdParamSchema = z.object({
  id: uuidSchema
});

export const approvePrivilegedActionSchema = z.object({
  approvalNote: z.string().min(1).max(1024),
  metadata: boundedMetadataSchema
});

export const rejectPrivilegedActionSchema = z.object({
  rejectionReason: z.string().min(1).max(1024),
  metadata: boundedMetadataSchema
});

export const adminSecurityAlertQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z.enum(["open", "acknowledged", "resolved", "dismissed"]).optional(),

  severity: z.enum(["low", "medium", "high", "critical"]).optional()
});

export const adminSecurityAlertDeliveryQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z.enum(["queued", "locked", "delivered", "failed", "cancelled"]).optional()
});

export const adminSecurityAlertEscalationQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  escalationKey: z.string().min(1).max(128).optional()
});

export const adminSecurityDeviceQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z.enum(["unknown", "trusted", "suspicious", "blocked", "revoked"]).optional()
});

export const adminDeviceIdParamSchema = z.object({
  deviceId: uuidSchema
});

export const adminDeviceStatusActionSchema = z.object({
  reasonMessage: z.string().min(1).max(1024),
  metadata: boundedMetadataSchema
});

export const adminSessionRiskQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  decision: z.enum(["allow", "challenge", "block"]).optional()
});

export const adminActionRiskQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  decision: z.enum(["allow", "challenge", "block"]).optional(),
  actionKey: z.string().min(1).max(128).optional()
});

export const adminSessionControlQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z
    .enum(["active", "reauth_required", "revoked", "expired"])
    .optional()
});

export const adminSessionActionSchema = z.object({
  targetAdminAuthUserId: uuidSchema,
  sessionId: z.string().min(1).max(256),
  reason: z.string().min(1).max(1024),
  metadata: boundedMetadataSchema
});

export const revokeAllAdminSessionsSchema = z.object({
  targetAdminAuthUserId: uuidSchema,
  reason: z.string().min(1).max(1024),
  metadata: boundedMetadataSchema
});

export const completeAdminSessionReauthSchema = z.object({
  sessionId: z.string().min(1).max(256),
  metadata: boundedMetadataSchema
});

export const adminSecurityAlertIdParamSchema = z.object({
  id: uuidSchema
});

export const acknowledgeAdminSecurityAlertSchema = z.object({
  note: z.string().min(1).max(1024).optional(),
  metadata: boundedMetadataSchema
});

export const resolveAdminSecurityAlertSchema = z.object({
  resolutionNote: z.string().min(1).max(1024),
  metadata: boundedMetadataSchema
});

export const dismissAdminSecurityAlertSchema = z.object({
  dismissalReason: z.string().min(1).max(1024),
  metadata: boundedMetadataSchema
});

export const upsertAdminUserSchema = z.object({
  targetAuthUserId: uuidSchema,
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(128).optional(),
  status: z.enum(["active", "suspended", "revoked"]).default("active"),
  reason: z.string().min(1).max(1024),
  metadata: boundedMetadataSchema
});

export const adminRoleActionSchema = z.object({
  targetAuthUserId: uuidSchema,
  roleKey: z.enum([
    "super_admin",
    "risk_analyst",
    "finance_ops",
    "support_admin",
    "readonly_admin"
  ]),
  reason: z.string().min(1).max(1024),
  metadata: boundedMetadataSchema
});

export const createAdminMfaChallengeSchema = z.object({
  challengeType: z.enum(["totp", "webauthn", "recovery_code", "stub"]).default("stub"),
  purpose: z.enum([
    "admin_write",
    "privileged_action",
    "admin_login",
    "session_reauth"
  ]),
  metadata: boundedMetadataSchema
});

export const verifyAdminMfaChallengeSchema = z.object({
  challengeId: uuidSchema,
  code: z.string().min(1).max(128),
  metadata: boundedMetadataSchema
});
