import { AttentionVerificationProof } from "./attentionVerification";

export interface EconomicProofEnvelope {
  proof_id: string;
  user_id: string;
  campaign_id: string;
  reward_amount: number;
  confidence_score: number;
  fraud_score: number;
  verification_gate_summary: string;
  consent_receipt_id: string;
  device_attestation_hash: string;
}

export interface RewardIssuanceEngine {
  issueFromProof(proof: EconomicProofEnvelope): Promise<void>;
}

export interface WalletLedger {
  appendProofEntry(proof: EconomicProofEnvelope): Promise<void>;
}

export interface PendingBalanceEngine {
  addPendingReward(proof: EconomicProofEnvelope): Promise<void>;
}

export interface CampaignBudgetReserveEngine {
  settleProofReward(proof: EconomicProofEnvelope): Promise<void>;
}

export interface TrustScoreEngine {
  ingestVerificationOutcome(proof: EconomicProofEnvelope): Promise<void>;
}

export interface EconomicCompatibilityDeps {
  rewardIssuanceEngine: RewardIssuanceEngine;
  walletLedger: WalletLedger;
  pendingBalanceEngine: PendingBalanceEngine;
  campaignBudgetReserveEngine: CampaignBudgetReserveEngine;
  trustScoreEngine: TrustScoreEngine;
}

export function buildEconomicProofEnvelope(input: {
  proofId: string;
  consentReceiptId: string;
  deviceAttestationHash: string;
  proof: AttentionVerificationProof;
}): EconomicProofEnvelope {
  return {
    proof_id: input.proofId,
    user_id: input.proof.economicProofPayload.userId,
    campaign_id: input.proof.economicProofPayload.campaignId,
    reward_amount: input.proof.economicProofPayload.rewardAmount,
    confidence_score: input.proof.economicProofPayload.confidenceScore,
    fraud_score: input.proof.economicProofPayload.fraudScore,
    verification_gate_summary: JSON.stringify(input.proof.verificationGates),
    consent_receipt_id: input.consentReceiptId,
    device_attestation_hash: input.deviceAttestationHash,
  };
}

export async function fanoutEconomicProof(
  deps: EconomicCompatibilityDeps,
  economicProof: EconomicProofEnvelope,
): Promise<void> {
  await deps.rewardIssuanceEngine.issueFromProof(economicProof);
  await deps.walletLedger.appendProofEntry(economicProof);
  await deps.pendingBalanceEngine.addPendingReward(economicProof);
  await deps.campaignBudgetReserveEngine.settleProofReward(economicProof);
  await deps.trustScoreEngine.ingestVerificationOutcome(economicProof);
}
