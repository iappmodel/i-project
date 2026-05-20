import crypto from "crypto";
import { supabaseAdmin } from "../../config/supabase";

const signingSecret =
  process.env.ANSWER_RECEIPT_SIGNING_SECRET ?? "dev-only-change-me";

function hmacSha256(input: string) {
  return crypto.createHmac("sha256", signingSecret).update(input).digest("hex");
}

export async function listAnswerReceipts(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_answer_receipt_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listAnswerReceiptCitations(input: { limit?: number }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_answer_receipt_citation_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;

  return data ?? [];
}

export async function listAnswerReceiptVerifications(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_answer_receipt_verification_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("verification_status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getAnswerReceiptIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_answer_receipt_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createAnswerReceipt(input: {
  answerRequestId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_answer_receipt",
    {
      p_answer_request_id: input.answerRequestId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    answerReceiptId: String(data),
    status: "pending"
  };
}

export async function verifyAnswerReceipt(input: {
  receiptKey: string;
  receiptHashSha256: string;
  signature: string;
  authUserId?: string;
  requesterEmail?: string;
  requesterIp?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data: receipt, error: receiptError } = await supabaseAdmin
    .from("admin_security_answer_receipt_dashboard")
    .select(
      "receipt_key, answer_request_id, answer_scope, signing_key_version, signature_algorithm"
    )
    .eq("receipt_key", input.receiptKey)
    .maybeSingle();

  if (receiptError) throw receiptError;

  let signatureMatch = false;

  if (receipt) {
    const signaturePayload = JSON.stringify({
      receiptKey: input.receiptKey,
      receiptHashSha256: input.receiptHashSha256,
      answerRequestId: receipt.answer_request_id,
      answerScope: receipt.answer_scope,
      signingKeyVersion: receipt.signing_key_version,
      signatureAlgorithm: receipt.signature_algorithm
    });

    const expectedSignature = hmacSha256(signaturePayload);

    signatureMatch =
      expectedSignature.length === input.signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(input.signature)
      );
  }

  const { data, error } = await supabaseAdmin.rpc(
    "verify_admin_security_answer_receipt",
    {
      p_receipt_key: input.receiptKey,
      p_receipt_hash_sha256: input.receiptHashSha256,
      p_signature: input.signature,
      p_signature_match: signatureMatch,
      p_auth_user_id: input.authUserId ?? null,
      p_requester_email: input.requesterEmail ?? null,
      p_requester_ip: input.requesterIp ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "answer-receipt-api"
      }
    }
  );

  if (error) throw error;
  return data;
}

export async function revokeAnswerReceipt(input: {
  adminAuthUserId: string;
  answerReceiptId: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "revoke_admin_security_answer_receipt",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_answer_receipt_id: input.answerReceiptId,
      p_reason: input.reason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    answerReceiptId: String(data),
    status: "revoked"
  };
}
