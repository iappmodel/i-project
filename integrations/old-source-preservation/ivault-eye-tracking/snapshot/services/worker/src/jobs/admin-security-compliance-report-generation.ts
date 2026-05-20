import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
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

const reportRoot =
  process.env.COMPLIANCE_REPORT_ROOT ?? "/tmp/i-compliance-reports";

const signingSecret =
  process.env.COMPLIANCE_REPORT_SIGNING_SECRET ?? "dev-only-change-me";

function getWorkerId() {
  return process.env.WORKER_ID ?? `worker-${process.pid}`;
}

function sha256(input: Buffer | string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hmacSha256(input: string) {
  return crypto.createHmac("sha256", signingSecret).update(input).digest("hex");
}

function safeFilePart(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

async function loadSections(reportRequestId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_compliance_report_sections")
    .select("*")
    .eq("compliance_report_request_id", reportRequestId)
    .order("section_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function loadEvidence(reportRequestId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_compliance_report_evidence_items")
    .select("*")
    .eq("compliance_report_request_id", reportRequestId)
    .order("evidence_ref", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

function renderMarkdown(input: {
  job: any;
  contentSummary: any;
  sections: any[];
  evidence: any[];
}) {
  const lines: string[] = [];

  lines.push(`# ${input.job.report_title}`);
  lines.push("");
  lines.push(`**Report Key:** \`${input.job.report_key}\``);
  lines.push(`**Audit Period:** ${input.job.period_name}`);
  lines.push(`**Audit Type:** ${input.job.audit_type}`);
  lines.push(`**Period:** ${input.job.period_start} → ${input.job.period_end}`);
  lines.push(`**Period Seal Checksum:** \`${input.job.seal_checksum_sha256}\``);
  lines.push(`**Watermark:** \`${input.job.watermark}\``);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const section of input.sections) {
    lines.push(`## ${section.title}`);
    lines.push("");
    lines.push(`**Finding:** ${section.finding_status}`);
    lines.push(`**Severity:** ${section.severity}`);
    lines.push("");
    lines.push(section.body_markdown);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## Evidence Appendix");
  lines.push("");
  lines.push(`Total evidence references: **${input.evidence.length}**`);
  lines.push("");

  for (const item of input.evidence) {
    lines.push(`### ${item.evidence_ref}`);
    lines.push("");
    lines.push(`- Type: ${item.evidence_type}`);
    lines.push(`- Source: ${item.source_type}`);
    lines.push(`- Framework: ${item.framework_key ?? ""}`);
    lines.push(`- Control: ${item.control_key ?? ""}`);
    lines.push(`- Policy: ${item.policy_key ?? ""}`);
    lines.push(`- Evidence key: ${item.evidence_key ?? ""}`);
    lines.push(`- Payload checksum: \`${item.payload_checksum_sha256 ?? ""}\``);
    lines.push(`- Summary: ${item.summary}`);
    lines.push("");
  }

  return lines.join("\n");
}

function renderJson(input: {
  job: any;
  contentSummary: any;
  sections: any[];
  evidence: any[];
}) {
  return JSON.stringify(
    {
      manifest: {
        reportRequestId: input.job.compliance_report_request_id,
        reportKey: input.job.report_key,
        reportType: input.job.report_type,
        reportFormat: input.job.report_format,
        reportTitle: input.job.report_title,
        reportAudience: input.job.report_audience,
        auditPeriodId: input.job.audit_period_id,
        periodKey: input.job.period_key,
        periodName: input.job.period_name,
        auditType: input.job.audit_type,
        periodStart: input.job.period_start,
        periodEnd: input.job.period_end,
        sealChecksumSha256: input.job.seal_checksum_sha256,
        generatedAt: new Date().toISOString(),
        watermark: input.job.watermark,
        contentSummary: input.contentSummary
      },
      sections: input.sections.map((section) => ({
        sectionKey: section.section_key,
        sectionOrder: section.section_order,
        sectionType: section.section_type,
        title: section.title,
        bodyMarkdown: section.body_markdown,
        severity: section.severity,
        findingStatus: section.finding_status,
        evidenceSummary: section.evidence_summary
      })),
      evidenceAppendix: input.evidence.map((item) => ({
        evidenceRef: item.evidence_ref,
        evidenceType: item.evidence_type,
        sourceType: item.source_type,
        sourceId: item.source_id,
        frameworkKey: item.framework_key,
        controlKey: item.control_key,
        policyKey: item.policy_key,
        evidenceKey: item.evidence_key,
        redactionLevel: item.redaction_level,
        payloadChecksumSha256: item.payload_checksum_sha256,
        summary: item.summary
      }))
    },
    null,
    2
  );
}

async function writeReportFile(input: { job: any; body: string }) {
  await fs.mkdir(reportRoot, { recursive: true });

  const extension =
    input.job.report_format === "json"
      ? "json"
      : input.job.report_format === "pdf"
        ? "json"
        : "md";

  const fileName = `${safeFilePart(input.job.report_key)}.${extension}`;
  const filePath = path.join(reportRoot, fileName);

  await fs.writeFile(filePath, input.body, "utf8");

  return {
    filePath,
    storageUri: `file://${filePath}`
  };
}

export async function runAdminSecurityComplianceReportGenerationJob() {
  const workerId = getWorkerId();

  const { data: jobs, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_compliance_reports",
    {
      p_batch_size: 5,
      p_worker_id: workerId,
      p_metadata: {
        source: "admin-security-compliance-report-generation-worker"
      }
    }
  );

  if (claimError) throw claimError;

  const claimed = jobs ?? [];

  for (const job of claimed) {
    try {
      const { data: contentSummary, error: buildError } = await supabaseAdmin.rpc(
        "build_admin_security_compliance_report_content",
        {
          p_compliance_report_request_id: job.compliance_report_request_id,
          p_metadata: {
            workerId,
            source: "admin-security-compliance-report-generation-worker"
          }
        }
      );

      if (buildError) throw buildError;

      const sections = await loadSections(job.compliance_report_request_id);
      const evidence = await loadEvidence(job.compliance_report_request_id);

      let body: string;

      if (job.report_format === "json") {
        body = renderJson({
          job,
          contentSummary,
          sections,
          evidence
        });
      } else if (job.report_format === "pdf") {
        body = JSON.stringify(
          {
            warning:
              "PDF rendering is not enabled in this worker. This is a signed JSON compliance report payload for PDF pipeline ingestion.",
            markdown: renderMarkdown({
              job,
              contentSummary,
              sections,
              evidence
            }),
            manifest: {
              reportKey: job.report_key,
              watermark: job.watermark,
              sealChecksumSha256: job.seal_checksum_sha256
            }
          },
          null,
          2
        );
      } else {
        body = renderMarkdown({
          job,
          contentSummary,
          sections,
          evidence
        });
      }

      const checksum = sha256(body);

      const signaturePayload = JSON.stringify({
        reportKey: job.report_key,
        checksumSha256: checksum,
        sealChecksumSha256: job.seal_checksum_sha256,
        signingKeyVersion: job.signing_key_version,
        signatureAlgorithm: job.signature_algorithm
      });

      const signature = hmacSha256(signaturePayload);

      const signedBody =
        job.report_format === "markdown"
          ? [
              body,
              "",
              "---",
              "",
              "## Signature",
              "",
              `- Algorithm: ${job.signature_algorithm}`,
              `- Signing key version: ${job.signing_key_version}`,
              `- Report checksum: \`${checksum}\``,
              `- Signature: \`${signature}\``
            ].join("\n")
          : body;

      const finalChecksum = sha256(signedBody);
      const payloadBytes = Buffer.byteLength(signedBody, "utf8");

      const { storageUri } = await writeReportFile({
        job,
        body: signedBody
      });

      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_admin_security_compliance_report",
        {
          p_compliance_report_request_id: job.compliance_report_request_id,
          p_storage_uri: storageUri,
          p_checksum_sha256: finalChecksum,
          p_payload_bytes: payloadBytes,
          p_signature: signature,
          p_worker_id: workerId,
          p_metadata: {
            workerId,
            source: "admin-security-compliance-report-generation-worker",
            unsignedChecksumSha256: checksum
          }
        }
      );

      if (completeError) throw completeError;

      await supabaseAdmin.rpc("hash_admin_security_compliance_report", {
        p_compliance_report_request_id: job.compliance_report_request_id,
        p_metadata: {
          workerId,
          source: "admin-security-compliance-report-generation-worker"
        }
      });
    } catch (err: any) {
      await supabaseAdmin.rpc("fail_admin_security_compliance_report", {
        p_compliance_report_request_id: job.compliance_report_request_id,
        p_error: err?.message ?? "unknown compliance report generation error",
        p_worker_id: workerId,
        p_metadata: {
          workerId,
          source: "admin-security-compliance-report-generation-worker"
        }
      });
    }
  }

  return {
    claimed: claimed.length
  };
}
