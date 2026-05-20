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

const signingSecret = process.env.AUDITOR_PACKET_SIGNING_SECRET ?? "dev-only-change-me";
const exportRoot = process.env.AUDITOR_PACKET_MANIFEST_ROOT ?? "/tmp/i-auditor-manifests";

function getWorkerId() {
  return process.env.WORKER_ID ?? `worker-${process.pid}`;
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hmacSha256(input: string) {
  return crypto.createHmac("sha256", signingSecret).update(input).digest("hex");
}

function safeFilePart(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160);
}

async function loadActiveSigningKey() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_auditor_packet_signing_keys")
    .select("*")
    .eq("status", "active")
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("active auditor packet signing key not found");

  return data;
}

async function loadPacketItems(evidencePacketId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_auditor_evidence_packet_items")
    .select("*")
    .eq("evidence_packet_id", evidencePacketId)
    .eq("auditor_safe", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function loadPortal(manifest: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_auditor_portals")
    .select("*")
    .eq("id", manifest.auditor_portal_id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("auditor portal not found");

  return data;
}

async function loadPacket(manifest: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_auditor_evidence_packets")
    .select("*")
    .eq("id", manifest.evidence_packet_id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("auditor evidence packet not found");

  return data;
}

async function loadManifestRow(manifestId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_auditor_packet_manifests")
    .select("*")
    .eq("id", manifestId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("auditor packet manifest not found");

  return data;
}

async function writeManifestFile(input: { manifestKey: string; body: string; format: string }) {
  await fs.mkdir(exportRoot, { recursive: true });
  const extension =
    input.format === "markdown" ? "md" : input.format === "pdf" ? "pdf" : input.format === "zip" ? "zip" : "json";
  const fileName = `${safeFilePart(input.manifestKey)}.${extension}`;
  const filePath = path.join(exportRoot, fileName);
  await fs.writeFile(filePath, input.body, "utf8");
  return { storageUri: `file://${filePath}` };
}

function renderManifestJson(input: {
  manifest: Record<string, any>;
  portal: Record<string, any>;
  packet: Record<string, any>;
  items: Record<string, any>[];
  signingKey: Record<string, any>;
}) {
  return {
    manifestKey: input.manifest.manifest_key,
    manifestType: input.manifest.manifest_type,
    exportFormat: input.manifest.export_format,
    generatedAt: new Date().toISOString(),
    portal: {
      portalKey: input.portal.portal_key,
      auditorName: input.portal.auditor_name,
      auditorFirm: input.portal.auditor_firm,
      customerName: input.portal.customer_name,
      customerDomain: input.portal.customer_domain,
      auditType: input.portal.audit_type,
      auditScope: input.portal.audit_scope,
      accessExpiresAt: input.portal.access_expires_at
    },
    packet: {
      packetKey: input.packet.packet_key,
      packetType: input.packet.packet_type,
      title: input.packet.title,
      summary: input.packet.summary,
      scope: input.packet.scope,
      itemCount: input.items.length
    },
    participant: {
      auditorEmail: input.manifest.auditor_email,
      auditorName: input.manifest.auditor_name
    },
    items: input.items.map((item) => ({
      itemType: item.item_type,
      itemKey: item.item_key,
      displayTitle: item.display_title,
      displaySummary: item.display_summary,
      controlKey: item.control_key,
      frameworkKey: item.framework_key,
      checksumSha256: item.checksum_sha256,
      signature: item.signature,
      signedAt: item.signed_at,
      downloadable: item.allow_download,
      sortOrder: item.sort_order
    })),
    watermark: input.manifest.watermark,
    signing: {
      signatureAlgorithm: input.signingKey.algorithm,
      signingKeyVersion: input.signingKey.key_version
    }
  };
}

function renderMarkdown(manifestJson: Record<string, any>) {
  return [
    `# ${manifestJson.packet.title}`,
    "",
    manifestJson.packet.summary,
    "",
    "## Audit Scope",
    "",
    manifestJson.portal.auditScope,
    "",
    "## Packet",
    "",
    `- Packet key: ${manifestJson.packet.packetKey}`,
    `- Manifest key: ${manifestJson.manifestKey}`,
    `- Auditor: ${manifestJson.participant.auditorEmail}`,
    `- Customer: ${manifestJson.portal.customerName ?? "N/A"}`,
    "",
    "## Items",
    "",
    ...manifestJson.items.flatMap((item: any, index: number) => [
      `### ${index + 1}. ${item.displayTitle}`,
      "",
      item.displaySummary,
      "",
      `- Type: ${item.itemType}`,
      item.controlKey ? `- Control: ${item.controlKey}` : "",
      item.frameworkKey ? `- Framework: ${item.frameworkKey}` : "",
      item.checksumSha256 ? `- Checksum: ${item.checksumSha256}` : "",
      item.signature ? `- Signature: ${item.signature}` : "",
      ""
    ]),
    "---",
    "",
    `Watermark: ${manifestJson.watermark}`
  ]
    .filter(Boolean)
    .join("\n");
}

export async function runAdminSecurityAuditorPacketManifestGenerationJob() {
  const workerId = getWorkerId();

  const { data: jobs, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_auditor_packet_manifests",
    {
      p_batch_size: 5,
      p_worker_id: workerId,
      p_metadata: {
        source: "admin-security-auditor-packet-manifest-generation-worker"
      }
    }
  );

  if (claimError) throw claimError;
  const claimed = Array.isArray(jobs) ? jobs : [];

  for (const job of claimed as Record<string, any>[]) {
    try {
      const manifest = await loadManifestRow(job.manifest_id);
      const portal = await loadPortal(manifest);
      const packet = await loadPacket(manifest);
      const items = await loadPacketItems(String(manifest.evidence_packet_id));
      const signingKey = await loadActiveSigningKey();

      const manifestJson = renderManifestJson({
        manifest,
        portal,
        packet,
        items,
        signingKey
      });

      const unsignedBody =
        manifest.export_format === "markdown"
          ? renderMarkdown(manifestJson)
          : JSON.stringify(manifestJson, null, 2);

      const checksum = sha256(unsignedBody);
      const signaturePayload = JSON.stringify({
        manifestKey: manifest.manifest_key,
        checksumSha256: checksum,
        packetKey: packet.packet_key,
        portalKey: portal.portal_key,
        auditorEmail: manifest.auditor_email,
        signingKeyVersion: signingKey.key_version,
        signatureAlgorithm: signingKey.algorithm
      });
      const signature = hmacSha256(signaturePayload);

      const signedBody =
        manifest.export_format === "markdown"
          ? [
              unsignedBody,
              "",
              "---",
              "",
              "## Signature",
              "",
              `- Algorithm: ${signingKey.algorithm}`,
              `- Signing key version: ${signingKey.key_version}`,
              `- Manifest checksum: \`${checksum}\``,
              `- Signature: \`${signature}\``
            ].join("\n")
          : JSON.stringify({ ...manifestJson, checksumSha256: checksum, signature }, null, 2);

      const finalChecksum = sha256(signedBody);
      const payloadBytes = Buffer.byteLength(signedBody, "utf8");
      const { storageUri } = await writeManifestFile({
        manifestKey: String(manifest.manifest_key),
        body: signedBody,
        format: String(manifest.export_format)
      });

      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_admin_security_auditor_packet_manifest",
        {
          p_manifest_id: manifest.id,
          p_manifest_json: {
            ...manifestJson,
            unsignedChecksumSha256: checksum,
            checksumSha256: finalChecksum,
            signature
          },
          p_storage_uri: storageUri,
          p_checksum_sha256: finalChecksum,
          p_payload_bytes: payloadBytes,
          p_signature: signature,
          p_worker_id: workerId,
          p_metadata: {
            workerId,
            source: "admin-security-auditor-packet-manifest-generation-worker",
            unsignedChecksumSha256: checksum
          }
        }
      );
      if (completeError) throw completeError;
    } catch (err: unknown) {
      await supabaseAdmin.rpc("fail_admin_security_auditor_packet_manifest", {
        p_manifest_id: job.manifest_id,
        p_error:
          err instanceof Error
            ? err.message
            : "unknown auditor packet manifest generation error",
        p_worker_id: workerId,
        p_metadata: {
          workerId,
          source: "admin-security-auditor-packet-manifest-generation-worker"
        }
      });
    }
  }

  return { claimed: claimed.length };
}
