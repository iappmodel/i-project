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

function getWorkerId() {
  return process.env.WORKER_ID ?? `worker-${process.pid}`;
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function bytes(input: string) {
  return Buffer.byteLength(input, "utf8");
}

async function loadReceipt(receiptId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_answer_receipt_dashboard")
    .select("*")
    .eq("admin_security_answer_receipt_id", receiptId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`answer receipt not found: ${receiptId}`);
  return data;
}

async function loadReceiptCitations(receiptId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_answer_receipt_citation_dashboard")
    .select("*")
    .eq("answer_receipt_id", receiptId)
    .order("citation_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function buildManifest(input: {
  bundleKey: string;
  receipt: any;
  citations: any[];
  bundleHash: string;
  bundleStorageUri: string;
}) {
  return {
    schemaVersion: "answer-receipt-export-bundle-v1",
    bundleKey: input.bundleKey,
    receiptKey: input.receipt.receipt_key,
    answerScope: input.receipt.answer_scope,
    questionText: input.receipt.question_text,
    answerStatus: input.receipt.answer_status,
    confidenceScore: input.receipt.confidence_score,
    receiptHashSha256: input.receipt.receipt_hash_sha256,
    receiptSignature: input.receipt.signature,
    signatureAlgorithm: input.receipt.signature_algorithm,
    signingKeyVersion: input.receipt.signing_key_version,
    signedAt: input.receipt.signed_at,
    citationCount: input.citations.length,
    bundleChecksumSha256: input.bundleHash,
    bundleStorageUri: input.bundleStorageUri,
    builtAt: new Date().toISOString()
  };
}

function buildMarkdownSummary(receipt: any, citations: any[]) {
  const citationLines = citations.map((citation: any) => {
    const location = [
      citation.title,
      citation.section_title,
      citation.page_number ? `page ${citation.page_number}` : null
    ]
      .filter(Boolean)
      .join(" / ");
    return `- [${citation.citation_key}] ${location}: ${citation.cited_text}`;
  });

  return [
    "# Answer Receipt Export",
    "",
    `**Receipt key:** ${receipt.receipt_key}`,
    `**Scope:** ${receipt.answer_scope}`,
    `**Question:** ${receipt.question_text}`,
    `**Answer status:** ${receipt.answer_status}`,
    `**Confidence:** ${receipt.confidence_score ?? "n/a"}`,
    "",
    "## Answer",
    "",
    receipt.answer_text ?? receipt.non_answer_reason ?? "No answer text.",
    "",
    "## Citations",
    "",
    citationLines.length ? citationLines.join("\n") : "No citations.",
    "",
    "## Verification",
    "",
    `Receipt hash: ${receipt.receipt_hash_sha256}`,
    `Signature: ${receipt.signature}`,
    `Signing key: ${receipt.signing_key_version}`,
    `Algorithm: ${receipt.signature_algorithm}`,
    `Signed at: ${receipt.signed_at}`
  ].join("\n");
}

export async function runAdminSecurityAnswerReceiptExportBundleJob() {
  const workerId = getWorkerId();
  const { data: jobs, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_answer_receipt_export_bundle_jobs",
    {
      p_batch_size: 10,
      p_worker_id: workerId,
      p_metadata: {
        source: "admin-security-answer-receipt-export-bundle-worker"
      }
    }
  );
  if (claimError) throw claimError;

  const claimed = jobs ?? [];

  for (const job of claimed) {
    try {
      const receipt = await loadReceipt(job.answer_receipt_id);
      const citations = await loadReceiptCitations(job.answer_receipt_id);
      const summaryMarkdown = buildMarkdownSummary(receipt, citations);

      const bundlePayload = {
        schemaVersion: "answer-receipt-export-bundle-v1",
        bundleKey: job.bundle_key,
        receipt: {
          receiptKey: receipt.receipt_key,
          answerScope: receipt.answer_scope,
          questionText: receipt.question_text,
          answerText: receipt.answer_text,
          answerStatus: receipt.answer_status,
          nonAnswerReason: receipt.non_answer_reason,
          confidenceScore: receipt.confidence_score,
          evidenceScore: receipt.evidence_score,
          receiptHashSha256: receipt.receipt_hash_sha256,
          signature: receipt.signature,
          signatureAlgorithm: receipt.signature_algorithm,
          signingKeyVersion: receipt.signing_key_version,
          signedAt: receipt.signed_at,
          validFrom: receipt.valid_from,
          validUntil: receipt.valid_until
        },
        receiptPayload: job.receipt_payload,
        citations: citations.map((citation: any) => ({
          citationKey: citation.citation_key,
          artifactKey: citation.artifact_key,
          artifactType: citation.artifact_type,
          title: citation.title,
          sectionTitle: citation.section_title,
          pageNumber: citation.page_number,
          sectionKey: citation.section_key,
          citedText: citation.cited_text,
          citedTextHashSha256: citation.cited_text_hash_sha256,
          confidenceScore: citation.confidence_score
        })),
        summaryMarkdown
      };

      const bundleBody = JSON.stringify(bundlePayload, null, 2);
      const bundleHash = sha256(bundleBody);
      const storageUri = `answer-receipt-export://${job.bundle_key}/bundle.json`;
      const manifest = buildManifest({
        bundleKey: job.bundle_key,
        receipt,
        citations,
        bundleHash,
        bundleStorageUri: storageUri
      });

      await supabaseAdmin.rpc("upsert_admin_security_answer_receipt_export_bundle_item", {
        p_export_bundle_id: job.export_bundle_id,
        p_item_key: "receipt-payload",
        p_item_type: "receipt_payload",
        p_title: "Signed receipt payload",
        p_summary: "Frozen signed receipt payload.",
        p_source_type: "admin_security_answer_receipt",
        p_source_id: job.answer_receipt_id,
        p_answer_receipt_id: job.answer_receipt_id,
        p_receipt_citation_id: null,
        p_artifact_type: null,
        p_artifact_key: receipt.receipt_key,
        p_content_json: receipt,
        p_content_text: null,
        p_content_markdown: null,
        p_sort_order: 0,
        p_metadata: { workerId }
      });

      let citationIndex = 1;
      for (const citation of citations) {
        await supabaseAdmin.rpc("upsert_admin_security_answer_receipt_export_bundle_item", {
          p_export_bundle_id: job.export_bundle_id,
          p_item_key: `citation-${citation.citation_key}`,
          p_item_type: "citation",
          p_title: `Citation ${citation.citation_key}`,
          p_summary: citation.title ?? null,
          p_source_type: citation.source_type ?? null,
          p_source_id: citation.source_id ?? null,
          p_answer_receipt_id: job.answer_receipt_id,
          p_receipt_citation_id: citation.admin_security_answer_receipt_citation_id,
          p_artifact_type: citation.artifact_type,
          p_artifact_key: citation.artifact_key,
          p_content_json: citation,
          p_content_text: citation.cited_text,
          p_content_markdown: null,
          p_sort_order: citationIndex,
          p_metadata: { workerId }
        });
        citationIndex += 1;
      }

      await supabaseAdmin.rpc("upsert_admin_security_answer_receipt_export_bundle_item", {
        p_export_bundle_id: job.export_bundle_id,
        p_item_key: "verification-manifest",
        p_item_type: "verification_manifest",
        p_title: "Verification manifest",
        p_summary: "Manifest used to verify receipt export bundle integrity.",
        p_source_type: "admin_security_answer_receipt_export_bundle",
        p_source_id: job.export_bundle_id,
        p_answer_receipt_id: job.answer_receipt_id,
        p_receipt_citation_id: null,
        p_artifact_type: null,
        p_artifact_key: job.bundle_key,
        p_content_json: manifest,
        p_content_text: null,
        p_content_markdown: null,
        p_sort_order: 10000,
        p_metadata: { workerId }
      });

      await supabaseAdmin.rpc("upsert_admin_security_answer_receipt_export_bundle_file", {
        p_export_bundle_id: job.export_bundle_id,
        p_file_key: "bundle-json",
        p_file_type: "receipt_json",
        p_filename: "answer-receipt-bundle.json",
        p_content_type: "application/json",
        p_storage_uri: storageUri,
        p_checksum_sha256: bundleHash,
        p_payload_bytes: bytes(bundleBody),
        p_signature_algorithm: receipt.signature_algorithm,
        p_signing_key_version: receipt.signing_key_version,
        p_signature: receipt.signature,
        p_signed_at: receipt.signed_at,
        p_metadata: { workerId }
      });

      await supabaseAdmin.rpc("upsert_admin_security_answer_receipt_export_bundle_file", {
        p_export_bundle_id: job.export_bundle_id,
        p_file_key: "summary-markdown",
        p_file_type: "summary_markdown",
        p_filename: "answer-receipt-summary.md",
        p_content_type: "text/markdown",
        p_storage_uri: `answer-receipt-export://${job.bundle_key}/summary.md`,
        p_checksum_sha256: sha256(summaryMarkdown),
        p_payload_bytes: bytes(summaryMarkdown),
        p_signature_algorithm: receipt.signature_algorithm,
        p_signing_key_version: receipt.signing_key_version,
        p_signature: receipt.signature,
        p_signed_at: receipt.signed_at,
        p_metadata: { workerId }
      });

      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_admin_security_answer_receipt_export_bundle_build",
        {
          p_export_bundle_id: job.export_bundle_id,
          p_build_job_id: job.build_job_id,
          p_bundle_storage_uri: storageUri,
          p_bundle_checksum_sha256: bundleHash,
          p_bundle_payload_bytes: bytes(bundleBody),
          p_manifest_json: manifest,
          p_signature: receipt.signature,
          p_worker_id: workerId,
          p_metadata: {
            source: "admin-security-answer-receipt-export-bundle-worker"
          }
        }
      );
      if (completeError) throw completeError;

      await supabaseAdmin.rpc("register_answer_receipt_export_bundle_download_subject", {
        p_export_bundle_id: job.export_bundle_id,
        p_request_id: null,
        p_metadata: {
          source: "admin-security-answer-receipt-export-bundle-worker"
        }
      });
    } catch (err: any) {
      await supabaseAdmin.rpc("fail_admin_security_answer_receipt_export_bundle_build", {
        p_export_bundle_id: job.export_bundle_id,
        p_build_job_id: job.build_job_id,
        p_error: err?.message ?? "unknown answer receipt export bundle error",
        p_worker_id: workerId,
        p_metadata: {
          source: "admin-security-answer-receipt-export-bundle-worker"
        }
      });
    }
  }

  return { claimed: claimed.length };
}
