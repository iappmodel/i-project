import type { Request } from "express";
import { supabaseAdmin } from "../../config/supabase";
import {
  buildDeviceFingerprintHash,
  getRequestIp,
  getUserAgent,
  hashAdminRiskValue
} from "./admin-risk.hash";

function parseBrowserName(userAgent: string) {
  if (userAgent.includes("Edg")) return "Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Firefox")) return "Firefox";
  return "Unknown";
}

function parseOsName(userAgent: string) {
  if (userAgent.includes("Mac OS")) return "macOS";
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Linux")) return "Linux";
  if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS";
  if (userAgent.includes("Android")) return "Android";
  return "Unknown";
}

export async function createAdminRequestRiskContext(input: {
  req: Request;
  adminAuthUserId: string;
}) {
  const requestId = input.req.requestId;
  const userAgent = getUserAgent(input.req);
  const ip = getRequestIp(input.req);

  const userAgentHash = userAgent ? hashAdminRiskValue(userAgent) : null;
  const ipHash = ip ? hashAdminRiskValue(ip) : null;
  const deviceFingerprintHash = buildDeviceFingerprintHash(input.req);

  const { data: deviceId, error: deviceError } = await supabaseAdmin.rpc(
    "register_admin_device_observation",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_device_fingerprint_hash: deviceFingerprintHash,
      p_platform: "web",
      p_browser_name: parseBrowserName(userAgent),
      p_browser_version: null,
      p_os_name: parseOsName(userAgent),
      p_os_version: null,
      p_request_id: requestId ?? null,
      p_metadata: {}
    }
  );

  if (deviceError) throw deviceError;

  const { data: networkId, error: networkError } = await supabaseAdmin.rpc(
    "record_admin_network_observation",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_admin_device_id: deviceId,
      p_ip_hash: ipHash ?? "unknown",
      p_ip_country: null,
      p_ip_region: null,
      p_ip_city: null,
      p_asn: null,
      p_network_type: null,
      p_is_vpn: null,
      p_is_proxy: null,
      p_is_tor: null,
      p_is_hosting: null,
      p_request_id: requestId ?? null,
      p_metadata: {
        source: "api_request_context"
      }
    }
  );

  if (networkError) throw networkError;

  const { data: sessionContextId, error: sessionError } = await supabaseAdmin.rpc(
    "create_admin_session_context",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_admin_device_id: deviceId,
      p_admin_network_observation_id: networkId,
      p_request_id: requestId ?? null,
      p_session_id:
        input.req.header("x-admin-session-id") ??
        input.req.header("x-session-id") ??
        null,
      p_user_agent_hash: userAgentHash,
      p_ip_hash: ipHash,
      p_device_fingerprint_hash: deviceFingerprintHash,
      p_metadata: {
        source: "api_request_context"
      }
    }
  );

  if (sessionError) throw sessionError;

  return {
    adminDeviceId: String(deviceId),
    adminNetworkObservationId: String(networkId),
    adminSessionContextId: String(sessionContextId)
  };
}
