import React from "react";
import type {
  StudioSession,
  StudioClip,
  StudioRecordingState,
  StudioEditPlan,
  StudioCleanupPlan,
  StudioPublishPlan,
  StudioPublishPlanStatus,
  StudioProofPlan,
  StudioOriginalityStatus,
} from "../../lib/studio/studio.types";
import { formatRecordingElapsed } from "../../lib/studio/studio-copy";

type Props = {
  session: StudioSession;
  selectedClip: StudioClip | null;
  recording: StudioRecordingState;
  editPlans: StudioEditPlan[];
  selectedEditPlan: StudioEditPlan | null;
  cleanupPlans: StudioCleanupPlan[];
  selectedCleanupPlan: StudioCleanupPlan | null;
  publishPlans: StudioPublishPlan[];
  selectedPublishPlan: StudioPublishPlan | null;
  proofPlans: StudioProofPlan[];
  selectedProofPlan: StudioProofPlan | null;
  proofArtifactCount: number;
  custodyEventCount: number;
  onToggleDiscard: (id: string) => void;
};

const editPlanStatusColor: Record<StudioEditPlan["status"], string> = {
  draft: "#748099",
  previewed: "#5ebcff",
  accepted: "#34d399",
  rejected: "#f87171",
};

const publishStatusColor: Record<StudioPublishPlanStatus, string> = {
  draft: "#748099",
  previewed: "#5ebcff",
  ready: "#34d399",
  published_mock: "#a78bfa",
  rejected: "#f87171",
};

const cleanupStatusColor: Record<StudioCleanupPlan["status"], string> = {
  draft: "#748099",
  previewed: "#5ebcff",
  confirmed: "#34d399",
  rejected: "#f87171",
};

const origColor: Record<StudioOriginalityStatus, string> = {
  unchecked: "#94a3b8",
  pending: "#facc15",
  likely_original: "#22c55e",
  needs_review: "#fb923c",
  duplicate_risk: "#f87171",
};

