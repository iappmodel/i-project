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

function getWorkerId() {
  return process.env.WORKER_ID ?? `worker-${process.pid}`;
}

function getArchiveRoot() {
  return process.env.ADMIN_SECURITY_ARCHIVE_LOCAL_DIR ?? "/tmp/admin-security-archives";
}

function stableJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function sha256(input: Buffer | string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function safeFilename(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function writeLocalArchive(input: {
  archiveKey: string;
  payload: unknown;
}) {
  const root = getArchiveRoot();
  await fs.mkdir(root, { recursive: true });

  const body = stableJson(input.payload);
  const checksum = sha256(body);
  const filename = `${safeFilename(input.archiveKey)}.${checksum.slice(0, 12)}.json`;
  const filePath = path.join(root, filename);

  await fs.writeFile(filePath, body, "utf8");

  return {
    storageUri: `file://${filePath}`,
    checksumSha256: checksum,
    payloadBytes: Buffer.byteLength(body, "utf8")
  };
}

async function writeS3ArchiveStub(input: {
  archiveKey: string;
  payload: unknown;
}) {
  if (process.env.ADMIN_SECURITY_ARCHIVE_S3_STUB_OK !== "true") {
    throw new Error("S3 archive export is not configured");
  }

  return writeLocalArchive(input);
}

async function exportArchive(input: {
  storageProvider: string;
  archiveKey: string;
  payload: Record<string, unknown>;
}) {
  if (input.storageProvider === "local_file") {
    return writeLocalArchive({
      archiveKey: input.archiveKey,
      payload: input.payload
    });
  }

  if (
    input.storageProvider === "s3" ||
    input.storageProvider === "r2" ||
    input.storageProvider === "gcs"
  ) {
    return writeS3ArchiveStub({
      archiveKey: input.archiveKey,
      payload: input.payload
    });
  }

  if (input.storageProvider === "external_archive_stub") {
    return writeLocalArchive({
      archiveKey: input.archiveKey,
      payload: input.payload
    });
  }

  throw new Error(`unsupported archive storage provider: ${input.storageProvider}`);
}

type ClaimedArchiveExportJob = {
  job_id: string;
  archive_manifest_id: string;
  storage_provider: string;
};

export async function runAdminSecurityArchiveExportJob() {
  const workerId = getWorkerId();

  const { data: jobs, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_archive_export_jobs",
    {
      p_batch_size: 5,
      p_worker_id: workerId,
      p_metadata: {
        source: "admin-security-archive-export-worker"
      }
    }
  );

  if (claimError) throw claimError;

  const items = (jobs as ClaimedArchiveExportJob[] | null) ?? [];

  for (const job of items) {
    try {
      await supabaseAdmin.rpc("mark_admin_security_archive_export_running", {
        p_job_id: job.job_id,
        p_metadata: {
          workerId
        }
      });

      const { data: payload, error: payloadError } = await supabaseAdmin.rpc(
        "build_admin_security_archive_payload",
        {
          p_archive_manifest_id: job.archive_manifest_id
        }
      );

      if (payloadError) throw payloadError;

      const typedPayload = payload as Record<string, unknown> & {
        archive_key?: string;
        record_count?: number;
      };
      const archiveKey = String(
        typedPayload.archive_key ?? `archive-${job.archive_manifest_id}`
      );
      const recordCount = Number(typedPayload.record_count ?? 0);

      const result = await exportArchive({
        storageProvider: job.storage_provider,
        archiveKey,
        payload: typedPayload
      });

      await supabaseAdmin.rpc("complete_admin_security_archive_export_job", {
        p_job_id: job.job_id,
        p_storage_uri: result.storageUri,
        p_checksum_sha256: result.checksumSha256,
        p_payload_bytes: result.payloadBytes,
        p_record_count: recordCount,
        p_metadata: {
          workerId,
          source: "admin-security-archive-export-worker"
        }
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "unknown archive export error";

      await supabaseAdmin.rpc("fail_admin_security_archive_export_job", {
        p_job_id: job.job_id,
        p_error: errorMessage,
        p_retry_seconds: 900,
        p_metadata: {
          workerId
        }
      });
    }
  }

  return {
    claimed: items.length
  };
}
