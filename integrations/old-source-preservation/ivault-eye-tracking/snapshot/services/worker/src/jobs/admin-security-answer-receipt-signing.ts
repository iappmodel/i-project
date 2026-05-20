import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
);

const signingSecret =
  process.env.ANSWER_RECEIPT_SIGNING_SECRET ?? "dev-only-change-me";

function getWorkerId() {
  return process.env.WORKER_ID ?? `worker-${process.pid}`;
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hmacSha256(input: string) {
  return crypto.createHmac("sha256", signingSecret).update(input).digest("hex");
}

async function loadCitations(answerReceiptId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_answer_receipt_citations")
    .select("*")
    .eq("answer_receipt_id", answerReceiptId)
    .order("citation_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function runAdminSecurityAnswerReceiptSigningJob() {
  const workerId = getWorkerId();

  const { data: receipts, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_answer_receipts_for_signing",
    {
      p_batch_size: 25,
      p_worker_id: workerId,
      p_metadata: {
        source: "admin-security-answer-receipt-signing-worker"
      }
    }
  );

  if (claimError) throw claimError;

  const claimed = receipts ?? [];

  for (const receipt of claimed) {
    try {
      const citations = await loadCitations(receipt.answer_receipt_id);

      const payload = {
        ...receipt.receipt_payload,
        citations: citations.map((citation: any) => ({
          citationKey: citation.citation_key,
          artifactKey: citation.artifact_key,
          artifactType: citation.artifact_type,
          title: citation.title,
          sectionTitle: citation.section_title,
          pageNumber: citation.page_number,
          sectionKey: citation.section_key,
          citedTextHashSha256: citation.cited_text_hash_sha256,
          citedText: citation.cited_text,
          confidenceScore: citation.confidence_score
        })),
        signedPayloadPreparedAt: new Date().toISOString()
      };

      const body = JSON.stringify(payload);
      const hash = sha256(body);

      const signaturePayload = JSON.stringify({
        receiptKey: receipt.receipt_key,
        receiptHashSha256: hash,
        answerRequestId: receipt.answer_request_id,
        answerScope: receipt.answer_scope,
        signingKeyVersion: "answer-receipt-signing-v1",
        signatureAlgorithm: "HMAC-SHA256"
      });

      const signature = hmacSha256(signaturePayload);

      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_admin_security_answer_receipt_signing",
        {
          p_answer_receipt_id: receipt.answer_receipt_id,
          p_receipt_payload: payload,
          p_receipt_hash_sha256: hash,
          p_payload_bytes: Buffer.byteLength(body, "utf8"),
          p_signature: signature,
          p_worker_id: workerId,
          p_metadata: {
            source: "admin-security-answer-receipt-signing-worker"
          }
        }
      );

      if (completeError) throw completeError;
    } catch (err: any) {
      await supabaseAdmin.rpc("fail_admin_security_answer_receipt_signing", {
        p_answer_receipt_id: receipt.answer_receipt_id,
        p_error: err?.message ?? "unknown answer receipt signing error",
        p_worker_id: workerId,
        p_metadata: {
          source: "admin-security-answer-receipt-signing-worker"
        }
      });
    }
  }

  return {
    claimed: claimed.length
  };
}
