import React from "react";
import type {
  StudioProofPlan,
  StudioProofPackage,
  StudioProofArtifact,
  StudioCustodyEvent,
  StudioProofPlanStatus,
  StudioOriginalityStatus,
} from "../../lib/studio/studio.types";

type Props = {
  open: boolean;
  proofPlans: StudioProofPlan[];
  proofPackages: StudioProofPackage[];
  artifacts: StudioProofArtifact[];
  custodyEvents: StudioCustodyEvent[];
  selectedProofPlanId: string | null;
  selectedProofPackageId: string | null;
  onSelectProofPlan: (proofPlanId: string) => void;
  onGeneratePackage: (proofPlanId: string) => void;
  onExportPackage: (packageId: string) => void;
  onRejectProofPlan: (proofPlanId: string) => void;
  onRejectPackage: (packageId: string) => void;
  onClose: () => void;
};

const planStatusColor: Record<StudioProofPlanStatus, string> = {
  draft: "#94a3b8",
  generated: "#22c55e",
  export_previewed: "#60a5fa",
  rejected: "#f87171",
};

const origColor: Record<StudioOriginalityStatus, string> = {
  unchecked: "#94a3b8",
  pending: "#facc15",
  likely_original: "#22c55e",
  needs_review: "#fb923c",
  duplicate_risk: "#f87171",
};

