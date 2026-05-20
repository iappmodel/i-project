import { z } from "zod";

export const createAnswerReceiptSchema = z.object({
  answerRequestId: z.string().uuid()
});

export const verifyAnswerReceiptSchema = z.object({
  receiptKey: z.string().min(1).max(512),
  receiptHashSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  signature: z.string().min(16).max(2048)
});
