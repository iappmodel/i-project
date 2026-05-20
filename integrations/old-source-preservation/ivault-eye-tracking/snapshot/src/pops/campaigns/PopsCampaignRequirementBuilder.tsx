import type React from "react";
import { useMemo } from "react";
import {
  POPS_CAMPAIGN_PROOF_PRESET,
  type PopsCampaignProofPreset,
  type PopsCampaignVerificationRequirement
} from "./pops-campaign-requirements.types";
import {
  POPS_CAMPAIGN_PROOF_PRESETS,
  getCampaignRequirementFromPreset
} from "./pops-campaign-requirements.service";

export interface PopsCampaignRequirementBuilderProps {
  campaignId: string;
  value: PopsCampaignVerificationRequirement;
  onChange: (next: PopsCampaignVerificationRequirement) => void;
}

const orderedPresets: PopsCampaignProofPreset[] = [
  POPS_CAMPAIGN_PROOF_PRESET.BASIC_VIEW,
  POPS_CAMPAIGN_PROOF_PRESET.PAID_WATCH,
  POPS_CAMPAIGN_PROOF_PRESET.CTA_INTENT,
  POPS_CAMPAIGN_PROOF_PRESET.LOCAL_VISIT,
  POPS_CAMPAIGN_PROOF_PRESET.HIGH_VALUE_REWARD
];

function matchingPreset(
  value: PopsCampaignVerificationRequirement
): PopsCampaignProofPreset {
  for (const preset of orderedPresets) {
    if (POPS_CAMPAIGN_PROOF_PRESETS[preset].requirements.requiredProofLevel === value.requiredProofLevel) {
      return preset;
    }
  }
  return POPS_CAMPAIGN_PROOF_PRESET.BASIC_VIEW;
}

export function PopsCampaignRequirementBuilder({
  campaignId,
  value,
  onChange
}: PopsCampaignRequirementBuilderProps) {
  const selectedPreset = useMemo(() => matchingPreset(value), [value]);

  return (
    <section style={sectionStyle}>
      <h3 style={{ margin: 0 }}>Presence Verification</h3>
      <p style={subtitleStyle}>
        Choose how strongly P.O.P.S must verify the humane factor before rewards are released.
      </p>

      <div style={cardsContainerStyle}>
        {orderedPresets.map((preset) => {
          const option = POPS_CAMPAIGN_PROOF_PRESETS[preset];
          const isSelected = selectedPreset === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(getCampaignRequirementFromPreset(campaignId, preset))}
              style={{
                ...cardStyle,
                borderColor: isSelected ? "#0f172a" : "#d9e2ec",
                background: isSelected ? "#f8fafc" : "#ffffff"
              }}
            >
              <div style={cardTopRowStyle}>
                <strong>{option.label}</strong>
                <span style={badgeStyle}>{option.fraudResistance} resistance</span>
              </div>
              <p style={copyStyle}>{option.description}</p>
              <Meta label="Required signals" value={option.requiredSignals.join(", ")} />
              <Meta label="Expected user friction" value={option.expectedUserFriction} />
              <Meta label="Best use case" value={option.bestUseCase} />
            </button>
          );
        })}
      </div>

      <div style={warningBlockStyle}>
        <strong>Warnings</strong>
        <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
          <li>Higher proof = higher fraud resistance but more friction.</li>
          <li>Lower proof = easier participation but more risk.</li>
          <li>Visual presence should be optional unless reward value justifies it.</li>
          <li>KYC should only be required for payout/legal/high-risk flows.</li>
        </ul>
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: 6, fontSize: 12, color: "#334155" }}>
      <strong>{label}:</strong> {value}
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  border: "1px solid #d9e2ec",
  borderRadius: 12,
  padding: 16,
  background: "#ffffff"
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 6,
  marginBottom: 14,
  color: "#475569",
  fontSize: 13
};

const cardsContainerStyle: React.CSSProperties = {
  display: "grid",
  gap: 10
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #d9e2ec",
  borderRadius: 10,
  padding: 12,
  textAlign: "left",
  cursor: "pointer"
};

const cardTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8
};

const badgeStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#0f172a",
  background: "#e2e8f0",
  padding: "2px 6px",
  borderRadius: 999
};

const copyStyle: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 8,
  color: "#334155",
  fontSize: 13
};

const warningBlockStyle: React.CSSProperties = {
  marginTop: 14,
  border: "1px solid #fde68a",
  background: "#fffbeb",
  borderRadius: 10,
  padding: 12,
  color: "#854d0e",
  fontSize: 13
};
