import type {
  StudioState,
  StudioToolId,
  AspectRatio,
  StudioMark,
  StudioRecordingState,
  StudioEditPlanMode,
  StudioPublishDestination,
} from "./studio.types";
import { mockSession } from "./studio.mock";
import { parseStudioCommand, extractTargetDurationSeconds, createEffectPreviewFromCommand } from "./studio-commands";
import { createAutoCutPlan } from "./studio-autocut";
import { createCleanupPlan } from "./studio-cleanup";
import { createPublishPlan } from "./studio-publish";
import type { CreatePublishPlanOptions } from "./studio-publish";
import { createProofPlan, createProofPackage } from "./studio-proof";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const gid = (p = "t-") => `${p}${Math.floor(Math.random() * 1e9).toString(36)}`;
const nowISO = () => new Date().toISOString();

function initialRecordingState(clipCount: number): StudioRecordingState {
  return {
    status: "idle",
    activeTakeId: null,
    startedAt: null,
    pausedAt: null,
    stoppedAt: null,
    elapsedSeconds: 0,
    takeCount: clipCount,
    lastCommand: null,
  };
}

export function createInitialStudioState(): StudioState {
  const session = clone(mockSession);
  return {
    activeSession: session,
    selectedClipId: session.clips[0]?.id ?? null,
    activeTool: "select",
    isPlaying: false,
    exportPanelOpen: false,
    commandPanelOpen: false,
    cleanupPreviewOpen: false,
    effectPreviews: [],
    selectedExportTargets: [],
    recording: initialRecordingState(session.clips.length),
    editPlans: [],
    selectedEditPlanId: null,
    autoCutPanelOpen: false,
    cleanupPlans: [],
    selectedCleanupPlanId: null,
    publishPlans: [],
    selectedPublishPlanId: null,
    publishPanelOpen: false,
    proofArtifacts: [],
    custodyEvents: [],
    proofPlans: [],
    proofPackages: [],
    selectedProofPlanId: null,
    selectedProofPackageId: null,
    proofPanelOpen: false,
  };
}

export function selectClip(state: StudioState, clipId: string): StudioState {
  return { ...state, selectedClipId: clipId };
}

export function toggleClipDiscarded(state: StudioState, clipId: string): StudioState {
  const session = clone(state.activeSession);
  const clip = session.clips.find((c) => c.id === clipId);
  if (!clip) return state;
  clip.status = clip.status === "discarded" ? "raw" : "discarded";
  session.updatedAt = nowISO();
  return { ...state, activeSession: session, selectedClipId: clipId };
}

export function setAspectRatio(state: StudioState, aspectRatio: AspectRatio): StudioState {
  const session = clone(state.activeSession);
  session.aspectRatio = aspectRatio;
  session.updatedAt = nowISO();
  return { ...state, activeSession: session };
}

export function addStudioCommand(state: StudioState, raw: string): StudioState {
  const session = clone(state.activeSession);
  const cmd = parseStudioCommand(raw);
  session.commands.unshift(cmd);
  session.updatedAt = nowISO();
  return { ...state, activeSession: session, commandPanelOpen: true };
}

export function setActiveTool(state: StudioState, tool: StudioToolId): StudioState {
  return { ...state, activeTool: tool };
}

export function addStudioMarkAtPlayhead(state: StudioState, label = "manual mark"): StudioState {
  const s = clone(state);
  const session = s.activeSession;
  const playhead = session.timeline.playheadSeconds ?? 0;
  const clipId = s.selectedClipId ?? session.clips[0]?.id;
  if (!clipId) return state;
  const mark: StudioMark = {
    id: `m-${gid()}`,
    clipId,
    timestampSeconds: playhead,
    label,
    source: "voice",
    confidence: 1,
  };
  session.marks.push(mark);
  const clip = session.clips.find((c) => c.id === clipId);
  if (clip) clip.isMarked = true;
  session.updatedAt = nowISO();
  return { ...s, activeSession: session, selectedClipId: clipId };
}

export function setCleanupPreviewOpen(state: StudioState, open: boolean): StudioState {
  return { ...state, cleanupPreviewOpen: open };
}

