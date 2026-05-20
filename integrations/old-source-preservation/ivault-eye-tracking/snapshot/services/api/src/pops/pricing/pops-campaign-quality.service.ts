import { clamp01, type PopsCampaignQualityInput, type PopsCampaignQualityResult } from "./pops-pricing.types";

const W_VM = 0.3;
const W_ATT = 0.2;
const W_INT = 0.2;
const W_COMP = 0.15;
const W_LOW_FRAUD = 0.15;

/**
 * campaignQuality =
 *   verifiedMomentRate * 0.30
 * + averageAttentionConfidence * 0.20
 * + averageIntentConfidence * 0.20
 * + completionRate * 0.15
 * + lowFraudRate * 0.15
 */
export function computeCampaignQuality(input: PopsCampaignQualityInput): PopsCampaignQualityResult {
  const vmr = clamp01(input.verifiedMomentRate);
  const att = clamp01(input.averageAttentionConfidence);
  const intent = clamp01(input.averageIntentConfidence);
  const comp = clamp01(input.completionRate);
  const fraud = clamp01(input.fraudRate);
  const lowFraud = clamp01(1 - fraud);

  const campaignQuality = clamp01(
    vmr * W_VM + att * W_ATT + intent * W_INT + comp * W_COMP + lowFraud * W_LOW_FRAUD
  );

  return {
    campaignQuality,
    lowFraudRate: lowFraud,
    components: {
      verifiedMomentRate: vmr * W_VM,
      attention: att * W_ATT,
      intent: intent * W_INT,
      completion: comp * W_COMP,
      lowFraud: lowFraud * W_LOW_FRAUD
    }
  };
}

export class PopsCampaignQualityService {
  compute(input: PopsCampaignQualityInput): PopsCampaignQualityResult {
    return computeCampaignQuality(input);
  }
}
