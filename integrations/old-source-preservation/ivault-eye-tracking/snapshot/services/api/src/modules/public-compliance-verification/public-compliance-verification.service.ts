import crypto from "node:crypto";
import { supabaseAdmin } from "../../config/supabase";

const signingSecret =
  process.env.COMPLIANCE_REPORT_SIGNING_SECRET ?? "dev-only-change-me";
const questionnaireExportSigningSecret =
  process.env.QUESTIONNAIRE_EXPORT_SIGNING_SECRET ?? "dev-only-change-me";
const auditorPacketSigningSecret =
  process.env.AUDITOR_PACKET_SIGNING_SECRET ?? "dev-only-change-me";

function hmacSha256(input: string) {
  return crypto.createHmac("sha256", signingSecret).update(input).digest("hex");
}

function hmacSha256WithSecret(input: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(input).digest("hex");
}

export async function verifyPublicComplianceReport(input: {
  reportKey: string;
  checksumSha256: string;
  signature: string;
  periodSealChecksumSha256: string;
  requesterIp?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data: report, error: reportError } = await supabaseAdmin
    .from("admin_security_compliance_report_public_verification")
    .select(
      "report_key, signature_algorithm, signing_key_version, period_seal_checksum_sha256"
    )
    .eq("report_key", input.reportKey)
    .maybeSingle();

  if (reportError) throw reportError;

  let signatureMatch = false;

  if (report) {
    const signaturePayload = JSON.stringify({
      reportKey: input.reportKey,
      checksumSha256: input.checksumSha256,
      sealChecksumSha256: input.periodSealChecksumSha256,
      signingKeyVersion: report.signing_key_version,
      signatureAlgorithm: report.signature_algorithm
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
    "verify_admin_security_compliance_report_public",
    {
      p_report_key: input.reportKey,
      p_checksum_sha256: input.checksumSha256,
      p_signature: input.signature,
      p_period_seal_checksum_sha256: input.periodSealChecksumSha256,
      p_signature_match: signatureMatch,
      p_requester_ip: input.requesterIp ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "public-compliance-verification"
      }
    }
  );

  if (error) throw error;

  return data;
}

export async function getComplianceVerificationIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_compliance_report_verification_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function verifyPublicQuestionnaireExport(input: {
  exportKey: string;
  checksumSha256: string;
  signature: string;
  requesterIp?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data: exportRecord, error: exportError } = await supabaseAdmin
    .from("admin_security_questionnaire_export_public_verification")
    .select(
      "export_key, project_key, customer_name, signature_algorithm, signing_key_version"
    )
    .eq("export_key", input.exportKey)
    .maybeSingle();

  if (exportError) throw exportError;

  let signatureMatch = false;

  if (exportRecord) {
    const signaturePayload = JSON.stringify({
      exportKey: input.exportKey,
      checksumSha256: input.checksumSha256,
      projectKey: exportRecord.project_key,
      customerName: exportRecord.customer_name,
      signingKeyVersion: exportRecord.signing_key_version,
      signatureAlgorithm: exportRecord.signature_algorithm
    });

    const expectedSignature = hmacSha256WithSecret(
      signaturePayload,
      questionnaireExportSigningSecret
    );

    signatureMatch =
      expectedSignature.length === input.signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(input.signature)
      );
  }

  const { data, error } = await supabaseAdmin.rpc(
    "verify_admin_security_questionnaire_export_public",
    {
      p_export_key: input.exportKey,
      p_checksum_sha256: input.checksumSha256,
      p_signature: input.signature,
      p_signature_match: signatureMatch,
      p_requester_ip: input.requesterIp ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "public-questionnaire-export-verification"
      }
    }
  );

  if (error) throw error;

  return data;
}

export async function getQuestionnaireExportVerificationIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_questionnaire_export_verification_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function verifyPublicDisclosurePackage(input: {
  packageKey: string;
  checksumSha256?: string;
  signature?: string;
  requesterIp?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "verify_admin_security_disclosure_package_public",
    {
      p_package_key: input.packageKey,
      p_checksum_sha256: input.checksumSha256 ?? null,
      p_signature: input.signature ?? null,
      p_signature_match: true,
      p_requester_ip: input.requesterIp ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "public-disclosure-package-verification"
      }
    }
  );

  if (error) throw error;

  return data;
}

export async function verifyPublicAuditorPacketManifest(input: {
  manifestKey: string;
  checksumSha256: string;
  signature: string;
  requesterIp?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data: manifestRecord, error: manifestError } = await supabaseAdmin
    .from("admin_security_auditor_packet_manifest_public_verification")
    .select(
      "manifest_key, packet_key, portal_key, participant_email, signature_algorithm, signing_key_version"
    )
    .eq("manifest_key", input.manifestKey)
    .maybeSingle();

  if (manifestError) throw manifestError;

  let signatureMatch = false;

  if (manifestRecord) {
    const signaturePayload = JSON.stringify({
      manifestKey: input.manifestKey,
      checksumSha256: input.checksumSha256,
      packetKey: manifestRecord.packet_key,
      portalKey: manifestRecord.portal_key,
      auditorEmail: manifestRecord.participant_email,
      signingKeyVersion: manifestRecord.signing_key_version,
      signatureAlgorithm: manifestRecord.signature_algorithm
    });

    const expectedSignature = hmacSha256WithSecret(
      signaturePayload,
      auditorPacketSigningSecret
    );

    signatureMatch =
      expectedSignature.length === input.signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(input.signature)
      );
  }

  const { data, error } = await supabaseAdmin.rpc(
    "verify_admin_security_auditor_packet_manifest_public",
    {
      p_manifest_key: input.manifestKey,
      p_checksum_sha256: input.checksumSha256,
      p_signature: input.signature,
      p_signature_match: signatureMatch,
      p_requester_ip: input.requesterIp ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "public-auditor-packet-manifest-verification"
      }
    }
  );

  if (error) throw error;

  return data;
}
