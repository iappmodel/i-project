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

function normalize(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string) {
  return new Set(
    normalize(input)
      .split(" ")
      .filter((token) => token.length > 2)
  );
}

function jaccard(a: Set<string>, b: Set<string>) {
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

async function loadApprovedAnswers() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_questionnaire_answer_library")
    .select("*")
    .eq("status", "approved");

  if (error) throw error;
  return data ?? [];
}

async function loadEvidenceForAnswer(answerLibraryId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_security_questionnaire_answer_evidence_links")
    .select("*")
    .eq("answer_library_id", answerLibraryId)
    .eq("status", "active")
    .eq("public_safe", true);

  if (error) throw error;
  return data ?? [];
}

async function loadGuardrails() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_questionnaire_ai_guardrails")
    .select("*")
    .eq("status", "active");

  if (error) throw error;
  return data ?? [];
}

function scoreAnswer(job: any, answer: any) {
  const qTokens = tokenize(job.question_text);
  const patternTokens = tokenize(answer.question_pattern);
  const topicTokens = tokenize(`${answer.category} ${answer.topic}`);

  const lexical = jaccard(qTokens, patternTokens);
  const topic = jaccard(qTokens, topicTokens);

  const categoryMatch = job.category && answer.category && job.category === answer.category;

  let score = lexical * 0.7 + topic * 0.2 + (categoryMatch ? 0.1 : 0);
  if (score > 1) score = 1;

  return {
    score,
    lexicalMatch: lexical >= 0.25,
    semanticMatch: score >= 0.55,
    categoryMatch
  };
}

function buildDraftFromAnswer(input: { job: any; answer: any | null; evidence: any[] }) {
  if (input.answer) {
    const evidenceSentence =
      input.evidence.length > 0
        ? ` This answer is supported by ${input.evidence.length} approved evidence reference${input.evidence.length === 1 ? "" : "s"}.`
        : "";

    return {
      generatedAnswer: `${input.answer.long_answer}${evidenceSentence}`,
      rationale: `Draft generated from approved answer library entry ${input.answer.answer_key}.`
    };
  }

  return {
    generatedAnswer:
      "This question requires manual review. No approved answer-library entry matched strongly enough to generate a reliable response.",
    rationale:
      "No strong approved library match was found. The draft intentionally avoids making unsupported security claims."
  };
}

function checkGuardrails(input: { generatedAnswer: string; evidenceCount: number; guardrails: any[] }) {
  const flags: any[] = [];
  let blocked = false;

  for (const guardrail of input.guardrails) {
    if (!guardrail.match_pattern) continue;
    const re = new RegExp(guardrail.match_pattern, "i");
    const matched = re.test(input.generatedAnswer);
    if (!matched) continue;

    const isUnsupportedEvidenceClaim =
      guardrail.guardrail_type === "unverified_evidence" && input.evidenceCount === 0;

    const shouldFlag =
      guardrail.guardrail_type !== "unverified_evidence" || isUnsupportedEvidenceClaim;

    if (!shouldFlag) continue;

    flags.push({
      guardrailKey: guardrail.guardrail_key,
      guardrailType: guardrail.guardrail_type,
      title: guardrail.title,
      severity: guardrail.severity,
      blockOnViolation: guardrail.block_on_violation
    });

    if (guardrail.block_on_violation) blocked = true;
  }

  return {
    safetyStatus: blocked ? "blocked" : flags.length > 0 ? "flagged" : "passed",
    safetyFlags: flags
  };
}

export async function runAdminSecurityQuestionnaireAiDraftingJob() {
  const workerId = getWorkerId();

  const { data: jobs, error: claimError } = await supabaseAdmin.rpc(
    "claim_admin_security_questionnaire_ai_drafts",
    {
      p_batch_size: 5,
      p_worker_id: workerId,
      p_metadata: {
        source: "admin-security-questionnaire-ai-drafting-worker"
      }
    }
  );

  if (claimError) throw claimError;

  const claimed = jobs ?? [];

  for (const job of claimed) {
    try {
      const answers = await loadApprovedAnswers();

      const scored = answers
        .map((answer) => ({
          answer,
          ...scoreAnswer(job, answer)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      for (let index = 0; index < scored.length; index++) {
        const item = scored[index];

        await supabaseAdmin.rpc("store_admin_security_questionnaire_ai_match_candidate", {
          p_ai_draft_request_id: job.ai_draft_request_id,
          p_answer_library_id: item.answer.id,
          p_rank: index + 1,
          p_match_score: Number(item.score.toFixed(4)),
          p_match_reason:
            item.score >= 0.75
              ? "Strong approved library match."
              : item.score >= 0.55
                ? "Moderate approved library match."
                : "Weak library match.",
          p_category_match: item.categoryMatch,
          p_framework_match: false,
          p_control_match: false,
          p_lexical_match: item.lexicalMatch,
          p_semantic_match: item.semanticMatch,
          p_recommended: index === 0 && item.score >= 0.55,
          p_metadata: {
            source: "admin-security-questionnaire-ai-drafting-worker"
          }
        });
      }

      const best = scored[0];
      const selectedAnswer =
        best && best.score >= 0.55 && job.draft_mode !== "draft_only" ? best.answer : null;

      const evidence = selectedAnswer ? await loadEvidenceForAnswer(selectedAnswer.id) : [];
      const evidenceSummary = evidence.map((item) => ({
        evidenceType: item.evidence_type,
        displayLabel: item.display_label,
        evidenceSummary: item.evidence_summary,
        publicSafe: item.public_safe
      }));

      let generatedAnswer: string | null = null;
      let generatedRationale: string | null = null;

      if (job.draft_mode !== "match_only") {
        const draft = buildDraftFromAnswer({
          job,
          answer: selectedAnswer,
          evidence
        });
        generatedAnswer = draft.generatedAnswer;
        generatedRationale = draft.rationale;
      }

      const guardrails = await loadGuardrails();
      const safety = generatedAnswer
        ? checkGuardrails({
            generatedAnswer,
            evidenceCount: evidence.length,
            guardrails
          })
        : {
            safetyStatus: "passed",
            safetyFlags: []
          };

      const draftConfidence =
        selectedAnswer && generatedAnswer
          ? Math.min(0.99, Number(best.score.toFixed(4)))
          : generatedAnswer
            ? 0.35
            : null;

      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_admin_security_questionnaire_ai_draft",
        {
          p_ai_draft_request_id: job.ai_draft_request_id,
          p_selected_answer_library_id: selectedAnswer?.id ?? null,
          p_match_confidence: best ? Number(best.score.toFixed(4)) : null,
          p_draft_confidence: draftConfidence,
          p_generated_answer: generatedAnswer,
          p_generated_rationale: generatedRationale,
          p_evidence_summary: evidenceSummary,
          p_safety_status: safety.safetyStatus,
          p_safety_flags: safety.safetyFlags,
          p_worker_id: workerId,
          p_metadata: {
            workerId,
            source: "admin-security-questionnaire-ai-drafting-worker"
          }
        }
      );

      if (completeError) throw completeError;
    } catch (err: any) {
      await supabaseAdmin.rpc("fail_admin_security_questionnaire_ai_draft", {
        p_ai_draft_request_id: job.ai_draft_request_id,
        p_error: err?.message ?? "unknown AI questionnaire drafting error",
        p_worker_id: workerId,
        p_metadata: {
          workerId,
          source: "admin-security-questionnaire-ai-drafting-worker"
        }
      });
    }
  }

  return {
    claimed: claimed.length
  };
}
