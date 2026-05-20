import { z } from "zod";

export const executeArtifactSearchSchema = z.object({
  searchToken: z.string().min(32).max(256),
  queryText: z.string().min(1).max(1000),
  queryType: z.enum(["keyword", "semantic", "hybrid", "filter_only"]).default("keyword"),
  limit: z.number().int().min(1).max(100).default(20)
});
