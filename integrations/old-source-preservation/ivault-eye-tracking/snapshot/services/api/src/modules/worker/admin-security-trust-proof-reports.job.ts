import crypto from "node:crypto";
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadReport(reportId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_proof_report_dashboard")
    .select("*")
    .eq("admin_security_trust_proof_report_id", reportId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`trust proof report not found: ${reportId}`);
  return data;
}

async function loadArtifacts(privateRoomId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_artifact_viewer_subject_dashboard")
    .select("*")
    .eq("private_room_id", privateRoomId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

async function loadAnswers(privateRoomId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_evidence_answer_request_dashboard")
    .select("*")
    .eq("private_room_id", privateRoomId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

async function loadReceipts(privateRoomId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_answer_receipt_dashboard")
    .select("*")
    .eq("private_room_id", privateRoomId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

async function loadExports(privateRoomId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_answer_receipt_export_bundle_dashboard")
    .select("*")
    .eq("private_room_id", privateRoomId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

async function loadTimeline(privateRoomId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_timeline_event_dashboard")
    .select("*")
    .eq("private_room_id", privateRoomId)
    .eq("status", "active")
    .order("event_time", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

async function loadCrypto(privateRoomId: string) {
  const { data: chain, error: chainError } = await supabaseAdmin
    .from("admin_security_trust_timeline_chain_dashboard")
    .select("*")
    .eq("private_room_id", privateRoomId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (chainError) throw chainError;

  let checkpoint = null;
  let merkle = null;
  let anchor = null;
  if (chain?.admin_security_trust_timeline_chain_id) {
    const { data: checkpointData, error: checkpointError } = await supabaseAdmin
      .from("admin_security_trust_timeline_chain_checkpoint_dashboard")
      .select("*")
      .eq("chain_id", chain.admin_security_trust_timeline_chain_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (checkpointError) throw checkpointError;
    checkpoint = checkpointData;

    const { data: merkleData, error: merkleError } = await supabaseAdmin
      .from("admin_security_trust_timeline_merkle_batch_dashboard")
      .select("*")
      .eq("chain_id", chain.admin_security_trust_timeline_chain_id)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (merkleError) throw merkleError;
    merkle = merkleData;

    const { data: anchorData, error: anchorError } = await supabaseAdmin
      .from("admin_security_trust_timeline_anchor_dashboard")
      .select("*")
      .eq("chain_id", chain.admin_security_trust_timeline_chain_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (anchorError) throw anchorError;
    anchor = anchorData;
  }
  return { chain, checkpoint, merkle, anchor };
}

function buildHtmlReport(input: {
  report: any;
  artifacts: any[];
  answers: any[];
  receipts: any[];
  exports: any[];
  timeline: any[];
  crypto: any;
}) {
  const { report, artifacts, answers, receipts, exports, timeline, crypto } = input;
  const artifactRows = artifacts.map((a) => `<tr><td>${escapeHtml(a.title)}</td><td>${escapeHtml(a.artifact_type)}</td><td>${escapeHtml(a.status)}</td><td>${escapeHtml(a.sensitivity)}</td></tr>`).join("");
  const answerRows = answers.map((a) => `<tr><td>${escapeHtml(a.question_text)}</td><td>${escapeHtml(a.answer_status)}</td><td>${escapeHtml(a.confidence_score)}</td><td>${escapeHtml(a.cited_chunk_count)}</td></tr>`).join("");
  const receiptRows = receipts.map((r) => `<tr><td>${escapeHtml(r.receipt_key)}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(r.answer_status)}</td><td>${escapeHtml(r.receipt_hash_sha256)}</td></tr>`).join("");
  const exportRows = exports.map((e) => `<tr><td>${escapeHtml(e.bundle_key)}</td><td>${escapeHtml(e.status)}</td><td>${escapeHtml(e.export_format)}</td><td>${escapeHtml(e.bundle_checksum_sha256)}</td></tr>`).join("");
  const timelineRows = timeline.map((e) => `<tr><td>${escapeHtml(e.event_time)}</td><td>${escapeHtml(e.event_family)}</td><td>${escapeHtml(e.title)}</td><td>${escapeHtml(e.immutable_hash_sha256)}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(report.title)}</title></head><body><h1>${escapeHtml(report.title)}</h1><p>${escapeHtml(report.subtitle ?? report.customer_name ?? "")}</p><p>${escapeHtml(report.executive_summary ?? "Trust proof report generated from scoped evidence and proof records.")}</p><h2>Cryptographic Proof</h2><p>Chain: ${escapeHtml(crypto.chain?.last_chain_hash_sha256 ?? "Not available")}</p><p>Checkpoint: ${escapeHtml(crypto.checkpoint?.checkpoint_hash_sha256 ?? "Not available")}</p><p>Merkle: ${escapeHtml(crypto.merkle?.merkle_root_sha256 ?? "Not available")}</p><p>Anchor: ${escapeHtml(crypto.anchor?.anchored_hash_sha256 ?? "Not available")}</p><h2>Artifacts</h2><table><tbody>${artifactRows}</tbody></table><h2>Evidence Answers</h2><table><tbody>${answerRows}</tbody></table><h2>Signed Receipts</h2><table><tbody>${receiptRows}</tbody></table><h2>Export Bundles</h2><table><tbody>${exportRows}</tbody></table><h2>Proof Timeline</h2><table><tbody>${timelineRows}</tbody></table><p>This report summarizes scoped proof records. It does not include raw artifacts or internal metadata.</p></body></html>`;
}

export async function runAdminSecurityTrustProofReportJob() {
  const workerId = getWorkerId();
  const { data: jobs, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_trust_proof_report_jobs",
    { p_batch_size: 10, p_worker_id: workerId, p_metadata: { source: "admin-security-trust-proof-report-worker" } }
  );
  if (claimError) throw claimError;
  const claimed = jobs ?? [];

  for (const job of claimed) {
    try {
      const report = await loadReport(job.report_id);
      const privateRoomId = report.private_room_id;
      const artifacts = privateRoomId ? await loadArtifacts(privateRoomId) : [];
      const answers = privateRoomId ? await loadAnswers(privateRoomId) : [];
      const receipts = privateRoomId ? await loadReceipts(privateRoomId) : [];
      const exports = privateRoomId ? await loadExports(privateRoomId) : [];
      const timeline = privateRoomId ? await loadTimeline(privateRoomId) : [];
      const crypto = privateRoomId ? await loadCrypto(privateRoomId) : {};

      const payload = {
        schemaVersion: "trust-proof-report-v1",
        reportKey: report.report_key,
        reportScope: report.report_scope,
        reportType: report.report_type,
        title: report.title,
        subtitle: report.subtitle,
        executiveSummary: report.executive_summary,
        customerName: report.customer_name,
        customerDomain: report.customer_domain,
        generatedAt: new Date().toISOString(),
        counts: { artifacts: artifacts.length, answers: answers.length, receipts: receipts.length, exports: exports.length, timelineEvents: timeline.length },
        artifacts,
        answers,
        receipts,
        exports,
        timeline,
        crypto,
        limits: { includeRawArtifacts: false, includeInternalMetadata: false }
      };
      const html = buildHtmlReport({ report, artifacts, answers, receipts, exports, timeline, crypto });
      const payloadBody = JSON.stringify(payload, null, 2);
      const reportHash = sha256(payloadBody);
      const htmlHash = sha256(html);
      const htmlUri = `trust-proof-report://${report.report_key}/report.html`;
      const jsonUri = `trust-proof-report://${report.report_key}/report.json`;

      await supabaseAdmin.rpc("upsert_admin_security_trust_proof_report_section", {
        p_report_id: job.report_id, p_section_key: "cover", p_section_type: "cover", p_title: report.title, p_subtitle: report.subtitle,
        p_summary: report.executive_summary,
        p_content_json: { reportKey: report.report_key, customerName: report.customer_name, customerDomain: report.customer_domain },
        p_content_markdown: null, p_content_html: null, p_item_count: 0, p_sort_order: 0, p_metadata: { workerId }
      });

      await supabaseAdmin.rpc("upsert_admin_security_trust_proof_report_file", {
        p_report_id: job.report_id, p_file_key: "report-html", p_file_type: "report_html", p_filename: "trust-proof-report.html",
        p_content_type: "text/html", p_storage_uri: htmlUri, p_checksum_sha256: htmlHash, p_payload_bytes: bytes(html),
        p_signature_algorithm: "HMAC-SHA256", p_signing_key_version: "trust-proof-report-signing-v1",
        p_signature: sha256(`${htmlHash}:${report.report_key}`), p_signed_at: new Date().toISOString(), p_metadata: { workerId }
      });

      await supabaseAdmin.rpc("upsert_admin_security_trust_proof_report_file", {
        p_report_id: job.report_id, p_file_key: "report-json", p_file_type: "report_json", p_filename: "trust-proof-report.json",
        p_content_type: "application/json", p_storage_uri: jsonUri, p_checksum_sha256: reportHash, p_payload_bytes: bytes(payloadBody),
        p_signature_algorithm: "HMAC-SHA256", p_signing_key_version: "trust-proof-report-signing-v1",
        p_signature: sha256(`${reportHash}:${report.report_key}`), p_signed_at: new Date().toISOString(), p_metadata: { workerId }
      });

      const { error: completeError } = await supabaseAdmin.rpc("complete_admin_security_trust_proof_report_build", {
        p_report_id: job.report_id,
        p_report_job_id: job.report_job_id,
        p_report_payload: payload,
        p_report_hash_sha256: reportHash,
        p_payload_bytes: bytes(payloadBody),
        p_html_storage_uri: htmlUri,
        p_pdf_storage_uri: null,
        p_json_storage_uri: jsonUri,
        p_signature: sha256(`${reportHash}:${report.report_key}`),
        p_worker_id: workerId,
        p_metadata: { source: "admin-security-trust-proof-report-worker" }
      });
      if (completeError) throw completeError;

      await supabaseAdmin.rpc("register_trust_proof_report_download_subject", {
        p_report_id: job.report_id,
        p_request_id: null,
        p_metadata: { source: "admin-security-trust-proof-report-worker" }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown trust proof report build error";
      await supabaseAdmin.rpc("fail_admin_security_trust_proof_report_build", {
        p_report_id: job.report_id,
        p_report_job_id: job.report_job_id,
        p_error: message,
        p_worker_id: workerId,
        p_metadata: { source: "admin-security-trust-proof-report-worker" }
      });
    }
  }
  return { claimed: claimed.length };
}
