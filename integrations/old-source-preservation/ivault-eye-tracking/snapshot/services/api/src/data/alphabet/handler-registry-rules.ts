import type { HandlerRegistryRuleSet } from "../../types/alphabet/handler-registry.types";

export const HANDLER_REGISTRY_RULES: HandlerRegistryRuleSet[] = [
  {
    permissionLevel: "public",
    minCompatibilityScore: 0.55,
    minSchemaValidationScore: 0.6,
    minOperationalReadinessScore: 0.55,
    maxHandlerRiskScore: 0.55,
    strictPayloadValidation: false,
    strictResultValidation: false,
    requiresHealthyHandler: false,
    requiresAuditWhenAuditRequired: false,
    requiresIdempotencyWhenRequired: false,
    deprecatedAllowedOnlyWithExplicitFlag: true,
    active: true
  },
  {
    permissionLevel: "internal",
    minCompatibilityScore: 0.62,
    minSchemaValidationScore: 0.68,
    minOperationalReadinessScore: 0.65,
    maxHandlerRiskScore: 0.45,
    strictPayloadValidation: false,
    strictResultValidation: false,
    requiresHealthyHandler: false,
    requiresAuditWhenAuditRequired: false,
    requiresIdempotencyWhenRequired: false,
    deprecatedAllowedOnlyWithExplicitFlag: true,
    active: true
  },
  {
    permissionLevel: "privileged",
    minCompatibilityScore: 0.72,
    minSchemaValidationScore: 0.78,
    minOperationalReadinessScore: 0.75,
    maxHandlerRiskScore: 0.35,
    strictPayloadValidation: true,
    strictResultValidation: true,
    requiresHealthyHandler: true,
    requiresAuditWhenAuditRequired: true,
    requiresIdempotencyWhenRequired: true,
    deprecatedAllowedOnlyWithExplicitFlag: true,
    active: true
  },
  {
    permissionLevel: "financial",
    minCompatibilityScore: 0.82,
    minSchemaValidationScore: 0.88,
    minOperationalReadinessScore: 0.82,
    maxHandlerRiskScore: 0.22,
    strictPayloadValidation: true,
    strictResultValidation: true,
    requiresHealthyHandler: true,
    requiresAuditWhenAuditRequired: true,
    requiresIdempotencyWhenRequired: true,
    deprecatedAllowedOnlyWithExplicitFlag: true,
    active: true
  },
  {
    permissionLevel: "admin",
    minCompatibilityScore: 0.85,
    minSchemaValidationScore: 0.88,
    minOperationalReadinessScore: 0.85,
    maxHandlerRiskScore: 0.2,
    strictPayloadValidation: true,
    strictResultValidation: true,
    requiresHealthyHandler: true,
    requiresAuditWhenAuditRequired: true,
    requiresIdempotencyWhenRequired: true,
    deprecatedAllowedOnlyWithExplicitFlag: true,
    active: true
  },
  {
    permissionLevel: "compliance",
    minCompatibilityScore: 0.88,
    minSchemaValidationScore: 0.92,
    minOperationalReadinessScore: 0.88,
    maxHandlerRiskScore: 0.15,
    strictPayloadValidation: true,
    strictResultValidation: true,
    requiresHealthyHandler: true,
    requiresAuditWhenAuditRequired: true,
    requiresIdempotencyWhenRequired: true,
    deprecatedAllowedOnlyWithExplicitFlag: true,
    active: true
  }
];

export const DEFAULT_HANDLER_FORBIDDEN_KEYS = new Set<string>([
  "rawRiskScore",
  "fraudModelOutput",
  "deviceFingerprint",
  "bankToken",
  "paymentToken",
  "identityGraph",
  "privateEvidence",
  "reviewerPrivateNote",
  "internalThreshold",
  "riskClusterId",
  "secretKey",
  "apiKey",
  "password"
]);
