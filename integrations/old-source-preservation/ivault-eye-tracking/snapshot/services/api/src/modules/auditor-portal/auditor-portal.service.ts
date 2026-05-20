import { supabaseAdmin } from "../../config/supabase";

export async function getAuditorPortal(input: {
  authUserId: string;
  portalKey: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "list_auditor_portal_for_participant",
    {
      p_auth_user_id: input.authUserId,
      p_portal_key: input.portalKey,
      p_request_id: input.requestId,
      p_metadata: { source: "auditor-portal" }
    }
  );

  if (error) throw error;
  return data;
}

export async function getAuditorEvidencePacket(input: {
  authUserId: string;
  portalKey: string;
  packetKey: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "list_auditor_evidence_packet_for_participant",
    {
      p_auth_user_id: input.authUserId,
      p_portal_key: input.portalKey,
      p_packet_key: input.packetKey,
      p_request_id: input.requestId,
      p_metadata: { source: "auditor-portal-packet" }
    }
  );

  if (error) throw error;
  return data;
}

export async function acknowledgeAuditorItem(input: {
  authUserId: string;
  portalKey: string;
  acknowledgementType: string;
  sourceType: string;
  sourceId: string;
  statement: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "acknowledge_auditor_portal_item",
    {
      p_auth_user_id: input.authUserId,
      p_portal_key: input.portalKey,
      p_acknowledgement_type: input.acknowledgementType,
      p_source_type: input.sourceType,
      p_source_id: input.sourceId,
      p_statement: input.statement,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return { acknowledgementId: String(data) };
}

export async function submitAuditorQuestionService(input: {
  authUserId: string;
  portalKey: string;
  subject: string;
  questionText: string;
  priority?: string;
  category?: string;
  relatedSourceType?: string;
  relatedSourceId?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("submit_auditor_question", {
    p_auth_user_id: input.authUserId,
    p_portal_key: input.portalKey,
    p_subject: input.subject,
    p_question_text: input.questionText,
    p_priority: input.priority ?? "medium",
    p_category: input.category ?? null,
    p_related_source_type: input.relatedSourceType ?? null,
    p_related_source_id: input.relatedSourceId ?? null,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;
  return { auditorQuestionId: String(data), status: "open" };
}

export async function requestAuditorPacketManifest(input: {
  authUserId: string;
  portalKey: string;
  packetKey: string;
  exportFormat?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "request_auditor_packet_manifest_for_participant",
    {
      p_auth_user_id: input.authUserId,
      p_portal_key: input.portalKey,
      p_packet_key: input.packetKey,
      p_export_format: input.exportFormat ?? "json",
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    auditorPacketManifestId: String(data),
    status: "pending"
  };
}

export async function registerAuditorPacketManifestDownload(input: {
  authUserId: string;
  portalKey: string;
  manifestKey: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "register_auditor_packet_manifest_download",
    {
      p_auth_user_id: input.authUserId,
      p_portal_key: input.portalKey,
      p_manifest_key: input.manifestKey,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return data;
}
