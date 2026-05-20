import React from "react";
import { POPS_FALLBACK_METHOD, type PopsFallbackDecision } from "./pops-fallback.types";

export interface PopsFallbackPromptProps {
  decision: PopsFallbackDecision;
  onConfirmTap?: () => void;
  onReplaySegment?: () => void;
  onDismiss?: () => void;
}

/**
 * In-session prompt when P.O.P.S selects a fallback verification path.
 * Copy is neutral and non-accusatory (see `POPS_FALLBACK_FORBIDDEN_USER_PHRASES`).
 */
export function PopsFallbackPrompt({ decision, onConfirmTap, onReplaySegment, onDismiss }: PopsFallbackPromptProps) {
  const showTap =
    decision.requiresUserAction &&
    (decision.fallbackMethod === POPS_FALLBACK_METHOD.MANUAL_CONFIRMATION_TAP ||
      decision.fallbackMethod === POPS_FALLBACK_METHOD.SIMPLE_ATTENTION_CHECK ||
      decision.fallbackMethod === POPS_FALLBACK_METHOD.CTA_CONFIRMATION);

  const showReplay =
    decision.requiresUserAction && decision.fallbackMethod === POPS_FALLBACK_METHOD.CONTENT_REPLAY_SEGMENT;

  return (
    <aside
      role="status"
      aria-live="polite"
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        padding: 16,
        maxWidth: 420,
        background: "#f8fafc",
        color: "#0f172a"
      }}
    >
      <p style={{ margin: "0 0 12px 0", fontSize: 15, lineHeight: 1.45 }}>{decision.userVisibleMessage}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {showTap ? (
          <button
            type="button"
            onClick={onConfirmTap}
            style={{
              borderRadius: 8,
              border: "1px solid #2563eb",
              background: "#2563eb",
              color: "#ffffff",
              padding: "8px 14px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Continue
          </button>
        ) : null}

        {showReplay ? (
          <button
            type="button"
            onClick={onReplaySegment}
            style={{
              borderRadius: 8,
              border: "1px solid #0f172a",
              background: "#ffffff",
              color: "#0f172a",
              padding: "8px 14px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Replay segment
          </button>
        ) : null}

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            style={{
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#475569",
              padding: "8px 14px",
              cursor: "pointer"
            }}
          >
            Not now
          </button>
        ) : null}
      </div>
    </aside>
  );
}
