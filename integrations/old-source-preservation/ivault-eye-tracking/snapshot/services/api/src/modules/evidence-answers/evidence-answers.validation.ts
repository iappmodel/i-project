import { z } from "zod";

export const generateEvidenceAnswerSchema = z.object({
  answerToken: z.string().min(32).max(256),
  questionText: z.string().min(1).max(2000),
  limit: z.number().int().min(1).max(25).default(8)
});
