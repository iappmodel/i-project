import { z } from "zod";

export const publicComplianceVerificationSchema = z.object({
  reportKey: z.string().min(1).max(512),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  signature: z.string().min(16).max(2048),
  periodSealChecksumSha256: z.string().regex(/^[a-f0-9]{64}$/i)
});

export const publicQuestionnaireExportVerificationSchema = z.object({
  exportKey: z.string().min(1).max(512),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  signature: z.string().min(16).max(2048)
});

export const publicDisclosurePackageVerificationSchema = z.object({
  packageKey: z.string().min(1).max(512),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  signature: z.string().min(16).max(2048).optional()
});

export const publicAuditorPacketManifestVerificationSchema = z.object({
  manifestKey: z.string().min(1).max(512),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  signature: z.string().min(16).max(2048)
});
