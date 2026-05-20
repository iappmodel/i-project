import { clamp01, type PopsCreatorQualityInput, type PopsCreatorQualityResult } from "./pops-pricing.types";

const W_VCR = 0.25;
const W_ATT = 0.25;
const W_SAVE = 0.2;
const W_AUD = 0.15;
const W_REW = 0.15;

/**
 * creatorQuality =
 *   verifiedCompletionRate * 0.25
 * + averageAttentionConfidence * 0.25
 * + saveFollowIntentQuality * 0.20
 * + lowFraudAudienceQuality * 0.15
 * + rewatchReturnSignal * 0.15
 */
export function computeCreatorQuality(input: PopsCreatorQualityInput): PopsCreatorQualityResult {
  const vcr = clamp01(input.verifiedCompletionRate);
  const att = clamp01(input.averageAttentionConfidence);
  const save = clamp01(input.saveFollowIntentQuality);
  const fraud = clamp01(input.audienceFraudRate);
  const lowFraudAudienceQuality = clamp01(1 - fraud);
  const rewatch = clamp01(input.rewatchReturnSignal);

  const creatorQuality = clamp01(
    vcr * W_VCR + att * W_ATT + save * W_SAVE + lowFraudAudienceQuality * W_AUD + rewatch * W_REW
  );

  return {
    creatorQuality,
    lowFraudAudienceQuality,
    components: {
      verifiedCompletion: vcr * W_VCR,
      attention: att * W_ATT,
      saveFollow: save * W_SAVE,
      lowFraudAudience: lowFraudAudienceQuality * W_AUD,
      rewatchReturn: rewatch * W_REW
    }
  };
}

export class PopsCreatorQualityService {
  compute(input: PopsCreatorQualityInput): PopsCreatorQualityResult {
    return computeCreatorQuality(input);
  }
}
