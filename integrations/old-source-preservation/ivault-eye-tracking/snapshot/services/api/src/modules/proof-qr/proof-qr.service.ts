import { supabaseAdmin } from "../../config/supabase";

export async function createProofLinkForKey(input: {
  proofType: string;
  proofKey: string;
  createQr?: boolean;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_proof_verification_link",
    {
      p_proof_type: input.proofType,
      p_proof_id: null,
      p_proof_key: input.proofKey,
      p_title: null,
      p_summary: null,
      p_base_url: process.env.PUBLIC_VERIFY_URL ?? "https://example.com/verify",
      p_expires_at: null,
      p_max_uses: null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "proof-qr-consumer-api"
      }
    }
  );

  if (error) throw error;

  let qr = null;
  if (input.createQr) {
    const { data: qrData, error: qrError } = await supabaseAdmin.rpc(
      "create_admin_security_proof_qr_code",
      {
        p_verification_link_id: data.verificationLinkId,
        p_qr_format: "svg",
        p_size_px: 512,
        p_include_logo: false,
        p_request_id: input.requestId,
        p_metadata: {
          source: "proof-qr-consumer-api"
        }
      }
    );
    if (qrError) throw qrError;
    qr = {
      proofQrCodeId: String(qrData),
      status: "pending"
    };
  }

  return {
    link: data,
    qr
  };
}
