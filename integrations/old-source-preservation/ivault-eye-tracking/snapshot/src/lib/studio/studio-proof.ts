/**
 * studio-proof.ts — Stage 7 mock proof / originality layer.
 *
 * WARNING: MOCK ONLY.
 * No cryptographic hash is computed.
 * No external ledger, backend, Supabase, or file system is touched.
 * All outputs are deterministic local TypeScript for demo purposes.
 */

import type {
  StudioState,
  StudioProofArtifact,
  StudioProofArtifactType,
  StudioProofStatus,
  StudioProofPlan,
  StudioProofPackage,
  StudioCustodyEvent,
  StudioCustodyEventType,
  StudioOriginalityStatus,
} from "./studio.types";

// ── Tiny utilities (no external import to keep the file self-contained) ───────

let _seq = 1;
function gid(prefix: string): string {
  return `${prefix}_${Date.now()}_${_seq++}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

// ── Input shapes ──────────────────────────────────────────────────────────────

export interface CreateCustodyEventInput {
  type: StudioCustodyEventType;
  label: string;
  description: string;
  referenceId?: string | null;
}

export interface CreateProofArtifactInput {
  type: StudioProofArtifactType;
  label: string;
  description: string;
  status?: StudioProofStatus;
  referenceId?: string | null;
}

// ── Factory: custody event ────────────────────────────────────────────────────

export function createCustodyEvent(input: CreateCustodyEventInput): StudioCustodyEvent {
  return {
    id: gid("ce"),
    type: input.type,
    createdAt: nowISO(),
    label: input.label,
    description: input.description,
    referenceId: input.referenceId ?? null,
  };
}

// ── Factory: proof artifact ───────────────────────────────────────────────────

export function createProofArtifact(input: CreateProofArtifactInput): StudioProofArtifact {
  return {
    id: gid("art"),
    type: input.type,
    label: input.label,
    status: input.status ?? "generated",
    createdAt: nowISO(),
    description: input.description,
    referenceId: input.referenceId ?? null,
  };
}

// ── Algorithm helpers ─────────────────────────────────────────────────────────

function computeOriginalityScore(state: StudioState): number {
  const { activeSession, selectedEditPlanId, selectedCleanupPlanId, selectedPublishPlanId } = state;
  let score = 82;
  if (selectedEditPlanId) score += 5;
  if (selectedCleanupPlanId) score += 4;
  if (selectedPublishPlanId) score += 4;
  if (activeSession.marks && activeSession.marks.length > 0) score += 3;
  const hasBlurry = activeSession.clips.some((c) => c.isBlurry);
  const hasSilent = activeSession.clips.some((c) => c.isSilent);
  if (hasBlurry) score -= 10;
  if (hasSilent) score -= 8;
  return Math.max(0, Math.min(100, score));
}

function computeOriginalityStatus(score: number): StudioOriginalityStatus {
  if (score >= 85) return "likely_original";
  if (score >= 65) return "needs_review";
  return "duplicate_risk";
}

function computeFingerprintId(state: StudioState): string {
  const { activeSession, editPlans } = state;
  const sessionId = activeSession.id;
  const clips = activeSession.clips.length;
  const marks = activeSession.marks ? activeSession.marks.length : 0;
  const ep = editPlans.length;
  return `fp_${sessionId}_${clips}_${marks}_${ep}`;
}

// ── Factory: proof plan ───────────────────────────────────────────────────────

export function createProofPlan(state: StudioState): {
  plan: StudioProofPlan;
  artifacts: StudioProofArtifact[];
  custodyEvent: StudioCustodyEvent;
} {
  const score = computeOriginalityScore(state);
  const origStatus = computeOriginalityStatus(score);
  const fingerprintId = computeFingerprintId(state);

  // Artifacts
  const artifacts: StudioProofArtifact[] = [
    createProofArtifact({
      type: "visual_fingerprint",
      label: "Visual Fingerprint",
      description: "Mock perceptual hash of video frames. No real computation performed.",
    }),
    createProofArtifact({
      type: "audio_fingerprint",
      label: "Audio Fingerprint",
      description: "Mock spectral signature of audio track. No real computation performed.",
    }),
    createProofArtifact({
      type: "edit_manifest",
      label: "Edit Manifest",
      description: "Record of edit plan decisions applied to this session.",
    }),
    createProofArtifact({
      type: "custody_log",
      label: "Custody Log",
      description: "Append-only record of custody events for this session.",
    }),
  ];

  if (state.selectedCleanupPlanId) {
    artifacts.push(
      createProofArtifact({
        type: "cleanup_receipt",
        label: "Cleanup Receipt",
        description: "Record of storage cleanup plan linked to this proof.",
        referenceId: state.selectedCleanupPlanId,
      }),
    );
  }

  if (state.selectedPublishPlanId) {
    artifacts.push(
      createProofArtifact({
        type: "publish_receipt",
        label: "Publish Receipt",
        description: "Record of publish plan linked to this proof.",
        referenceId: state.selectedPublishPlanId,
      }),
    );
  }

  const warnings: string[] = [
    "Mock proof only. No cryptographic hash has been generated.",
    "Originality confidence is simulated.",
  ];
  if (origStatus === "duplicate_risk" || origStatus === "needs_review") {
    warnings.push("Some clips need review.");
  }

  const custodyEvent = createCustodyEvent({
    type: "proof_generated",
    label: "Proof generated",
    description: `Mock proof plan created. Originality score: ${score}. Status: ${origStatus}.`,
  });

  const plan: StudioProofPlan = {
    id: gid("proof"),
    status: "generated",
    createdAt: nowISO(),
    originalityStatus: origStatus,
    originalityScore: score,
    fingerprintId,
    custodyEventCount: 1,
    artifactIds: artifacts.map((a) => a.id),
    summary: `Mock proof generated for session "${state.activeSession.title}". Originality score: ${score}/100. Fingerprint: ${fingerprintId}.`,
    warnings,
  };

  return { plan, artifacts, custodyEvent };
}

// ── Factory: proof package ────────────────────────────────────────────────────

export function createProofPackage(
  state: StudioState,
  proofPlan: StudioProofPlan,
): {
  proofPackage: StudioProofPackage;
  artifact: StudioProofArtifact;
  custodyEvent: StudioCustodyEvent;
} {
  const artifact = createProofArtifact({
    type: "export_receipt",
    label: "Export Receipt",
    description: "Mock export receipt for proof package. No file was written.",
    referenceId: proofPlan.id,
  });

  const custodyEvent = createCustodyEvent({
    type: "proof_package_exported",
    label: "Proof package previewed",
    description: `Mock proof package preview generated for plan ${proofPlan.id}.`,
    referenceId: proofPlan.id,
  });

  const proofPackage: StudioProofPackage = {
    id: gid("pkg"),
    proofPlanId: proofPlan.id,
    createdAt: nowISO(),
    status: "previewed",
    artifactIds: [...proofPlan.artifactIds, artifact.id],
    manifestSummary: `Package for proof plan ${proofPlan.id}. Originality: ${proofPlan.originalityStatus} (${proofPlan.originalityScore}/100). Artifacts: ${proofPlan.artifactIds.length + 1}.`,
    disclosure:
      "Mock proof package only. No cryptographic hash, external ledger, or file export has occurred. This preview is for demonstration purposes only.",
  };

  // Update plan's custody event count (the plan itself is immutable here; caller updates state)
  void state;

  return { proofPackage, artifact, custodyEvent };
}