export function setExportTargetSelected(state: StudioState, target: string, selected: boolean): StudioState {
  const targets = [...state.selectedExportTargets];
  const idx = targets.indexOf(target);
  if (selected && idx === -1) targets.push(target);
  if (!selected && idx !== -1) targets.splice(idx, 1);
  return { ...state, selectedExportTargets: targets };
}

// ── Stage 4: Edit plan helpers ────────────────────────────────────────────────

export function generateEditPlan(
  state: StudioState,
  mode: StudioEditPlanMode,
  targetDurationSeconds?: number | null,
): StudioState {
  const plan = createAutoCutPlan(state.activeSession, {
    mode,
    targetDurationSeconds: targetDurationSeconds ?? state.activeSession.targetDurationSeconds ?? 45,
  });
  const editPlans = [plan, ...state.editPlans];
  return {
    ...state,
    editPlans,
    selectedEditPlanId: plan.id,
    autoCutPanelOpen: true,
  };
}

export function selectEditPlan(state: StudioState, planId: string): StudioState {
  return { ...state, selectedEditPlanId: planId };
}

export function acceptEditPlanPreview(state: StudioState, planId: string): StudioState {
  const editPlans = state.editPlans.map((p) =>
    p.id === planId ? { ...p, status: "accepted" as const } : p,
  );
  const plan = editPlans.find((p) => p.id === planId);
  const session = clone(state.activeSession);
  if (plan) {
    session.estimatedFinalDurationSeconds = plan.estimatedDurationSeconds;
    session.updatedAt = nowISO();
  }
  return { ...state, editPlans, activeSession: session };
}

export function rejectEditPlanPreview(state: StudioState, planId: string): StudioState {
  const editPlans = state.editPlans.map((p) =>
    p.id === planId ? { ...p, status: "rejected" as const } : p,
  );
  return { ...state, editPlans };
}

export function setAutoCutPanelOpen(state: StudioState, open: boolean): StudioState {
  return { ...state, autoCutPanelOpen: open };
}

// ── Stage 5: Cleanup plan helpers ─────────────────────────────────────────────

export function generateCleanupPlan(state: StudioState): StudioState {
  const selectedEditPlan =
    state.editPlans.find((p) => p.id === state.selectedEditPlanId) ?? null;

  const plan = createCleanupPlan(state.activeSession, selectedEditPlan);
  const cleanupPlans = [plan, ...state.cleanupPlans];

  const ef = {
    id: `ef-${gid()}`,
    type: "cleanup" as const,
    label: "Storage cleanup preview",
    description: "Safe-delete plan generated. No files deleted.",
    createdAt: nowISO(),
  };

  return {
    ...state,
    cleanupPlans,
    selectedCleanupPlanId: plan.id,
    cleanupPreviewOpen: true,
    effectPreviews: [ef, ...state.effectPreviews],
  };
}

export function selectCleanupPlan(state: StudioState, planId: string): StudioState {
  return { ...state, selectedCleanupPlanId: planId };
}

export function confirmCleanupPlanPreview(state: StudioState, planId: string): StudioState {
  const cleanupPlans = state.cleanupPlans.map((p) =>
    p.id === planId ? { ...p, status: "confirmed" as const } : p,
  );

  const ef = {
    id: `ef-${gid()}`,
    type: "cleanup" as const,
    label: "Cleanup confirmed (mock)",
    description: "Confirmation is mock only. Raw media unchanged.",
    createdAt: nowISO(),
  };

  const session = clone(state.activeSession);
  const parsed = parseStudioCommand("confirm cleanup");
  parsed.previewText = "Cleanup confirmation recorded (mock only). No media was removed.";
  session.commands.unshift(parsed);
  session.updatedAt = nowISO();

  return {
    ...state,
    cleanupPlans,
    activeSession: session,
    effectPreviews: [ef, ...state.effectPreviews],
  };
}

export function rejectCleanupPlanPreview(state: StudioState, planId: string): StudioState {
  const cleanupPlans = state.cleanupPlans.map((p) =>
    p.id === planId ? { ...p, status: "rejected" as const } : p,
  );
  return { ...state, cleanupPlans };
}

// ── Stage 6: Publish plan helpers ────────────────────────────────────────────

