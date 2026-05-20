import React from "react";
import { getPopsPermissionCopy } from "./pops-permission-copy";
import {
  POPS_PERMISSION_STATUS,
  type PopsPermissionFallbackOption,
  type PopsPermissionRequirement,
  type PopsPermissionStatus,
  type PopsPermissionType
} from "./pops-permission.types";

export type PopsPermissionSheetProps = {
  /** Permissions for the current moment only (pre-filtered). */
  requirements: PopsPermissionRequirement[];
  permissionStatuses?: Partial<Record<PopsPermissionType, PopsPermissionStatus>>;
  fallbackOptions?: PopsPermissionFallbackOption[];
  onContinue?: () => void;
  onNotNow?: () => void;
  /** When true, shows a neutral dismiss path if any optional permission is not granted. */
  allowNotNow?: boolean;
  primaryCtaLabel?: string;
  canStart?: boolean;
};

function fallbackFor(
  permissionType: PopsPermissionType,
  options: PopsPermissionFallbackOption[] | undefined
): PopsPermissionFallbackOption | undefined {
  return options?.find((o) => o.forPermission === permissionType);
}

export function PopsPermissionSheet({
  requirements,
  permissionStatuses = {},
  fallbackOptions = [],
  onContinue,
  onNotNow,
  allowNotNow = true,
  primaryCtaLabel = "Continue",
  canStart = true
}: PopsPermissionSheetProps) {
  const optionalOpen = requirements.some((r) => {
    if (r.required) return false;
    const s = permissionStatuses[r.permissionType];
    return (
      s !== POPS_PERMISSION_STATUS.GRANTED && s !== POPS_PERMISSION_STATUS.LIMITED
    );
  });

  return (
    <section
      style={{
        border: "1px solid #dbe3ea",
        borderRadius: 12,
        background: "#ffffff",
        padding: 16,
        maxWidth: 560
      }}
      aria-labelledby="pops-permission-sheet-title"
    >
      <h2 id="pops-permission-sheet-title" style={{ margin: "0 0 8px", color: "#0f172a", fontSize: 18 }}>
        Permissions for this moment
      </h2>
      <p style={{ margin: "0 0 14px", color: "#475569", fontSize: 14, lineHeight: 1.45 }}>
        Here is what this moment uses, why it matters, and what happens if you choose not to share optional signals.
        Nothing here bundles unrelated features.
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        {requirements.map((req) => {
          const copy = getPopsPermissionCopy(req.permissionType);
          const fb = fallbackFor(req.permissionType, fallbackOptions);
          return (
            <li
              key={req.permissionType}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 12,
                background: "#f8fafc"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{copy.title}</div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: req.required ? "#b45309" : "#0369a1",
                    whiteSpace: "nowrap"
                  }}
                >
                  {req.required ? "Required" : "Optional"}
                </span>
              </div>
              <p style={{ margin: "6px 0 4px", color: "#334155", fontSize: 13, lineHeight: 1.45 }}>{req.userVisibleReason}</p>
              <p style={{ margin: 0, color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
                If declined: {copy.declineImpact}
              </p>
              {req.canFallback && req.fallbackMethod !== "NONE" ? (
                <p style={{ margin: "8px 0 0", color: "#0f766e", fontSize: 12, lineHeight: 1.45 }}>
                  Fallback: {fb?.description ?? "An alternate path may be offered when available."}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
        {allowNotNow && optionalOpen ? (
          <button
            type="button"
            onClick={onNotNow}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              borderRadius: 8,
              padding: "8px 14px",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer"
            }}
          >
            Not now
          </button>
        ) : null}
        <button
          type="button"
          onClick={onContinue}
          disabled={!canStart}
          style={{
            border: "none",
            background: canStart ? "#2563eb" : "#94a3b8",
            borderRadius: 8,
            padding: "8px 14px",
            fontWeight: 600,
            color: "#fff",
            cursor: canStart ? "pointer" : "not-allowed"
          }}
        >
          {primaryCtaLabel}
        </button>
      </div>
    </section>
  );
}
