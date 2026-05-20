import type { StudioSession, StudioEditPlan, StudioEditPlanClip, StudioEditPlanMode } from "./studio.types";

const gid = (p = "plan-") => `${p}${Math.floor(Math.random() * 1e9).toString(36)}`;
const nowISO = () => new Date().toISOString();

export interface AutoCutOptions {
  mode: StudioEditPlanMode;
  targetDurationSeconds?: number | null;
}

function scoreClip(clip: {
  highlightScore: number;
  qualityScore: number;
  isMarked: boolean;
  hasFace: boolean;
  hasVoice: boolean;
  isBlurry: boolean;
  isSilent: boolean;
}): number {
  let s = clip.highlightScore * 0.5 + clip.qualityScore * 0.35;
  if (clip.isMarked) s += 15;
  if (clip.hasFace) s += 5;
  if (clip.hasVoice) s += 5;
  if (clip.isBlurry) s -= 25;
  if (clip.isSilent) s -= 15;
  return Math.min(100, Math.max(0, s));
}

function clipSegmentCap(targetSeconds: number): number {
  return targetSeconds > 0 && targetSeconds <= 30 ? 8 : 12;
}

function makeTitle(mode: StudioEditPlanMode, target: number): string {
  const labels: Record<StudioEditPlanMode, string> = {
    target_duration: `Target ${target}s cut`,
    remove_dead_parts: "Dead-parts removed cut",
    marked_moments: "Marked moments cut",
    multi_version: "Multi-version draft",
    best_highlights: "Best highlights cut",
  };
  return labels[mode];
}

export function createAutoCutPlan(session: StudioSession, options: AutoCutOptions): StudioEditPlan {
  const { mode } = options;
  const target = options.targetDurationSeconds ?? 45;
  const cap = clipSegmentCap(target);
  const warnings: string[] = [];

  // Score every non-discarded clip
  const scoredClips = session.clips
    .filter((c) => c.status !== "discarded")
    .map((c) => ({ clip: c, score: scoreClip(c) }))
    .sort((a, b) => b.score - a.score);

  let candidatePool = scoredClips;

  if (mode === "remove_dead_parts") {
    candidatePool = scoredClips.filter(
      ({ clip }) => !clip.isBlurry && !clip.isSilent && clip.qualityScore >= 50 && clip.highlightScore >= 45,
    );
  } else if (mode === "marked_moments") {
    const marked = scoredClips.filter(({ clip }) => clip.isMarked);
    if (marked.length === 0) {
      warnings.push("No marked clips found; fallback to highlight score.");
      candidatePool = scoredClips;
    } else {
      candidatePool = marked;
      if (marked.reduce((sum, { clip }) => sum + Math.min(clip.durationSeconds, cap), 0) < target) {
        warnings.push("Target duration may be short for available marked moments.");
      }
    }
  } else if (mode === "best_highlights") {
    candidatePool = scoredClips;
  } else if (mode === "multi_version") {
    candidatePool = scoredClips;
    warnings.push("Multi-version generation (15s/45s/90s) is staged for next step — single draft only.");
  }
  // target_duration uses scoredClips as-is

  // Build plan clips up to target duration
  const planClips: StudioEditPlanClip[] = [];
  const usedClipIds = new Set<string>();
  let cursor = 0;
  let remaining = target;

  for (const { clip, score } of candidatePool) {
    if (remaining <= 0) break;
    const segDuration = Math.min(Math.min(clip.durationSeconds, cap), remaining);
    const reason = clip.isMarked
      ? "Marked moment"
      : score >= 70
      ? "High highlight score"
      : score >= 50
      ? "Good quality"
      : "Selected to fill target duration";
    planClips.push({
      id: gid("pclip-"),
      clipId: clip.id,
      title: clip.title,
      sourceStartSeconds: clip.startOffsetSeconds,
      sourceEndSeconds: clip.startOffsetSeconds + segDuration,
      timelineStartSeconds: cursor,
      durationSeconds: segDuration,
      reason,
      score: Math.round(score),
    });
    usedClipIds.add(clip.id);
    cursor += segDuration;
    remaining -= segDuration;
  }

  const estimatedDurationSeconds = planClips.reduce((s, c) => s + c.durationSeconds, 0);
  const excludedClipIds = session.clips
    .filter((c) => !usedClipIds.has(c.id))
    .map((c) => c.id);

  const modeLabels: Record<StudioEditPlanMode, string> = {
    target_duration: `Assembled ${planClips.length} clips to reach ~${target}s target.`,
    remove_dead_parts: `Removed ${excludedClipIds.length} dead/poor-quality clips.`,
    marked_moments: `Used ${planClips.filter((p) => session.clips.find((c) => c.id === p.clipId)?.isMarked).length} marked moments.`,
    best_highlights: `Selected top ${planClips.length} scoring clips.`,
    multi_version: `Draft assembled. Full multi-version branching is staged for next step.`,
  };

  return {
    id: gid(),
    title: makeTitle(mode, target),
    mode,
    status: "previewed",
    targetDurationSeconds: target,
    estimatedDurationSeconds,
    createdAt: nowISO(),
    clips: planClips,
    excludedClipIds,
    summary: modeLabels[mode],
    warnings,
  };
}
