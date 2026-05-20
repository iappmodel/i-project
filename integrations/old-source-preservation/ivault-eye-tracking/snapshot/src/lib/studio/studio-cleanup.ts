import type {
  StudioSession,
  StudioEditPlan,
  StudioCleanupPlan,
  StudioCleanupCandidate,
  StudioCleanupCandidateAction,
  StudioCleanupReason,
} from "./studio.types";

const gid = (p = "cl-") => `${p}${Math.floor(Math.random() * 1e9).toString(36)}`;
const nowISO = () => new Date().toISOString();

function estimateClipMb(
  clipDuration: number,
  totalDuration: number,
  totalStorageMb: number,
): number {
  if (totalDuration <= 0) return 0;
  return (clipDuration / totalDuration) * totalStorageMb;
}

function recoverableMb(estimatedMb: number, action: StudioCleanupCandidateAction): number {
  if (action === "delete_candidate") return estimatedMb;
  if (action === "compress_candidate") return estimatedMb * 0.45;
  return 0;
}

export function createCleanupPlan(
  session: StudioSession,
  selectedEditPlan?: StudioEditPlan | null,
): StudioCleanupPlan {
  const warnings: string[] = [
    "No files will be deleted until explicit confirmation.",
    "Marked moments are protected.",
  ];

  const planClipIds = new Set<string>(
    selectedEditPlan && (selectedEditPlan.status === "accepted" || selectedEditPlan.status === "previewed")
      ? selectedEditPlan.clips.map((c) => c.clipId)
      : [],
  );

  if (planClipIds.size > 0) {
    warnings.push("Accepted edit plan clips are protected.");
  }

  const candidates: StudioCleanupCandidate[] = session.clips.map((clip) => {
    const estimatedMb = estimateClipMb(
      clip.durationSeconds,
      session.rawDurationSeconds,
      session.storageUsedMb,
    );

    const reasons: StudioCleanupReason[] = [];
    let action: StudioCleanupCandidateAction = "delete_candidate";
    let isProtected = false;

    // ── Protection gates (evaluated first) ──────────────────────────────────
    if (clip.isMarked) {
      reasons.push("marked");
      isProtected = true;
    }
    if (planClipIds.has(clip.id)) {
      reasons.push("used_in_edit_plan");
      isProtected = true;
    }
    if (clip.status === "selected" || clip.status === "used") {
      reasons.push("used_in_edit_plan");
      isProtected = true;
    }
    if (session.proofStatus.deletionProtected) {
      reasons.push("proof_protected");
      isProtected = true;
    }

    if (isProtected) {
      action = "keep_protected";
    } else {
      // ── Delete signals ─────────────────────────────────────────────────────
      if (clip.status === "discarded") reasons.push("discarded");
      if (clip.isBlurry) reasons.push("blurry");
      if (clip.isSilent && !clip.hasFace && !clip.hasVoice) reasons.push("silent");
      if (planClipIds.size > 0 && !planClipIds.has(clip.id)) reasons.push("not_in_edit_plan");
      if (clip.status === "raw" && !clip.isMarked) reasons.push("unused_raw");

      // ── Downgrade to compress if only low-quality signal ──────────────────
      const deleteSignals = reasons.filter((r) =>
        ["discarded", "blurry", "silent", "not_in_edit_plan"].includes(r),
      );
      if (deleteSignals.length === 0 && clip.qualityScore < 50) {
        action = "compress_candidate";
        reasons.push("low_quality");
      } else if (deleteSignals.length === 0 && clip.qualityScore >= 50) {
        // nothing strongly negative — compress at most
        action = "compress_candidate";
        if (!reasons.includes("low_quality") && clip.qualityScore < 50) reasons.push("low_quality");
      } else {
        action = "delete_candidate";
        if (clip.qualityScore < 50) reasons.push("low_quality");
      }
    }

    const recoverable = recoverableMb(estimatedMb, action);
    const uniqueReasons = [...new Set(reasons)] as StudioCleanupReason[];

    const explanationMap: Record<StudioCleanupCandidateAction, string> = {
      keep_protected: `Protected — ${uniqueReasons.map((r) => r.replace(/_/g, " ")).join(", ")}.`,
      delete_candidate: `Flagged for removal — ${uniqueReasons.map((r) => r.replace(/_/g, " ")).join(", ")}.`,
      compress_candidate: `Flagged for compression — ${uniqueReasons.map((r) => r.replace(/_/g, " ")).join(", ")}.`,
      cloud_backup_candidate: `Suggested for cloud backup — ${uniqueReasons.map((r) => r.replace(/_/g, " ")).join(", ")}.`,
    };

    return {
      id: gid("cand-"),
      clipId: clip.id,
      title: clip.title,
      action,
      reasons: uniqueReasons,
      estimatedRecoverableMb: Math.round(recoverable * 10) / 10,
      protected: isProtected,
      explanation: explanationMap[action],
    };
  });

  const totalStorageMb = session.storageUsedMb;
  const recoverableStorageMb =
    Math.round(
      candidates.reduce((sum, c) => sum + c.estimatedRecoverableMb, 0) * 10,
    ) / 10;
  const protectedStorageMb = Math.round(
    candidates
      .filter((c) => c.protected)
      .reduce(
        (sum, c) =>
          sum +
          estimateClipMb(
            session.clips.find((cl) => cl.id === c.clipId)?.durationSeconds ?? 0,
            session.rawDurationSeconds,
            session.storageUsedMb,
          ),
        0,
      ) * 10,
  ) / 10;

  const deleteCount = candidates.filter((c) => c.action === "delete_candidate").length;
  const compressCount = candidates.filter((c) => c.action === "compress_candidate").length;
  const protectedCount = candidates.filter((c) => c.action === "keep_protected").length;

  const summary =
    `${deleteCount} clip${deleteCount !== 1 ? "s" : ""} flagged for removal, ` +
    `${compressCount} for compression, ` +
    `${protectedCount} protected. ` +
    `~${recoverableStorageMb} MB recoverable. ` +
    `No files deleted until confirmation.`;

  return {
    id: gid(),
    status: "previewed",
    createdAt: nowISO(),
    totalStorageMb,
    recoverableStorageMb,
    protectedStorageMb,
    requiresConfirmation: true,
    candidates,
    summary,
    warnings,
  };
}
