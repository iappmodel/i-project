import React from "react";
import { getPopsPermissionCopy } from "./pops-permission-copy";
import { POPS_PERMISSION_TYPE, type PopsPermissionStatus, type PopsPermissionType } from "./pops-permission.types";

const ALL_TYPES = Object.values(POPS_PERMISSION_TYPE) as PopsPermissionType[];

export type PopsPermissionSettingsProps = {
  permissionStatuses: Partial<Record<PopsPermissionType, PopsPermissionStatus>>;
  onOpenSystemSettings?: () => void;
};

function statusLabel(status: PopsPermissionStatus | undefined): string {
  if (!status) return "Not set";
  switch (status) {
    case "NOT_REQUESTED":
      return "Not requested";
    case "GRANTED":
      return "Allowed";
    case "DENIED":
      return "Declined";
    case "LIMITED":
      return "Limited";
    case "SYSTEM_BLOCKED":
      return "Blocked by system";
    case "NOT_AVAILABLE":
      return "Not available";
    case "EXPIRED":
      return "Expired";
    default:
      return status;
  }
}

export function PopsPermissionSettings({ permissionStatuses, onOpenSystemSettings }: PopsPermissionSettingsProps) {
  return (
    <section
      style={{
        border: "1px solid #dbe3ea",
        borderRadius: 12,
        background: "#ffffff",
        padding: 16,
        maxWidth: 720
      }}
      aria-labelledby="pops-permission-settings-title"
    >
      <h2 id="pops-permission-settings-title" style={{ margin: "0 0 8px", color: "#0f172a", fontSize: 18 }}>
        P.O.P.S permission reference
      </h2>
      <p style={{ margin: "0 0 12px", color: "#475569", fontSize: 14, lineHeight: 1.45 }}>
        Status reflects this device. Moments only request what they need; this screen is for transparency across all
        signal types.
      </p>

      {onOpenSystemSettings ? (
        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            onClick={onOpenSystemSettings}
            style={{
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              borderRadius: 8,
              padding: "8px 12px",
              fontWeight: 600,
              color: "#0f172a",
              cursor: "pointer"
            }}
          >
            Open system settings
          </button>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {ALL_TYPES.map((type) => {
          const entry = getPopsPermissionCopy(type);
          const st = permissionStatuses[type];
          return (
            <div
              key={type}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 12,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                alignItems: "start"
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{entry.title}</div>
                <div style={{ marginTop: 4, color: "#475569", fontSize: 13, lineHeight: 1.45 }}>{entry.reason}</div>
                <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>If declined: {entry.declineImpact}</div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0f172a",
                  background: "#e2e8f0",
                  borderRadius: 999,
                  padding: "4px 10px",
                  justifySelf: "end"
                }}
              >
                {statusLabel(st)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
