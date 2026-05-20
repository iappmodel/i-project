import { z } from "zod";

export const createProofLinkForKeySchema = z.object({
  proofType: z.enum([
    "answer_receipt",
    "answer_receipt_export_bundle",
    "trust_proof_report",
    "trust_timeline_snapshot",
    "timeline_chain_checkpoint",
    "timeline_merkle_batch",
    "timeline_anchor"
  ]),
  proofKey: z.string().min(1).max(2048),
  createQr: z.boolean().default(true)
});