export function generatePublishPlan(
  state: StudioState,
  destinations: StudioPublishDestination[],
  options?: Omit<CreatePublishPlanOptions, "destinations">,
): StudioState {
  const plan = createPublishPlan(state, { destinations, ...options });
  const ef = {
    id: `ef-${gid()}`,
    type: "publish" as const,
    label: "Publish plan preview",
    description: "Publishing plan generated. No post has been published.",
    createdAt: nowISO(),
  };
  return {
    ...state,
    publishPlans: [plan, ...state.publishPlans],
    selectedPublishPlanId: plan.id,
    publishPanelOpen: true,
    exportPanelOpen: true,
    effectPreviews: [ef, ...state.effectPreviews],
  };
}

export function selectPublishPlan(state: StudioState, planId: string): StudioState {
  return { ...state, selectedPublishPlanId: planId };
}

export function markPublishPlanReady(state: StudioState, planId: string): StudioState {
  return {
    ...state,
    publishPlans: state.publishPlans.map((p) =>
      p.id === planId ? { ...p, status: "ready" as const } : p,
    ),
  };
}

export function mockPublishPlan(state: StudioState, planId: string): StudioState {
  const publishPlans = state.publishPlans.map((p) =>
    p.id === planId ? { ...p, status: "published_mock" as const } : p,
  );
  const ef = {
    id: `ef-${gid()}`,
    type: "publish" as const,
    label: "Mock publish complete",
    description: "Mock publish completed locally. No external platform received this post.",
    createdAt: nowISO(),
  };
  const session = clone(state.activeSession);
  const cmd = parseStudioCommand("mock publish");
  cmd.previewText =
    "Mock publish completed locally. No external platform received this post.";
  session.commands.unshift(cmd);
  session.updatedAt = nowISO();
  return {
    ...state,
    publishPlans,
    activeSession: session,
    effectPreviews: [ef, ...state.effectPreviews],
  };
}

export function rejectPublishPlan(state: StudioState, planId: string): StudioState {
  return {
    ...state,
    publishPlans: state.publishPlans.map((p) =>
      p.id === planId ? { ...p, status: "rejected" as const } : p,
    ),
  };
}

export function setPublishPanelOpen(state: StudioState, open: boolean): StudioState {
  return { ...state, publishPanelOpen: open };
}

// ── Stage 7: Proof helpers ────────────────────────────────────────────────────

export function generateProofPlan(state: StudioState): StudioState {
  const s = clone(state);
  const { plan, artifacts, custodyEvent } = createProofPlan(s);
  s.proofArtifacts = [...artifacts, ...s.proofArtifacts];
  s.custodyEvents = [custodyEvent, ...s.custodyEvents];
  s.proofPlans = [plan, ...s.proofPlans];
  s.selectedProofPlanId = plan.id;
  s.proofPanelOpen = true;
  // Update session proof status
  s.activeSession.proofStatus = {
    ...s.activeSession.proofStatus,
    originalityFingerprint: "generated",
    custodyLog: "active",
    deletionProtected: true,
  };
  // Add effect preview
  s.effectPreviews.unshift({
    id: gid("ep-"),
    type: "proof",
    label: "Proof plan generated",
    description: "Originality and custody proof preview generated locally.",
    createdAt: nowISO(),
  });
  return s;
}

export function selectProofPlan(state: StudioState, proofPlanId: string): StudioState {
  return { ...state, selectedProofPlanId: proofPlanId, proofPanelOpen: true };
}

export function rejectProofPlan(state: StudioState, proofPlanId: string): StudioState {
  const s = clone(state);
  s.proofPlans = s.proofPlans.map((p) =>
    p.id === proofPlanId ? { ...p, status: "rejected" as const } : p,
  );
  if (s.selectedProofPlanId === proofPlanId) s.selectedProofPlanId = null;
  return s;
}

export function generateProofPackagePreview(state: StudioState, proofPlanId: string): StudioState {
  const s = clone(state);
  const plan = s.proofPlans.find((p) => p.id === proofPlanId);
  if (!plan) return s;
  const { proofPackage, artifact, custodyEvent } = createProofPackage(s, plan);
  s.proofPackages = [proofPackage, ...s.proofPackages];
  s.proofArtifacts = [artifact, ...s.proofArtifacts];
  s.custodyEvents = [custodyEvent, ...s.custodyEvents];
  s.selectedProofPackageId = proofPackage.id;
  // Update plan status
  s.proofPlans = s.proofPlans.map((p) =>
    p.id === proofPlanId ? { ...p, status: "export_previewed" as const } : p,
  );
  s.proofPanelOpen = true;
  return s;
}

