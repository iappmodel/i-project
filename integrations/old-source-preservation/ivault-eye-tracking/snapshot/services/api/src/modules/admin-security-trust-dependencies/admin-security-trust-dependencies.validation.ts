import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const trustDependencyQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional(),
  parentSourceType: z.string().min(1).max(128).optional(),
  childSourceType: z.string().min(1).max(128).optional()
});

export const upsertTrustDependencySchema = z.object({
  relationshipType: z.enum([
    "derived_from",
    "published_as",
    "included_in",
    "references",
    "verified_by",
    "revoked_by",
    "supersedes",
    "retained_as",
    "downloaded_as",
    "question_about",
    "acknowledged_by",
    "other"
  ]),
  dependencyStrength: z.enum(["weak", "medium", "strong", "critical"]).default("strong"),
  parentSourceType: z.string().min(1).max(128),
  parentSourceId: uuidSchema,
  childSourceType: z.string().min(1).max(128),
  childSourceId: uuidSchema,
  parentArtifactKey: z.string().max(512).optional(),
  childArtifactKey: z.string().max(512).optional(),
  parentTitle: z.string().max(512).optional(),
  childTitle: z.string().max(512).optional(),
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  impactOnParentChange: z
    .enum([
      "none",
      "review_required",
      "child_update_required",
      "child_invalid",
      "child_revoke_required"
    ])
    .default("review_required"),
  impactOnParentRevocation: z
    .enum([
      "none",
      "child_review_required",
      "child_invalid",
      "child_revoke_required",
      "child_public_notice_required"
    ])
    .default("child_review_required"),
  impactOnParentDeletion: z
    .enum([
      "none",
      "review_required",
      "block_delete",
      "block_child_or_delete_child",
      "cascade_delete_allowed"
    ])
    .default("block_child_or_delete_child"),
  metadata: boundedMetadataSchema
});

export const impactAnalysisSchema = z.object({
  sourceType: z.string().min(1).max(128),
  sourceId: uuidSchema,
  analysisType: z.enum([
    "publish",
    "revoke",
    "delete",
    "supersede",
    "expire",
    "retention_delete",
    "manual",
    "other"
  ]),
  requestedAction: z.string().min(1).max(256),
  maxDepth: z.number().int().min(1).max(20).default(5),
  metadata: boundedMetadataSchema
});

export const runDependencyJobSchema = z.object({
  batchSize: z.number().int().min(1).max(5000).default(1000),
  metadata: boundedMetadataSchema
});

export const propagationJobSchema = z.object({
  batchSize: z.number().int().min(1).max(1000).default(100),
  metadata: boundedMetadataSchema
});
