import { supabaseAdmin } from "../../config/supabase";

export async function observeSessionContext(input: {
  userId: string;
  requestId: string;

  deviceFingerprintHash: string;
  platform: string;
  appVersion?: string;
  deviceModel?: string;
  osVersion?: string;

  appSessionId?: string;

  ipHash?: string;
  ipCountry?: string;
  ipRegion?: string;
  ipCity?: string;
  asn?: string;

  networkType: string;

  isVpn?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
  isHosting?: boolean;

  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("observe_user_session_context", {
    p_user_id: input.userId,
    p_device_fingerprint_hash: input.deviceFingerprintHash,
    p_platform: input.platform,
    p_app_version: input.appVersion ?? null,
    p_device_model: input.deviceModel ?? null,
    p_os_version: input.osVersion ?? null,
    p_app_session_id: input.appSessionId ?? null,
    p_request_id: input.requestId,
    p_ip_hash: input.ipHash ?? null,
    p_ip_country: input.ipCountry ?? null,
    p_ip_region: input.ipRegion ?? null,
    p_ip_city: input.ipCity ?? null,
    p_asn: input.asn ?? null,
    p_network_type: input.networkType,
    p_is_vpn: input.isVpn ?? null,
    p_is_proxy: input.isProxy ?? null,
    p_is_tor: input.isTor ?? null,
    p_is_hosting: input.isHosting ?? null,
    p_metadata: {
      requestId: input.requestId,
      ...(input.metadata ?? {})
    }
  });

  if (error) throw error;

  return {
    sessionRiskEventId: String(data)
  };
}