export function mockExportProofPackage(state: StudioState, packageId: string): StudioState {
  const s = clone(state);
  s.proofPackages = s.proofPackages.map((p) =>
    p.id === packageId ? { ...p, status: "exported_mock" as const } : p,
  );
  s.effectPreviews.unshift({
    id: gid("ep-"),
    type: "proof",
    label: "Proof package exported (mock)",
    description: "Proof package export is mock only. No file was written.",
    createdAt: nowISO(),
  });
  return s;
}

export function rejectProofPackage(state: StudioState, packageId: string): StudioState {
  const s = clone(state);
  s.proofPackages = s.proofPackages.map((p) =>
    p.id === packageId ? { ...p, status: "rejected" as const } : p,
  );
  if (s.selectedProofPackageId === packageId) s.selectedProofPackageId = null;
  return s;
}

export function setProofPanelOpen(state: StudioState, open: boolean): StudioState {
  return { ...state, proofPanelOpen: open };
}

// ── Stage 3: Recording state machine ─────────────────────────────────────────

export function startRecordingSession(state: StudioState): StudioState {
  const rec = state.recording;
  if (rec.status !== "idle" && rec.status !== "stopped") return state;
  const recording: StudioRecordingState = {
    ...rec,
    status: "recording",
    activeTakeId: gid("take-"),
    startedAt: nowISO(),
    pausedAt: null,
    stoppedAt: null,
    elapsedSeconds: 0,
    lastCommand: "go",
  };
  return { ...state, recording };
}

export function pauseRecordingSession(state: StudioState): StudioState {
  const rec = state.recording;
  if (rec.status !== "recording") return state;
  const recording: StudioRecordingState = { ...rec, status: "paused", pausedAt: nowISO(), lastCommand: "pause" };
  return { ...state, recording };
}

export function resumeRecordingSession(state: StudioState): StudioState {
  const rec = state.recording;
  if (rec.status !== "paused") return state;
  const recording: StudioRecordingState = { ...rec, status: "recording", pausedAt: null, lastCommand: "resume" };
  return { ...state, recording };
}

export function stopRecordingSession(state: StudioState): StudioState {
  const rec = state.recording;
  if (rec.status !== "recording" && rec.status !== "paused") return state;
  const recording: StudioRecordingState = {
    ...rec,
    status: "stopped",
    stoppedAt: nowISO(),
    activeTakeId: null,
    takeCount: rec.takeCount + 1,
    lastCommand: "stop",
  };
  return { ...state, recording };
}

export function analyzeStoppedSession(state: StudioState): StudioState {
  const rec = state.recording;
  if (rec.status !== "stopped") return state;
  const recording: StudioRecordingState = { ...rec, status: "analyzing", lastCommand: "analyze" };
  return { ...state, recording };
}

export function applyCaptureCommand(state: StudioState, rawCommand: string): StudioState {
  const n = rawCommand.trim().toLowerCase();
  const rec = state.recording;

  const appendCmd = (base: StudioState, preview: string): StudioState => {
    const session = clone(base.activeSession);
    const parsed = parseStudioCommand(rawCommand);
    parsed.previewText = preview;
    session.commands.unshift(parsed);
    session.updatedAt = nowISO();
    return { ...base, activeSession: session, commandPanelOpen: true };
  };

  if (/\b(go|start recording)\b/.test(n)) {
    if (rec.status === "idle" || rec.status === "stopped") {
      return appendCmd(startRecordingSession(state), "Recording started.");
    }
    return appendCmd(state, `Command ignored because recording is already ${rec.status}.`);
  }

  if (/\bpause\b/.test(n)) {
    if (rec.status === "recording") return appendCmd(pauseRecordingSession(state), "Recording paused.");
    return appendCmd(state, `Command ignored because recording is not active (${rec.status}).`);
  }

  if (/\bresume\b/.test(n)) {
    if (rec.status === "paused") return appendCmd(resumeRecordingSession(state), "Recording resumed.");
    return appendCmd(state, `Command ignored because recording is not paused (${rec.status}).`);
  }

  if (/\bstop\b/.test(n)) {
    if (rec.status === "recording" || rec.status === "paused") {
      return appendCmd(stopRecordingSession(state), "Recording stopped. Session ready for analysis.");
    }
    return appendCmd(state, `Command ignored because recording is not active (${rec.status}).`);
  }

  if (/\banalyze\b/.test(n)) {
    if (rec.status === "stopped") return appendCmd(analyzeStoppedSession(state), "Analysis started (mock).");
    return appendCmd(state, `Cannot analyze: recording must be stopped first (${rec.status}).`);
  }

  if (/\bmark\b/.test(n)) {
    const withMark = addStudioMarkAtPlayhead(state, "voice mark");
    return appendCmd(withMark, "Voice mark added at playhead.");
  }

  return appendCmd(state, "Capture command not recognized.");
}

