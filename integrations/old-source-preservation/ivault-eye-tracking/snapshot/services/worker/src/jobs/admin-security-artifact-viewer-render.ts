import crypto from "crypto";
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

function renderMetadataOnly(job: any) {
  return [
    {
      itemKey: "metadata",
      itemType: "metadata",
      title: "Artifact metadata",
      summary: "Secure preview metadata.",
      contentJson: {
        sourceType: job.source_type,
        sourceId: job.source_id,
        artifactType: job.artifact_type,
        artifactKey: job.artifact_key,
        inputChecksumSha256: job.input_checksum_sha256,
        renderMode: job.render_mode,
        redactionPolicy: job.redaction_policy
      },
      sortOrder: 0
    }
  ];
}

function renderManifest(job: any) {
  return [
    {
      itemKey: "manifest-overview",
      itemType: "manifest_section",
      sectionKey: "overview",
      sectionTitle: "Manifest Overview",
      title: "Manifest Overview",
      summary: "Signed manifest preview.",
      contentJson: {
        artifactKey: job.artifact_key,
        checksumSha256: job.input_checksum_sha256,
        sourceType: job.source_type,
        sourceId: job.source_id
      },
      sortOrder: 0
    }
  ];
}

function renderPackageSummary(job: any) {
  return [
    {
      itemKey: "package-summary",
      itemType: "package_item",
      sectionKey: "summary",
      sectionTitle: "Package Summary",
      title: "Package Summary",
      summary: "Disclosure package preview.",
      contentMarkdown: [
        `# ${job.artifact_key ?? "Package"}`,
        "",
        "This is a safe package-level preview. Raw file download requires a separate download grant."
      ].join("\n"),
      sortOrder: 0
    }
  ];
}

function renderItemsForJob(job: any) {
  if (job.render_mode === "manifest") return renderManifest(job);
  if (job.render_mode === "package_summary") return renderPackageSummary(job);
  return renderMetadataOnly(job);
}

export async function runAdminSecurityArtifactViewerRenderJob() {
  const workerId = getWorkerId();

  const { data: jobs, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_artifact_viewer_render_jobs",
    {
      p_batch_size: 10,
      p_worker_id: workerId,
      p_metadata: {
        source: "admin-security-artifact-viewer-render-worker"
      }
    }
  );

  if (claimError) throw claimError;

  const claimed = jobs ?? [];

  for (const job of claimed) {
    try {
      const items = renderItemsForJob(job).slice(0, job.max_preview_pages ?? 50);

      let pageCount = 0;

      for (const item of items) {
        const payload = JSON.stringify(item);
        const checksum = sha256(payload);

        if (item.itemType === "page") pageCount += 1;

        const { error: itemError } = await supabaseAdmin.rpc(
          "upsert_admin_security_artifact_viewer_item",
          {
            p_viewer_subject_id: job.viewer_subject_id,
            p_render_job_id: job.render_job_id,
            p_item_key: item.itemKey,
            p_item_type: item.itemType,
            p_page_number: (item as any).pageNumber ?? null,
            p_section_key: (item as any).sectionKey ?? null,
            p_section_title: (item as any).sectionTitle ?? null,
            p_title: item.title ?? null,
            p_summary: item.summary ?? null,
            p_content_text: (item as any).contentText ?? null,
            p_content_markdown: (item as any).contentMarkdown ?? null,
            p_content_json: (item as any).contentJson ?? null,
            p_preview_storage_uri: null,
            p_preview_content_type: null,
            p_checksum_sha256: checksum,
            p_payload_bytes: Buffer.byteLength(payload, "utf8"),
            p_redacted: job.redaction_policy !== "none",
            p_redaction_summary:
              job.redaction_policy === "none"
                ? null
                : `Rendered with ${job.redaction_policy} policy.`,
            p_sort_order: item.sortOrder ?? 0,
            p_public_metadata: {},
            p_internal_metadata: {
              workerId,
              source: "admin-security-artifact-viewer-render-worker"
            }
          }
        );

        if (itemError) throw itemError;
      }

      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_admin_security_artifact_viewer_render_job",
        {
          p_render_job_id: job.render_job_id,
          p_rendered_page_count: pageCount,
          p_rendered_item_count: items.length,
          p_worker_id: workerId,
          p_metadata: {
            source: "admin-security-artifact-viewer-render-worker"
          }
        }
      );

      if (completeError) throw completeError;
    } catch (err: any) {
      await supabaseAdmin.rpc("fail_admin_security_artifact_viewer_render_job", {
        p_render_job_id: job.render_job_id,
        p_error: err?.message ?? "unknown artifact viewer render error",
        p_worker_id: workerId,
        p_metadata: {
          source: "admin-security-artifact-viewer-render-worker"
        }
      });
    }
  }

  return {
    claimed: claimed.length
  };
}
