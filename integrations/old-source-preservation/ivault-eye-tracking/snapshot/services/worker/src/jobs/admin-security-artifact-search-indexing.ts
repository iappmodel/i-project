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

function normalizeText(input: string) {
  return input
    .replace(/\s+/g, " ")
    .trim();
}

function approximateTokenCount(input: string) {
  return Math.ceil(input.length / 4);
}

function chunkText(input: {
  baseKey: string;
  text: string;
  maxChars?: number;
}) {
  const maxChars = input.maxChars ?? 1800;
  const text = normalizeText(input.text);

  if (text.length <= maxChars) {
    return [
      {
        chunkKey: `${input.baseKey}:chunk:0`,
        contentText: text,
        index: 0
      }
    ];
  }

  const chunks: Array<{ chunkKey: string; contentText: string; index: number }> = [];
  let cursor = 0;
  let index = 0;

  while (cursor < text.length) {
    chunks.push({
      chunkKey: `${input.baseKey}:chunk:${index}`,
      contentText: text.slice(cursor, cursor + maxChars),
      index
    });

    cursor += maxChars;
    index += 1;
  }

  return chunks;
}

async function loadViewerItems(viewerSubjectId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_artifact_viewer_items")
    .select("*")
    .eq("viewer_subject_id", viewerSubjectId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

function contentFromItem(item: any) {
  const parts = [
    item.title,
    item.summary,
    item.content_text,
    item.content_markdown,
    item.content_json ? JSON.stringify(item.content_json) : null
  ].filter(Boolean);

  return normalizeText(parts.join("\n\n"));
}

export async function runAdminSecurityArtifactSearchIndexingJob() {
  const workerId = getWorkerId();

  const { data: documents, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_artifact_search_documents_for_indexing",
    {
      p_batch_size: 25,
      p_worker_id: workerId,
      p_metadata: {
        source: "admin-security-artifact-search-indexing-worker"
      }
    }
  );

  if (claimError) throw claimError;

  const claimed = documents ?? [];

  for (const document of claimed) {
    try {
      const items = await loadViewerItems(document.viewer_subject_id);

      let indexedChunkCount = 0;
      let indexedItemCount = 0;

      for (const item of items) {
        const contentText = contentFromItem(item);
        if (!contentText) continue;

        indexedItemCount += 1;

        const chunks = chunkText({
          baseKey: item.item_key,
          text: contentText
        });

        for (const chunk of chunks) {
          const { error: chunkError } = await supabaseAdmin.rpc(
            "upsert_admin_security_artifact_search_chunk",
            {
              p_search_document_id: document.search_document_id,
              p_viewer_subject_id: document.viewer_subject_id,
              p_viewer_item_id: item.id,
              p_chunk_key: chunk.chunkKey,
              p_chunk_type: item.item_type === "page" ? "page" : "section",
              p_source_type: document.source_type,
              p_source_id: document.source_id,
              p_artifact_type: document.artifact_type,
              p_artifact_key: document.artifact_key,
              p_page_number: item.page_number,
              p_section_key: item.section_key,
              p_section_title: item.section_title,
              p_title: item.title ?? document.title,
              p_summary: item.summary ?? document.summary,
              p_content_text: chunk.contentText,
              p_token_count: approximateTokenCount(chunk.contentText),
              p_character_count: chunk.contentText.length,
              p_embedding_status: "not_required",
              p_embedding_model: "local-keyword-placeholder",
              p_embedding_version: "v1",
              p_embedding_vector_id: null,
              p_embedding_dimensions: null,
              p_embedding_checksum_sha256: null,
              p_redacted: item.redacted ?? false,
              p_redaction_summary: item.redaction_summary ?? null,
              p_sort_order: item.sort_order + chunk.index,
              p_public_metadata: item.public_metadata ?? {},
              p_internal_metadata: {
                workerId,
                source: "admin-security-artifact-search-indexing-worker"
              }
            }
          );

          if (chunkError) throw chunkError;
          indexedChunkCount += 1;
        }
      }

      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_admin_security_artifact_search_document_indexing",
        {
          p_search_document_id: document.search_document_id,
          p_indexed_item_count: indexedItemCount,
          p_indexed_chunk_count: indexedChunkCount,
          p_embedding_model: "local-keyword-placeholder",
          p_embedding_version: "v1",
          p_worker_id: workerId,
          p_metadata: {
            source: "admin-security-artifact-search-indexing-worker"
          }
        }
      );

      if (completeError) throw completeError;
    } catch (err: any) {
      await supabaseAdmin.rpc(
        "fail_admin_security_artifact_search_document_indexing",
        {
          p_search_document_id: document.search_document_id,
          p_error: err?.message ?? "unknown artifact search indexing error",
          p_worker_id: workerId,
          p_metadata: {
            source: "admin-security-artifact-search-indexing-worker"
          }
        }
      );
    }
  }

  return {
    claimed: claimed.length
  };
}
