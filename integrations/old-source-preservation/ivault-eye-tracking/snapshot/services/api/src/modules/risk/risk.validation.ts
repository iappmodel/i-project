import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const observeSessionContextSchema = z.object({
  deviceFingerprintHash: z.string().min(16).max(256),

  platform: z
    .enum(["ios", "android", "web", "desktop", "server", "unknown"])
    .default("unknown"),
  appVersion: z.string().min(1).max(64).optional(),
  deviceModel: z.string().min(1).max(128).optional(),
  osVersion: z.string().min(1).max(64).optional(),

  appSessionId: uuidSchema.optional(),

  ipHash: z.string().min(16).max(256).optional(),
  ipCountry: z.string().min(2).max(2).optional(),
  ipRegion: z.string().max(128).optional(),
  ipCity: z.string().max(128).optional(),
  asn: z.string().max(64).optional(),

  networkType: z
    .enum([
      "residential",
      "mobile",
      "corporate",
      "hosting",
      "proxy",
      "vpn",
      "tor",
      "unknown"
    ])
    .default("unknown"),

  isVpn: z.boolean().optional(),
  isProxy: z.boolean().optional(),
  isTor: z.boolean().optional(),
  isHosting: z.boolean().optional(),

  metadata: boundedMetadataSchema
});
