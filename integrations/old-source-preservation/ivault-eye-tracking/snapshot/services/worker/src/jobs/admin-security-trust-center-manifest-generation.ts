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

const signingSecret = process.env.TRUST_CENTER_SIGNING_SECRET ?? "dev-only-change-me";

function getWorkerId() {
  return process.env.WORKER_ID ?? `worker-${process.pid}`;
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hmacSha256(input: string) {
  return crypto.createHmac("sha256", signingSecret).update(input).digest("hex");
}

async function loadSigningKey() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_center_signing_keys")
    .select("*")
    .eq("status", "active")
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("active trust center signing key not found");

  return data;
}

async function loadPublicTimeline(limit = 100) {
  const { data, error } = await supabaseAdmin.rpc(
    "list_public_trust_center_timeline",
    {
      p_limit: limit,
      p_trust_center_scope: null,
      p_request_id: null,
      p_metadata: {
        source: "trust-center-manifest-worker"
      }
    }
  );

  if (error) throw error;
  return data?.timeline ?? [];
}

async function loadActiveDisclosures(limit = 100) {
  const { data, error } = await supabaseAdmin.rpc(
    "list_public_trust_center_active_disclosures",
    {
      p_limit: limit,
      p_trust_center_key: "default",
      p_request_id: null,
      p_metadata: {
        source: "trust-center-manifest-worker"
      }
    }
  );

  if (error) throw error;
  return data?.items ?? [];
}

async function loadRevocations(limit = 100) {
  const { data, error } = await supabaseAdmin.rpc(
    "list_public_trust_center_revocations",
    {
      p_limit: limit,
      p_request_id: null,
      p_metadata: {
        source: "trust-center-manifest-worker"
      }
    }
  );

  if (error) throw error;
  return data?.items ?? [];
}

function renderManifest(input: {
  job: Record<string, any>;
  signingKey: Record<string, any>;
  timeline: Record<string, any>[];
  activeDisclosures: Record<string, any>[];
  revocations: Record<string, any>[];
}) {
  const now = new Date().toISOString();

  const expiringArtifacts = input.activeDisclosures.filter((item) => {
    if (!item.expiresAt) return false;
    const expiresAt = new Date(item.expiresAt).getTime();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    return expiresAt > Date.now() && expiresAt <= Date.now() + fourteenDays;
  });

  return {
    schemaVersion: "trust-center-manifest-v1",
    manifestKey: input.job.manifest_key,
    trustCenterKey: input.job.trust_center_key,
    generatedAt: now,
    organization: {
      name: input.job.organization_name,
      domain: input.job.organization_domain
    },
    trustCenter: {
      title: input.job.title,
      summary: input.job.summary,
      visibility: input.job.visibility
    },
    counts: {
      publicTimeline: input.timeline.length,
      activeDisclosures: input.activeDisclosures.length,
      activeRevocations: input.revocations.length,
      expiringArtifacts: expiringArtifacts.length
    },
    publicTimeline: input.timeline,
    activeDisclosures: input.activeDisclosures,
    activeRevocations: input.revocations,
    expiringArtifacts,
    verification: {
      signingKeyVersion: input.signingKey.key_version,
      signatureAlgorithm: input.signingKey.algorithm
    },
    watermark: input.job.watermark
  };
}

async function writeManifestFile(input: { manifestKey: string; body: string }) {
  void input.body;
  return {
    storageUri: `file:///tmp/${input.manifestKey}.json`
  };
}

export async function runAdminSecurityTrustCenterManifestGenerationJob() {
  const workerId = getWorkerId();

  const { data: jobs, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_trust_center_manifests",
    {
      p_batch_size: 5,
      p_worker_id: workerId,
      p_metadata: {
        source: "admin-security-trust-center-manifest-generation-worker"
      }
    }
  );

  if (claimError) throw claimError;

  const claimed = jobs ?? [];

  for (const job of claimed) {
    try {
      const signingKey = await loadSigningKey();
      const timeline = await loadPublicTimeline(100);
      const activeDisclosures = await loadActiveDisclosures(100);
      const revocations = await loadRevocations(100);

      const manifest = renderManifest({
        job,
        signingKey,
        timeline,
        activeDisclosures,
        revocations
      });

      const unsignedBody = JSON.stringify(manifest, null, 2);
      const checksum = sha256(unsignedBody);

      const signaturePayload = JSON.stringify({
        manifestKey: job.manifest_key,
        checksumSha256: checksum,
        trustCenterKey: job.trust_center_key,
        signingKeyVersion: signingKey.key_version,
        signatureAlgorithm: signingKey.algorithm
      });

      const signature = hmacSha256(signaturePayload);

      const signedManifest = {
        ...manifest,
        checksumSha256: checksum,
        signature
      };

      const signedBody = JSON.stringify(signedManifest, null, 2);
      const finalChecksum = sha256(signedBody);
      const payloadBytes = Buffer.byteLength(signedBody, "utf8");

      const { storageUri } = await writeManifestFile({
        manifestKey: job.manifest_key,
        body: signedBody
      });

      const expiringArtifacts = activeDisclosures.filter((item: any) => {
        if (!item.expiresAt) return false;
        const expiresAt = new Date(item.expiresAt).getTime();
        const fourteenDays = 14 * 24 * 60 * 60 * 1000;
        return expiresAt > Date.now() && expiresAt <= Date.now() + fourteenDays;
      });

      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_admin_security_trust_center_manifest",
        {
          p_manifest_id: job.manifest_id,
          p_manifest_json: {
            ...signedManifest,
            unsignedChecksumSha256: checksum,
            checksumSha256: finalChecksum
          },
          p_storage_uri: storageUri,
          p_checksum_sha256: finalChecksum,
          p_payload_bytes: payloadBytes,
          p_signature: signature,
          p_public_timeline_count: timeline.length,
          p_active_disclosure_count: activeDisclosures.length,
          p_active_revocation_count: revocations.length,
          p_expiring_artifact_count: expiringArtifacts.length,
          p_worker_id: workerId,
          p_metadata: {
            workerId,
            source: "admin-security-trust-center-manifest-generation-worker",
            unsignedChecksumSha256: checksum
          }
        }
      );

      if (completeError) throw completeError;
    } catch (err: any) {
      await supabaseAdmin.rpc("fail_admin_security_trust_center_manifest", {
        p_manifest_id: job.manifest_id,
        p_error: err?.message ?? "unknown trust center manifest generation error",
        p_worker_id: workerId,
        p_metadata: {
          workerId,
          source: "admin-security-trust-center-manifest-generation-worker"
        }
      });
    }
  }

  return {
    claimed: claimed.length
  };
}
