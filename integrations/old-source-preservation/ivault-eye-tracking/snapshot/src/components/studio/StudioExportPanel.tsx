import React from "react";
import type {
  StudioSession,
  StudioCleanupPlan,
  StudioPublishPlan,
  StudioPublishPlanStatus,
  StudioPublishReadinessGateStatus,
  StudioProofPlan,
  StudioProofPackage,
  StudioProofPlanStatus,
  StudioOriginalityStatus,
} from "../../lib/studio/studio.types";

type Props = {
  open: boolean;
  session: StudioSession;
  selectedExportTargets?: string[];
  latestCleanupPlan?: StudioCleanupPlan | null;
  latestPublishPlan?: StudioPublishPlan | null;
  selectedProofPlan?: StudioProofPlan | null;
  latestProofPackage?: StudioProofPackage | null;
  onClose: () => void;
};

const cleanupStatusColor: Record<StudioCleanupPlan["status"], string> = {
  draft: "#748099",
  previewed: "#5ebcff",
  confirmed: "#34d399",
  rejected: "#f87171",
};

const publishStatusColor: Record<StudioPublishPlanStatus, string> = {
  draft: "#748099",
  previewed: "#5ebcff",
  ready: "#34d399",
  published_mock: "#a78bfa",
  rejected: "#f87171",
};

const gateStatusColor: Record<StudioPublishReadinessGateStatus, string> = {
  passed: "#34d399",
  warning: "#f59e0b",
  blocked: "#f87171",
  pending: "#748099",
};

const proofPlanStatusColor: Record<StudioProofPlanStatus, string> = {
  draft: "#748099",
  generated: "#22c55e",
  export_previewed: "#60a5fa",
  rejected: "#f87171",
};

const proofOrigColor: Record<StudioOriginalityStatus, string> = {
  unchecked: "#748099",
  pending: "#facc15",
  likely_original: "#22c55e",
  needs_review: "#fb923c",
  duplicate_risk: "#f87171",
};

const StudioExportPanel: React.FC<Props> = ({
  open,
  session,
  selectedExportTargets = [],
  latestCleanupPlan = null,
  latestPublishPlan = null,
  selectedProofPlan = null,
  latestProofPackage = null,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 20,
        bottom: 20,
        width: 420,
        background: "rgba(6,8,12,0.95)",
        padding: 12,
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>Export</div>
        <button onClick={onClose}>Close</button>
      </div>

      {/* Targets */}
      <div style={{ marginTop: 8 }}>
        Targets:
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          {session.exportTargets.map((t) => {
            const selected = selectedExportTargets.includes(t);
            return (
              <div
                key={t}
                style={{
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: selected
                    ? "linear-gradient(90deg,#0ea5a4,#06b6d4)"
                    : "rgba(255,255,255,0.02)",
                }}
              >
                {t}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cleanup readiness */}
      <div
        style={{
          marginTop: 12,
          padding: "8px 10px",
          background: "rgba(255,255,255,0.02)",
          borderRadius: 8,
          border: "1px solid rgba(240,140,40,0.1)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "#f08c28", marginBottom: 6 }}>
          Storage cleanup readiness
        </div>
        {latestCleanupPlan ? (
          <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#9aa4b2" }}>Cleanup status</span>
              <span style={{ color: cleanupStatusColor[latestCleanupPlan.status], fontWeight: 600 }}>
                {latestCleanupPlan.status}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#9aa4b2" }}>Recoverable</span>
              <span style={{ color: "#34d399" }}>{latestCleanupPlan.recoverableStorageMb} MB</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#9aa4b2" }}>Confirmation required</span>
              <span style={{ color: "#f08c28" }}>yes</span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#748099", fontStyle: "italic" }}>
            No cleanup plan generated. Run "i-cleanup storage" before export.
          </div>
        )}
      </div>

      {/* Publish plan readiness */}
      <div
        style={{
          marginTop: 12,
          padding: "8px 10px",
          background: "rgba(255,255,255,0.02)",
          borderRadius: 8,
          border: "1px solid rgba(167,139,250,0.12)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 6 }}>
          Publish plan readiness
        </div>
        {latestPublishPlan ? (
          (() => {
            const gates = latestPublishPlan.readinessGates;
            const counts: Record<StudioPublishReadinessGateStatus, number> = {
              passed: gates.filter((g) => g.status === "passed").length,
              warning: gates.filter((g) => g.status === "warning").length,
              blocked: gates.filter((g) => g.status === "blocked").length,
              pending: gates.filter((g) => g.status === "pending").length,
            };
            return (
              <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#9aa4b2" }}>Status</span>
                  <span style={{ color: publishStatusColor[latestPublishPlan.status], fontWeight: 600 }}>
                    {latestPublishPlan.status}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#9aa4b2" }}>Destinations</span>
                  <span style={{ color: "#a78bfa" }}>{latestPublishPlan.destinations.join(", ")}</span>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                  {(Object.keys(counts) as StudioPublishReadinessGateStatus[]).map((k) => (
                    <span key={k} style={{ color: gateStatusColor[k], fontSize: 11 }}>
                      {k}: {counts[k]}
                    </span>
                  ))}
                </div>
                {latestPublishPlan.status === "published_mock" && (
                  <div style={{ color: "#a78bfa", fontSize: 11, fontStyle: "italic" }}>
                    Mock published locally. No external post sent.
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div style={{ fontSize: 12, color: "#748099", fontStyle: "italic" }}>
            No publish plan yet. Try &quot;i-post to feed&quot;.
          </div>
        )}
      </div>

      {/* Proof readiness */}
      <div style={{ marginTop: 14, padding: 10, background: "rgba(34,197,94,0.04)", borderRadius: 8, border: "1px solid rgba(34,197,94,0.12)" }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: "#22c55e" }}>🔐 Proof readiness</div>
        <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Proof plan status</span>
            <span style={{ fontWeight: 600, color: selectedProofPlan ? proofPlanStatusColor[selectedProofPlan.status] : "#64748b" }}>
              {selectedProofPlan ? selectedProofPlan.status : "none"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Originality status</span>
            <span style={{ fontWeight: 600, color: selectedProofPlan ? proofOrigColor[selectedProofPlan.originalityStatus] : "#64748b" }}>
              {selectedProofPlan ? selectedProofPlan.originalityStatus : "—"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Proof package</span>
            <span style={{ fontWeight: 600, color: latestProofPackage ? "#60a5fa" : "#64748b" }}>
              {latestProofPackage ? latestProofPackage.status : "none"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9aa4b2" }}>Proof vault</span>
            <span style={{ fontWeight: 600, color: session.proofStatus.deletionProtected ? "#22c55e" : "#64748b" }}>
              {session.proofStatus.deletionProtected ? "protected" : "not protected"}
            </span>
          </div>
        </div>
        {!selectedProofPlan && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#64748b", fontStyle: "italic" }}>
            No proof generated. Run "i-generate proof" to add proof readiness.
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button style={{ padding: "8px 10px", borderRadius: 6 }}>Generate Preview</button>
        <button style={{ padding: "8px 10px", borderRadius: 6 }}>Save Draft</button>
        <button style={{ padding: "8px 10px", borderRadius: 6 }}>Publish</button>
      </div>
    </div>
  );
};

export default StudioExportPanel;
