import crypto from "node:crypto";
import fs from "node:fs/promises";
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

function sha256(input: Buffer | string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function filePathFromStorageUri(storageUri: string) {
  if (!storageUri.startsWith("file://")) {
    throw new Error(`unsupported verification storage URI: ${storageUri}`);
  }

  return storageUri.slice("file://".length);
}

async function readArchive(storageUri: string) {
  const filePath = filePathFromStorageUri(storageUri);
  return fs.readFile(filePath, "utf8");
}

function parseArchivePayload(body: string) {
  const parsed = JSON.parse(body) as { records?: unknown };
  const records = Array.isArray(parsed.records) ? parsed.records : null;

  if (!records) {
    throw new Error("archive payload records must be an array");
  }

  return {
    payload: parsed,
    recordCount: records.length
  };
}

type ClaimedVerificationJob = {
  job_id: string;
  storage_uri: string;
};

export async function runAdminSecurityArchiveVerificationJob() {
  const workerId = getWorkerId();

  const { data: jobs, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_archive_verification_jobs",
    {
      p_batch_size: 5,
      p_worker_id: workerId,
      p_metadata: {
        source: "admin-security-archive-verification-worker"
      }
    }
  );

  if (claimError) throw claimError;

  const items = (jobs as ClaimedVerificationJob[] | null) ?? [];

  for (const job of items) {
    try {
      await supabaseAdmin.rpc("mark_admin_security_archive_verification_running", {
        p_job_id: job.job_id,
        p_metadata: {
          workerId
        }
      });

      const body = await readArchive(job.storage_uri);
      const checksum = sha256(body);

      let recordCount = 0;
      let parseOk = false;

      try {
        const parsed = parseArchivePayload(body);
        recordCount = parsed.recordCount;
        parseOk = true;
      } catch {
        parseOk = false;
      }

      await supabaseAdmin.rpc("complete_admin_security_archive_verification_job", {
        p_job_id: job.job_id,
        p_actual_checksum_sha256: checksum,
        p_actual_record_count: recordCount,
        p_payload_parse_ok: parseOk,
        p_metadata: {
          workerId,
          source: "admin-security-archive-verification-worker"
        }
      });
    } catch (err: unknown) {
      await supabaseAdmin.rpc("fail_admin_security_archive_verification_job", {
        p_job_id: job.job_id,
        p_error: err instanceof Error ? err.message : "unknown archive verification error",
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