// ── Main command dispatcher ───────────────────────────────────────────────────

export function applyStudioCommand(state: StudioState, rawCommand: string): StudioState {
  const s = clone(state);
  const n = rawCommand.trim().toLowerCase();

  // ── Capture commands ───────────────────────────────────────────────────────
  if (/\b(go|start recording|pause|resume|stop|analyze|mark)\b/.test(n)) {
    return applyCaptureCommand(s, rawCommand);
  }

  // ── Cleanup / storage commands ─────────────────────────────────────────────
  if (/(delete unused|cleanup storage|cleanup|keep only final|protect marked)/.test(n)) {
    const next = generateCleanupPlan(s);
    const session = clone(next.activeSession);
    const parsed = parseStudioCommand(rawCommand);
    parsed.previewText =
      "Studio generated a safe-delete cleanup preview. No media will be removed without explicit confirmation.";
    session.commands.unshift(parsed);
    session.updatedAt = nowISO();
    return { ...next, activeSession: session, commandPanelOpen: true };
  }

  // ── Auto-cut commands ──────────────────────────────────────────────────────
  if (/(remove dead|dead parts|dead footage)/.test(n)) {
    const next = generateEditPlan(s, "remove_dead_parts");
    const session = clone(next.activeSession);
    const parsed = parseStudioCommand(rawCommand);
    parsed.previewText = "Auto-cut plan created: dead parts removed (mock preview).";
    session.commands.unshift(parsed);
    session.updatedAt = nowISO();
    return { ...next, activeSession: session };
  }

  if (/(marked moments|use marks|best marks)/.test(n)) {
    const next = generateEditPlan(s, "marked_moments");
    const session = clone(next.activeSession);
    const parsed = parseStudioCommand(rawCommand);
    parsed.previewText = "Auto-cut plan created: marked moments (mock preview).";
    session.commands.unshift(parsed);
    session.updatedAt = nowISO();
    return { ...next, activeSession: session };
  }

  if (/(best highlights|best moments|keep best|top clips)/.test(n)) {
    const next = generateEditPlan(s, "best_highlights");
    const session = clone(next.activeSession);
    const parsed = parseStudioCommand(rawCommand);
    parsed.previewText = "Auto-cut plan created: best highlights (mock preview).";
    session.commands.unshift(parsed);
    session.updatedAt = nowISO();
    return { ...next, activeSession: session };
  }

  if (/(3 versions|multi.?version|make.*versions|multiple versions)/.test(n)) {
    const next = generateEditPlan(s, "multi_version");
    const session = clone(next.activeSession);
    const parsed = parseStudioCommand(rawCommand);
    parsed.previewText = "Multi-version draft assembled. 15s/45s/90s versioning is staged for next step.";
    session.commands.unshift(parsed);
    session.updatedAt = nowISO();
    return { ...next, activeSession: session };
  }

  // ── Duration commands (also generate target_duration plan) ─────────────────
  const dur = extractTargetDurationSeconds(rawCommand);
  if (dur && dur > 0) {
    const session = s.activeSession;
    session.targetDurationSeconds = dur;
    session.estimatedFinalDurationSeconds = dur;
    session.updatedAt = nowISO();
    const parsed = parseStudioCommand(rawCommand);
    parsed.previewText = `Target duration set to ${dur}s. Auto-cut plan prepared.`;
    session.commands.unshift(parsed);
    const withPlan = generateEditPlan({ ...s, activeSession: session }, "target_duration", dur);
    s.commandPanelOpen = true;
    return withPlan;
  }

  // ── Publish commands ───────────────────────────────────────────────────────
  const PUB_PREVIEW = "Studio generated a mock publish plan. Nothing has been posted.";

  const withPubCmd = (next: StudioState): StudioState => {
    const sess = clone(next.activeSession);
    const cmd = parseStudioCommand(rawCommand);
    cmd.previewText = PUB_PREVIEW;
    sess.commands.unshift(cmd);
    sess.updatedAt = nowISO();
    return { ...next, activeSession: sess, commandPanelOpen: true };
  };

  if (/(feed.*stories|stories.*feed|feed and stories)/.test(n)) {
    return withPubCmd(generatePublishPlan(s, ["feed", "stories"]));
  }
  if (/(post to feed|post.*feed|publish.*feed)/.test(n)) {
    return withPubCmd(generatePublishPlan(s, ["feed"]));
  }
  if (/(post to stories|post.*stories|publish.*stories)/.test(n)) {
    return withPubCmd(generatePublishPlan(s, ["stories"]));
  }
  if (/(campaign version|make campaign|campaign post)/.test(n)) {
    return withPubCmd(generatePublishPlan(s, ["campaign"], { campaignMode: true }));
  }
  if (/(save draft|create draft|draft version)/.test(n)) {
    return withPubCmd(generatePublishPlan(s, ["draft"]));
  }
  if (/(schedule this|schedule for|schedule tomorrow|schedule post)/.test(n)) {
    return withPubCmd(
      generatePublishPlan(s, ["draft"], { scheduleMode: "scheduled", scheduledFor: null }),
    );
  }
  if (/(add cta|^cta$|call to action)/.test(n)) {
    const existingDests: StudioPublishDestination[] =
      s.publishPlans.length > 0 ? s.publishPlans[0].destinations : ["feed"];
    return withPubCmd(
      generatePublishPlan(s, existingDests, {
        ctaLabel: "Learn more",
        campaignMode: existingDests.includes("campaign"),
      }),
    );
  }

  // ── Proof / originality commands ─────────────────────────────────────────
  const PROOF_PREVIEW =
    "Studio generated a mock proof/originality preview. No cryptographic hash or external record was created.";

  const withProofCmd = (next: StudioState): StudioState => {
    const sess = clone(next.activeSession);
    const cmd = parseStudioCommand(rawCommand);
    cmd.previewText = PROOF_PREVIEW;
    sess.commands.unshift(cmd);
    sess.updatedAt = nowISO();
    return { ...next, activeSession: sess, commandPanelOpen: true };
  };

  if (/(generate proof|check originality|create fingerprint|protect this video)/.test(n)) {
    return withProofCmd(generateProofPlan(s));
  }

  if (/(export proof package|save to proof vault)/.test(n)) {
    const withPlan = s.proofPlans.length > 0 ? s : generateProofPlan(s);
    const planId = withPlan.selectedProofPlanId ?? withPlan.proofPlans[0]?.id;
    if (!planId) return withProofCmd(withPlan);
    return withProofCmd(generateProofPackagePreview(withPlan, planId));
  }

  // ── General effect/session commands ───────────────────────────────────────
  const session = s.activeSession;
  const parsed = parseStudioCommand(rawCommand);
  session.commands.unshift(parsed);
  session.updatedAt = nowISO();

  if (/(music|background sound|audio|sound|clean audio)/.test(n)) {
    const ef = createEffectPreviewFromCommand(rawCommand);
    if (ef) s.effectPreviews.unshift(ef);
    parsed.previewText = ef ? ef.description : parsed.previewText;
    return { ...s, activeSession: session };
  }

  if (/(skin|lighting|cinematic|beauty|make cinematic|better my skin|fix lighting)/.test(n)) {
    const ef = createEffectPreviewFromCommand(rawCommand);
    if (ef) s.effectPreviews.unshift(ef);
    parsed.previewText = ef ? ef.description : parsed.previewText;
    return { ...s, activeSession: session };
  }

  const ef = createEffectPreviewFromCommand(rawCommand);
  if (ef) {
    s.effectPreviews.unshift(ef);
    parsed.previewText = ef.description;
    return { ...s, activeSession: session };
  }

  return { ...s, activeSession: session };
}
