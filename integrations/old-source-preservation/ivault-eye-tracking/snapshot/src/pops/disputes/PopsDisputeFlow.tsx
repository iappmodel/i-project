import React, { useMemo, useState } from "react";
import {
  POPS_DISPUTE_FORM_COPY,
  POPS_DISPUTE_REASON,
  type PopsCreateDisputeInput,
  type PopsDisputeReason
} from "./pops-dispute.types";
import { PopsDisputeService } from "./pops-dispute.service";
import { PopsDisputeStatusCard } from "./PopsDisputeStatusCard";

export interface PopsDisputeFlowProps {
  service: PopsDisputeService;
  userId: string;
  sessionId: string;
  rewardDecisionId: string;
  walletRewardIntentId?: string | null;
}

const reasonOptions: PopsDisputeReason[] = [
  POPS_DISPUTE_REASON.COMPLETED_ACTION,
  POPS_DISPUTE_REASON.VERIFICATION_FAILED,
  POPS_DISPUTE_REASON.REWARD_AMOUNT_WRONG,
  POPS_DISPUTE_REASON.SESSION_INTERRUPTED,
  POPS_DISPUTE_REASON.LOCATION_VERIFICATION_FAILED,
  POPS_DISPUTE_REASON.MISTAKE,
  POPS_DISPUTE_REASON.OTHER
];

export function PopsDisputeFlow({
  service,
  userId,
  sessionId,
  rewardDecisionId,
  walletRewardIntentId = null
}: PopsDisputeFlowProps) {
  const [reason, setReason] = useState<PopsDisputeReason>(reasonOptions[0]);
  const [userMessage, setUserMessage] = useState("");
  const [evidenceRaw, setEvidenceRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [latestDisputeId, setLatestDisputeId] = useState<string | null>(null);

  const latestDispute = useMemo(() => {
    const disputes = service.listDisputesForUser(userId);
    if (!latestDisputeId) return disputes[0] ?? null;
    return disputes.find((dispute) => dispute.id === latestDisputeId) ?? null;
  }, [latestDisputeId, service, userId]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const evidenceAttachments = evidenceRaw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const payload: PopsCreateDisputeInput = {
        userId,
        sessionId,
        rewardDecisionId,
        walletRewardIntentId,
        reason,
        userMessage,
        evidenceAttachments
      };

      const dispute = service.createDispute(payload);
      setLatestDisputeId(dispute.id);
      setUserMessage("");
      setEvidenceRaw("");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to submit dispute.");
    }
  };

  return (
    <section
      style={{
        border: "1px solid #dbe3ea",
        borderRadius: 12,
        background: "#ffffff",
        padding: 16,
        maxWidth: 760
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 6 }}>{POPS_DISPUTE_FORM_COPY.title}</h2>
      <p style={{ marginTop: 0, marginBottom: 14, color: "#475569" }}>{POPS_DISPUTE_FORM_COPY.body}</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={labelStyle}>
          <span>Reason</span>
          <select value={reason} onChange={(event) => setReason(event.target.value as PopsDisputeReason)} style={controlStyle}>
            {reasonOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          <span>Details</span>
          <textarea
            value={userMessage}
            onChange={(event) => setUserMessage(event.target.value)}
            placeholder={POPS_DISPUTE_FORM_COPY.userMessagePlaceholder}
            required
            rows={4}
            style={controlStyle}
          />
        </label>

        <label style={labelStyle}>
          <span>Evidence attachment URLs (optional, comma separated)</span>
          <input
            value={evidenceRaw}
            onChange={(event) => setEvidenceRaw(event.target.value)}
            placeholder="https://example.com/screenshot1.png, https://example.com/screenshot2.png"
            style={controlStyle}
          />
        </label>

        {error ? (
          <p
            role="alert"
            style={{
              margin: 0,
              border: "1px solid #fecaca",
              borderRadius: 8,
              background: "#fef2f2",
              color: "#b91c1c",
              padding: "8px 10px"
            }}
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          style={{
            border: "1px solid #0f172a",
            borderRadius: 8,
            background: "#0f172a",
            color: "#ffffff",
            fontWeight: 600,
            padding: "8px 12px",
            cursor: "pointer",
            width: "fit-content"
          }}
        >
          Submit dispute
        </button>
      </form>

      {latestDispute ? (
        <div style={{ marginTop: 14 }}>
          <PopsDisputeStatusCard dispute={latestDispute} />
        </div>
      ) : null}
    </section>
  );
}

const labelStyle = {
  display: "grid",
  gap: 6,
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 600
};

const controlStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "inherit"
};
