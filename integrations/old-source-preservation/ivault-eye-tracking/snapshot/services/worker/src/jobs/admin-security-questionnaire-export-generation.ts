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

const exportRoot =
  process.env.QUESTIONNAIRE_EXPORT_ROOT ?? "/tmp/i-questionnaire-exports";

const signingSecret =
  process.env.QUESTIONNAIRE_EXPORT_SIGNING_SECRET ?? "dev-only-change-me";

function getWorkerId() {
  return process.env.WORKER_ID ?? `worker-${process.pid}`;
}

function sha256(input: Buffer | string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hmacSha256(input: string) {
  return crypto.createHmac("sha256", signingSecret).update(input).digest("hex");
}

function safeFilePart(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

async function loadActiveSigningKey() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_questionnaire_export_signing_keys")
    .select("*")
    .eq("status", "active")
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("active questionnaire export signing key not found");

  return data;
}

async function loadQuestions(questionnaireProjectId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_questionnaire_questions")
    .select("*")
    .eq("questionnaire_project_id", questionnaireProjectId)
    .order("question_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function loadEvidence(questionnaireProjectId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_questionnaire_question_evidence")
    .select("id")
    .eq("questionnaire_project_id", questionnaireProjectId);

  if (error) throw error;
  return data ?? [];
}

function renderMarkdown(input: { job: any; questions: any[] }) {
  const lines: string[] = [];

  lines.push(`# ${input.job.questionnaire_title}`);
  lines.push("");
  lines.push(`**Export key:** \`${input.job.export_key}\``);
  lines.push(`**Project key:** \`${input.job.project_key}\``);
  lines.push(`**Customer:** ${input.job.customer_name}`);
  lines.push(`**Format:** ${input.job.export_format}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const q of input.questions) {
    lines.push(`## ${q.question_key}`);
    lines.push("");
    lines.push(`**Question:** ${q.question_text}`);
    lines.push("");
    lines.push(`**Answer:** ${q.answer_text ?? ""}`);
    lines.push("");
  }

  return lines.join("\n");
}

function renderJson(input: { job: any; questions: any[] }) {
  return JSON.stringify(
    {
      manifest: {
        questionnaireExportId: input.job.questionnaire_export_id,
        exportKey: input.job.export_key,
        projectKey: input.job.project_key,
        customerName: input.job.customer_name,
        questionnaireTitle: input.job.questionnaire_title,
        exportFormat: input.job.export_format,
        generatedAt: new Date().toISOString()
      },
      questions: input.questions.map((q) => ({
        questionId: q.id,
        questionKey: q.question_key,
        questionText: q.question_text,
        answerText: q.answer_text ?? null,
        answerSource: q.answer_source,
        status: q.status
      }))
    },
    null,
    2
  );
}

async function writeExportFile(input: { job: any; body: string }) {
  await fs.mkdir(exportRoot, { recursive: true });

  const extension = input.job.export_format === "markdown" ? "md" : "json";
  const fileName = `${safeFilePart(input.job.export_key)}.${extension}`;
  const filePath = path.join(exportRoot, fileName);

  await fs.writeFile(filePath, input.body, "utf8");

  return {
    filePath,
    storageUri: `file://${filePath}`
  };
}

export async function runAdminSecurityQuestionnaireExportGenerationJob() {
  const workerId = getWorkerId();

  const { data: jobs, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_questionnaire_exports",
    {
      p_batch_size: 5,
      p_worker_id: workerId,
      p_metadata: {
        source: "admin-security-questionnaire-export-generation-worker"
      }
    }
  );

  if (claimError) throw claimError;

  const claimed = jobs ?? [];

  for (const job of claimed) {
    try {
      const questions = await loadQuestions(job.questionnaire_project_id);
      const evidence = await loadEvidence(job.questionnaire_project_id);

      const body =
        job.export_format === "markdown"
          ? renderMarkdown({ job, questions })
          : renderJson({ job, questions });

      const signingKey = await loadActiveSigningKey();
      const unsignedChecksum = sha256(body);

      const signaturePayload = JSON.stringify({
        exportKey: job.export_key,
        checksumSha256: unsignedChecksum,
        projectKey: job.project_key,
        customerName: job.customer_name,
        signingKeyVersion: signingKey.key_version,
        signatureAlgorithm: signingKey.algorithm
      });

      const signature = hmacSha256(signaturePayload);

      const signedBody =
        job.export_format === "markdown"
          ? [
              body,
              "",
              "---",
              "",
              "## Signature",
              "",
              `- Algorithm: ${signingKey.algorithm}`,
              `- Signing key version: ${signingKey.key_version}`,
              `- Export checksum: \`${unsignedChecksum}\``,
              `- Signature: \`${signature}\``
            ].join("\n")
          : body;

      const checksum = sha256(signedBody);
      const payloadBytes = Buffer.byteLength(signedBody, "utf8");

      const { storageUri } = await writeExportFile({
        job,
        body: signedBody
      });

      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_admin_security_questionnaire_export",
        {
          p_questionnaire_export_id: job.questionnaire_export_id,
          p_storage_uri: storageUri,
          p_checksum_sha256: checksum,
          p_payload_bytes: payloadBytes,
          p_question_count: questions.length,
          p_evidence_count: evidence.length,
          p_signature: signature,
          p_worker_id: workerId,
          p_metadata: {
            workerId,
            source: "admin-security-questionnaire-export-generation-worker",
            unsignedChecksumSha256: unsignedChecksum
          }
        }
      );

      if (completeError) throw completeError;

      await supabaseAdmin.rpc("hash_admin_security_questionnaire_export", {
        p_questionnaire_export_id: job.questionnaire_export_id,
        p_metadata: {
          workerId,
          source: "admin-security-questionnaire-export-generation-worker"
        }
      });
    } catch (err: any) {
      await supabaseAdmin.rpc("fail_admin_security_questionnaire_export", {
        p_questionnaire_export_id: job.questionnaire_export_id,
        p_error: err?.message ?? "unknown questionnaire export generation error",
        p_worker_id: workerId,
        p_metadata: {
          workerId,
          source: "admin-security-questionnaire-export-generation-worker"
        }
      });
    }
  }

  return {
    claimed: claimed.length
  };
}