const StudioSessionPanel: React.FC<Props> = ({
  session,
  selectedClip,
  recording,
  editPlans,
  selectedEditPlan,
  cleanupPlans,
  selectedCleanupPlan,
  publishPlans,
  selectedPublishPlan,
  proofPlans,
  selectedProofPlan,
  proofArtifactCount,
  custodyEventCount,
  onToggleDiscard,
}) => {
  return (
    <div
      style={{
        width: 320,
        padding: 12,
        borderLeft: "1px solid rgba(255,255,255,0.03)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        overflowY: "auto",
      }}
    >
      {/* Session summary */}
      <div>
        <div style={{ fontWeight: 700 }}>{session.title}</div>
        <div style={{ opacity: 0.8, marginTop: 6, fontSize: 13 }}>Clips: {session.clips.length}</div>
      </div>

      {/* Selected clip */}
      <div>
        <div style={{ fontSize: 13, color: "#9aa4b2" }}>Selected clip</div>
        <div style={{ marginTop: 6 }}>{selectedClip ? selectedClip.title : "None"}</div>
        {selectedClip ? (
          <button onClick={() => onToggleDiscard(selectedClip.id)} style={{ marginTop: 8, fontSize: 12, padding: "4px 8px" }}>
            {selectedClip.status === "discarded" ? "Restore" : "Discard"}
          </button>
        ) : null}
      </div>

      {/* Publish summary card */}
      <div
        style={{
          padding: 10,
          background: publishPlans.length > 0 ? "rgba(167,139,250,0.05)" : "rgba(255,255,255,0.02)",
          borderRadius: 8,
          border: `1px solid ${publishPlans.length > 0 ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.03)"}`,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#a78bfa" }}>Publish</div>
        <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Total plans</span>
            <span>{publishPlans.length}</span>
          </div>
          {selectedPublishPlan ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9aa4b2" }}>Status</span>
                <span style={{ color: publishStatusColor[selectedPublishPlan.status], fontWeight: 600 }}>
                  {selectedPublishPlan.status}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9aa4b2" }}>Destinations</span>
                <span style={{ color: "#a78bfa" }}>{selectedPublishPlan.destinations.join(", ")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9aa4b2" }}>Disclosure</span>
                <span style={{ color: selectedPublishPlan.disclosureRequired ? "#f59e0b" : "#748099" }}>
                  {selectedPublishPlan.disclosureRequired ? "required" : "not required"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9aa4b2" }}>Originality</span>
                <span style={{ color: selectedPublishPlan.originalityStatus === "pending" ? "#748099" : "#34d399" }}>
                  {selectedPublishPlan.originalityStatus}
                </span>
              </div>
            </>
          ) : (
            <div style={{ color: "#748099", fontStyle: "italic" }}>
              {publishPlans.length === 0
                ? "No publish plan yet. Try \"i-post to feed\"."
                : "No plan selected."}
            </div>
          )}
        </div>
      </div>

      {/* Cleanup plan summary */}
      <div
        style={{
          padding: 10,
          background: cleanupPlans.length > 0 ? "rgba(240,140,40,0.05)" : "rgba(255,255,255,0.02)",
          borderRadius: 8,
          border: `1px solid ${cleanupPlans.length > 0 ? "rgba(240,140,40,0.12)" : "rgba(255,255,255,0.03)"}`,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#f08c28" }}>Storage cleanup</div>
        <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Total plans</span>
            <span>{cleanupPlans.length}</span>
          </div>
          {selectedCleanupPlan ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9aa4b2" }}>Recoverable</span>
                <span style={{ color: "#34d399", fontWeight: 600 }}>{selectedCleanupPlan.recoverableStorageMb} MB</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9aa4b2" }}>Protected</span>
                <span style={{ color: "#f59e0b" }}>{selectedCleanupPlan.protectedStorageMb} MB</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9aa4b2" }}>Status</span>
                <span style={{ color: cleanupStatusColor[selectedCleanupPlan.status], fontWeight: 600 }}>
                  {selectedCleanupPlan.status}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9aa4b2" }}>Requires confirmation</span>
                <span style={{ color: "#f08c28" }}>yes</span>
              </div>
            </>
          ) : (
            <div style={{ color: "#748099", fontStyle: "italic" }}>
              {cleanupPlans.length === 0
                ? "No cleanup plan yet. Try \"i-cleanup storage\"."
                : "No plan selected."}
            </div>
          )}
        </div>
      </div>

      {/* Auto-cut summary card */}
      <div
        style={{
          padding: 10,
          background: "rgba(94,188,255,0.04)",
          borderRadius: 8,
          border: "1px solid rgba(94,188,255,0.08)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#5ebcff" }}>Auto-cut plans</div>
        <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Total plans</span>
            <span>{editPlans.length}</span>
          </div>
          {selectedEditPlan ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9aa4b2" }}>Selected</span>
                <span style={{ maxWidth: 140, textAlign: "right", lineHeight: 1.3 }}>{selectedEditPlan.title}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9aa4b2" }}>Est. duration</span>
                <span>{selectedEditPlan.estimatedDurationSeconds.toFixed(1)}s</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9aa4b2" }}>Status</span>
                <span style={{ color: editPlanStatusColor[selectedEditPlan.status], fontWeight: 600 }}>
                  {selectedEditPlan.status}
                </span>
              </div>
            </>
          ) : (
            <div style={{ color: "#748099", fontStyle: "italic" }}>No plan selected.</div>
          )}
        </div>
      </div>

      {/* Proof / originality summary card */}
      <div style={{ padding: 10, background: "rgba(34,197,94,0.04)", borderRadius: 8, border: "1px solid rgba(34,197,94,0.12)" }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#22c55e" }}>🔐 Proof / originality</div>
        <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Total proof plans</span>
            <span style={{ fontWeight: 600 }}>{proofPlans.length}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Originality status</span>
            <span style={{ fontWeight: 600, color: selectedProofPlan ? origColor[selectedProofPlan.originalityStatus] : "#64748b" }}>
              {selectedProofPlan ? selectedProofPlan.originalityStatus : "—"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Originality score</span>
            <span style={{ fontWeight: 600 }}>{selectedProofPlan ? `${selectedProofPlan.originalityScore}/100` : "—"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Artifacts</span>
            <span>{proofArtifactCount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Custody events</span>
            <span>{custodyEventCount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Deletion protected</span>
            <span style={{ fontWeight: 600, color: session.proofStatus.deletionProtected ? "#22c55e" : "#64748b" }}>
              {session.proofStatus.deletionProtected ? "YES" : "no"}
            </span>
          </div>
        </div>
        {proofPlans.length === 0 && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#64748b", fontStyle: "italic" }}>
            No proof generated. Run "i-generate proof" to start.
          </div>
        )}
      </div>

      {/* Capture session card */}
      <div style={{ padding: 10, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Capture session</div>
        <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Status</span>
            <span style={{ fontWeight: 600 }}>{recording.status}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Active take</span>
            <span>{recording.activeTakeId ?? "—"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Takes</span>
            <span>{recording.takeCount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Elapsed</span>
            <span>{formatRecordingElapsed(recording.elapsedSeconds)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Last command</span>
            <span>{recording.lastCommand ?? "—"}</span>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "#748099", fontStyle: "italic" }}>
          Camera/mic integration pending — mock control state only.
        </div>
      </div>
    </div>
  );
};

export default StudioSessionPanel;
