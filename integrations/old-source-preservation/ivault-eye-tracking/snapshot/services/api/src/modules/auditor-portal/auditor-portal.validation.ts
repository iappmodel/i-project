import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const portalKeyParamSchema = z.object({
  portalKey: z.string().min(1).max(512)
});

export const packetKeyParamSchema = z.object({
  portalKey: z.string().min(1).max(512),
  packetKey: z.string().min(1).max(512)
});

export const manifestKeyParamSchema = z.object({
  portalKey: z.string().min(1).max(512),
  manifestKey: z.string().min(1).max(512)
});

export const acknowledgeAuditorItemSchema = z.object({
  acknowledgementType: z.enum([
    "portal_terms",
    "confidentiality_notice",
    "evidence_packet_viewed",
    "artifact_downloaded",
    "timeline_reviewed",
    "question_answer_received"
  ]),
  sourceType: z.string().min(1).max(128),
  sourceId: uuidSchema,
  statement: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const submitAuditorQuestionSchema = z.object({
  subject: z.string().min(1).max(256),
  questionText: z.string().min(1).max(30000),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  category: z.string().max(128).optional(),
  relatedSourceType: z.string().max(128).optional(),
  relatedSourceId: uuidSchema.optional(),
  metadata: boundedMetadataSchema
});

export const requestPacketManifestSchema = z.object({
  exportFormat: z.enum(["json", "markdown", "pdf", "zip"]).default("json"),
  metadata: boundedMetadataSchema
});
