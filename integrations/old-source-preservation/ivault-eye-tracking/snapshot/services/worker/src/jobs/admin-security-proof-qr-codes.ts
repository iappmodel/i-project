import crypto from "node:crypto";
import QRCode from "qrcode";
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

export async function runAdminSecurityProofQrCodeJob() {
  const workerId = getWorkerId();

  const { data: jobs, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_proof_qr_code_jobs",
    {
      p_batch_size: 10,
      p_worker_id: workerId,
      p_metadata: {
        source: "admin-security-proof-qr-code-worker"
      }
    }
  );

  if (claimError) throw claimError;

  const claimed = jobs ?? [];

  for (const job of claimed) {
    try {
      const svg = await QRCode.toString(job.qr_payload, {
        type: "svg",
        width: job.size_px,
        margin: 2
      });

      const checksum = sha256(svg);
      const storageUri = `proof-qr://${job.qr_code_key}/qr.svg`;

      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_admin_security_proof_qr_code_generation",
        {
          p_qr_code_id: job.qr_code_id,
          p_qr_job_id: job.qr_job_id,
          p_image_storage_uri: storageUri,
          p_image_checksum_sha256: checksum,
          p_image_payload_bytes: bytes(svg),
          p_worker_id: workerId,
          p_metadata: {
            source: "admin-security-proof-qr-code-worker",
            qrFormat: job.qr_format
          }
        }
      );

      if (completeError) throw completeError;

      await supabaseAdmin.rpc("register_proof_qr_code_download_subject", {
        p_qr_code_id: job.qr_code_id,
        p_request_id: null,
        p_metadata: {
          source: "admin-security-proof-qr-code-worker"
        }
      });
    } catch (err: any) {
      await supabaseAdmin.rpc("fail_admin_security_proof_qr_code_generation", {
        p_qr_code_id: job.qr_code_id,
        p_qr_job_id: job.qr_job_id,
        p_error: err?.message ?? "unknown proof qr code generation error",
        p_worker_id: workerId,
        p_metadata: {
          source: "admin-security-proof-qr-code-worker"
        }
      });
    }
  }

  return {
    claimed: claimed.length
  };
}
