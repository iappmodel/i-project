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

const exportRoot = process.env.AUDITOR_EXPORT_ROOT ?? "/tmp/i-auditor-exports";

function getWorkerId() {
  return process.env.WORKER_ID ?? `worker-${process.pid}`;
}

function sha256(input: Buffer | string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function safeFilePart(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160);
}

async function loadExportItems(exportRequestId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_auditor_export_items")
    .select("*")
    .eq("auditor_export_request_id", exportRequestId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

function toCsv(items: Record<string, unknown>[]) {
  const rows = [
    [
      "item_type",
      "source_type",
      "framework_key",
      "control_key",
      "policy_key",
      "evidence_key",
      "item_status",
      "redaction_level",
      "payload_json"
    ]
  ];

  for (const item of items) {
    rows.push([
      String(item.item_type ?? ""),
      String(item.source_type ?? ""),
      String(item.framework_key ?? ""),
      String(item.control_key ?? ""),
      String(item.policy_key ?? ""),
      String(item.evidence_key ?? ""),
      String(item.item_status ?? ""),
      String(item.redaction_level ?? ""),
      JSON.stringify(item.payload ?? {})
    ]);
  }

  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell);
          return `"${value.replace(/"/g, "\"\"")}"`;
        })
        .join(",")
    )
    .join("\n");
}

function buildJsonBundle(input: {
  exportJob: Record<string, unknown>;
  items: Record<string, unknown>[];
  workerId: string;
}) {
  return {
    manifest: {
      exportRequestId: input.exportJob.export_request_id,
      exportKey: input.exportJob.export_key,
      exportType: input.exportJob.export_type,
      exportFormat: input.exportJob.export_format,
      frameworkKey: input.exportJob.framework_key,
      controlKey: input.exportJob.control_key,
      periodStart: input.exportJob.period_start,
      periodEnd: input.exportJob.period_end,
      generatedAt: new Date().toISOString(),
      generatedByWorkerId: input.workerId,
      watermark: input.exportJob.watermark,
      itemCount: input.items.length
    },
    items: input.items.map((item) => ({
      itemType: item.item_type,
      sourceType: item.source_type,
      sourceId: item.source_id,
      frameworkKey: item.framework_key,
      controlKey: item.control_key,
      policyKey: item.policy_key,
      evidenceKey: item.evidence_key,
      itemStatus: item.item_status,
      redactionLevel: item.redaction_level,
      payload: item.payload,
      createdAt: item.created_at
    }))
  };
}

async function writeExportFile(input: {
  exportJob: Record<string, unknown>;
  body: string;
}) {
  await fs.mkdir(exportRoot, { recursive: true });

  const extension = input.exportJob.export_format === "csv" ? "csv" : "json";
  const fileName = `${safeFilePart(String(input.exportJob.export_key ?? "export"))}.${extension}`;
  const filePath = path.join(exportRoot, fileName);

  await fs.writeFile(filePath, input.body, "utf8");

  return {
    filePath,
    storageUri: `file://${filePath}`
  };
}

export async function runAdminSecurityAuditorExportGenerationJob() {
  const workerId = getWorkerId();

  const { data: jobs, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_auditor_exports",
    {
      p_batch_size: 5,
      p_worker_id: workerId,
      p_metadata: {
        source: "admin-security-auditor-export-generation-worker"
      }
    }
  );

  if (claimError) throw claimError;

  const claimed = Array.isArray(jobs) ? jobs : [];

  for (const job of claimed as Record<string, unknown>[]) {
    try {
      const { data: itemCount, error: buildError } = await supabaseAdmin.rpc(
        "build_admin_security_auditor_export_items",
        {
          p_export_request_id: job.export_request_id,
          p_metadata: {
            workerId,
            source: "admin-security-auditor-export-generation-worker"
          }
        }
      );

      if (buildError) throw buildError;

      const items = await loadExportItems(String(job.export_request_id));
      let body: string;

      if (job.export_format === "csv") {
        body = [`# ${String(job.watermark ?? "")}`, toCsv(items)].join("\n");
      } else if (job.export_format === "pdf") {
        body = JSON.stringify(
          {
            warning:
              "PDF rendering is not enabled in this worker. This is a JSON evidence payload for PDF pipeline ingestion.",
            ...buildJsonBundle({
              exportJob: job,
              items,
              workerId
            })
          },
          null,
          2
        );
      } else {
        body = JSON.stringify(
          buildJsonBundle({
            exportJob: job,
            items,
            workerId
          }),
          null,
          2
        );
      }

      const checksum = sha256(body);
      const payloadBytes = Buffer.byteLength(body, "utf8");
      const { storageUri } = await writeExportFile({ exportJob: job, body });

      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_admin_security_auditor_export",
        {
          p_export_request_id: job.export_request_id,
          p_storage_uri: storageUri,
          p_checksum_sha256: checksum,
          p_payload_bytes: payloadBytes,
          p_item_count: Number(itemCount ?? items.length),
          p_worker_id: workerId,
          p_metadata: {
            workerId,
            source: "admin-security-auditor-export-generation-worker"
          }
        }
      );

      if (completeError) throw completeError;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "unknown auditor export generation error";

      await supabaseAdmin.rpc("fail_admin_security_auditor_export", {
        p_export_request_id: job.export_request_id,
        p_error: message,
        p_worker_id: workerId,
        p_metadata: {
          workerId,
          source: "admin-security-auditor-export-generation-worker"
        }
      });
    }
  }

  return {
    claimed: claimed.length
  };
}
