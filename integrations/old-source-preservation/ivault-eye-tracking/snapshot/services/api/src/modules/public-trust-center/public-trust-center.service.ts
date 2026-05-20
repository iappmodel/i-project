import crypto from "node:crypto";
import { supabaseAdmin } from "../../config/supabase";

const trustCenterSigningSecret =
  process.env.TRUST_CENTER_SIGNING_SECRET ?? "dev-only-change-me";

function hmacSha256WithSecret(input: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(input).digest("hex");
}

export async function getPublicTrustCenter(input: {
  trustCenterKey?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("get_public_trust_center", {
    p_trust_center_key: input.trustCenterKey ?? "default",
    p_request_id: input.requestId,
    p_metadata: {
      source: "public-trust-center-api"
    }
  });

  if (error) throw error;
  return data;
}

export async function listPublicTrustCenterDisclosures(input: {
  trustCenterKey?: string;
  limit?: number;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "list_public_trust_center_active_disclosures",
    {
      p_limit: input.limit ?? 100,
      p_trust_center_key: input.trustCenterKey ?? "default",
      p_request_id: input.requestId,
      p_metadata: {
        source: "public-trust-center-api"
      }
    }
  );

  if (error) throw error;
  return data;
}

export async function listPublicTrustCenterRevocations(input: {
  limit?: number;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "list_public_trust_center_revocations",
    {
      p_limit: input.limit ?? 100,
      p_request_id: input.requestId,
      p_metadata: {
        source: "public-trust-center-api"
      }
    }
  );

  if (error) throw error;
  return data;
}

export async function getLatestPublicTrustCenterManifest(input: {
  trustCenterKey?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "get_latest_public_trust_center_manifest",
    {
      p_trust_center_key: input.trustCenterKey ?? "default",
      p_request_id: input.requestId,
      p_metadata: {
        source: "public-trust-center-api"
      }
    }
  );

  if (error) throw error;
  return data;
}

export async function verifyTrustCenterManifest(input: {
  manifestKey: string;
  checksumSha256: string;
  signature: string;
  requesterIp?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data: manifestRecord, error: manifestError } = await supabaseAdmin
    .from("admin_security_public_trust_center_manifest_verification")
    .select(
      "manifest_key, trust_center_key, signature_algorithm, signing_key_version"
    )
    .eq("manifest_key", input.manifestKey)
    .maybeSingle();

  if (manifestError) throw manifestError;

  let signatureMatch = false;

  if (manifestRecord) {
    const signaturePayload = JSON.stringify({
      manifestKey: input.manifestKey,
      checksumSha256: input.checksumSha256,
      trustCenterKey: manifestRecord.trust_center_key,
      signingKeyVersion: manifestRecord.signing_key_version,
      signatureAlgorithm: manifestRecord.signature_algorithm
    });

    const expectedSignature = hmacSha256WithSecret(
      signaturePayload,
      trustCenterSigningSecret
    );

    signatureMatch =
      expectedSignature.length === input.signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(input.signature)
      );
  }

  const { data, error } = await supabaseAdmin.rpc(
    "verify_public_trust_center_manifest",
    {
      p_manifest_key: input.manifestKey,
      p_checksum_sha256: input.checksumSha256,
      p_signature: input.signature,
      p_signature_match: signatureMatch,
      p_requester_ip: input.requesterIp ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "public-trust-center-manifest-verification"
      }
    }
  );

  if (error) throw error;
  return data;
}