const StudioProofPanel: React.FC<Props> = ({
  open,
  proofPlans,
  proofPackages,
  artifacts,
  custodyEvents,
  selectedProofPlanId,
  selectedProofPackageId,
  onSelectProofPlan,
  onGeneratePackage,
  onExportPackage,
  onRejectProofPlan,
  onRejectPackage,
  onClose,
}) => {
  if (!open) return null;

  const selectedPlan = proofPlans.find((p) => p.id === selectedProofPlanId) ?? proofPlans[0] ?? null;
  const selectedPackage =
    proofPackages.find((p) => p.id === selectedProofPackageId) ??
    (selectedPlan ? proofPackages.find((p) => p.proofPlanId === selectedPlan.id) ?? null : null);
  const planArtifacts = selectedPlan
    ? artifacts.filter((a) => selectedPlan.artifactIds.includes(a.id))
    : [];
  const planCustodyEvents = custodyEvents.slice(0, 10);

  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const panel: React.CSSProperties = {
    background: "#0f172a",
    border: "1px solid rgba(34,197,94,0.25)",
    borderRadius: 14,
    padding: 24,
    width: 560,
    maxHeight: "88vh",
    overflowY: "auto",
    color: "#e2e8f0",
    fontFamily: "monospace",
  };

  const section: React.CSSProperties = {
    marginBottom: 18,
    padding: 14,
    background: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.07)",
  };

  const label = (text: string) => (
    <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>
      {text}
    </div>
  );

  const value = (text: string, color?: string) => (
    <div style={{ fontSize: 13, fontWeight: 600, color: color ?? "#e2e8f0", marginBottom: 8 }}>{text}</div>
  );

  const btn = (text: string, onClick: () => void, color = "#22c55e", disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 14px",
        borderRadius: 6,
        border: `1px solid ${color}`,
        background: disabled ? "transparent" : `${color}22`,
        color: disabled ? "#475569" : color,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.5,
        cursor: disabled ? "default" : "pointer",
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      {text}
    </button>
  );

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1, color: "#22c55e" }}>
            🔐 PROOF / ORIGINALITY
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Disclaimer */}
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(251,146,60,0.08)",
            border: "1px solid rgba(251,146,60,0.25)",
            borderRadius: 6,
            fontSize: 11,
            color: "#fb923c",
            marginBottom: 16,
          }}
        >
          ⚠️ Mock proof only. No cryptographic hash, external ledger, or file export has occurred.
        </div>

        {/* Plan list */}
        {proofPlans.length > 1 && (
          <div style={section}>
            {label("All proof plans")}
            {proofPlans.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectProofPlan(p.id)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: p.id === selectedPlan?.id ? "rgba(34,197,94,0.1)" : "transparent",
                  cursor: "pointer",
                  marginBottom: 4,
                  fontSize: 12,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{p.fingerprintId}</span>
                <span style={{ color: planStatusColor[p.status] }}>{p.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Selected plan details */}
        {selectedPlan ? (
          <div style={section}>
            {label("Selected proof plan")}
            {value(selectedPlan.status.toUpperCase(), planStatusColor[selectedPlan.status])}

            {label("Originality status")}
            {value(selectedPlan.originalityStatus, origColor[selectedPlan.originalityStatus])}

            {label("Originality score")}
            {value(`${selectedPlan.originalityScore} / 100`)}

            {label("Fingerprint ID")}
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, wordBreak: "break-all" }}>
              {selectedPlan.fingerprintId}
            </div>

            {label("Custody events")}
            {value(String(selectedPlan.custodyEventCount))}

            {label("Artifacts")}
            {value(String(selectedPlan.artifactIds.length))}

            {label("Summary")}
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>{selectedPlan.summary}</div>

            {selectedPlan.warnings.length > 0 && (
              <>
                {label("Warnings")}
                {selectedPlan.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#fb923c", marginBottom: 4 }}>• {w}</div>
                ))}
              </>
            )}

            <div style={{ marginTop: 12 }}>
              {btn("Generate package preview", () => onGeneratePackage(selectedPlan.id), "#60a5fa", selectedPlan.status === "rejected")}
              {btn("Reject proof", () => onRejectProofPlan(selectedPlan.id), "#f87171", selectedPlan.status === "rejected")}
            </div>
          </div>
        ) : (
          <div style={{ ...section, color: "#64748b", fontSize: 12 }}>No proof plan generated yet. Run a proof command to start.</div>
        )}

        {/* Artifacts list */}
        {planArtifacts.length > 0 && (
          <div style={section}>
            {label("Artifacts")}
            {planArtifacts.map((a) => (
              <div key={a.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>{a.label}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{a.description}</div>
              </div>
            ))}
          </div>
        )}

        {/* Custody event timeline */}
        {planCustodyEvents.length > 0 && (
          <div style={section}>
            {label("Custody event timeline")}
            {planCustodyEvents.map((ev) => (
              <div key={ev.id} style={{ marginBottom: 8, borderLeft: "2px solid rgba(34,197,94,0.3)", paddingLeft: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>{ev.label}</div>
                <div style={{ fontSize: 10, color: "#475569" }}>{ev.description}</div>
                <div style={{ fontSize: 9, color: "#334155" }}>{ev.createdAt}</div>
              </div>
            ))}
          </div>
        )}

        {/* Proof package */}
        {selectedPackage && (
          <div style={section}>
            {label("Proof package")}
            {value(
              selectedPackage.status.toUpperCase(),
              selectedPackage.status === "exported_mock"
                ? "#22c55e"
                : selectedPackage.status === "rejected"
                ? "#f87171"
                : "#60a5fa",
            )}
            {label("Manifest")}
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>{selectedPackage.manifestSummary}</div>
            {label("Disclosure")}
            <div style={{ fontSize: 11, color: "#fb923c", marginBottom: 8 }}>{selectedPackage.disclosure}</div>
            <div>
              {btn(
                "Mock export package",
                () => onExportPackage(selectedPackage.id),
                "#22c55e",
                selectedPackage.status !== "previewed",
              )}
              {btn(
                "Reject package",
                () => onRejectPackage(selectedPackage.id),
                "#f87171",
                selectedPackage.status === "rejected",
              )}
            </div>
          </div>
        )}

        {/* Close */}
        <div style={{ textAlign: "right", marginTop: 8 }}>
          {btn("Close", onClose, "#64748b")}
        </div>
      </div>
    </div>
  );
};

export default StudioProofPanel;
