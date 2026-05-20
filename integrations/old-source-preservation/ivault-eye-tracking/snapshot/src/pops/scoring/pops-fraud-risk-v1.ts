import { weightedAverage, clamp01 } from "./pops-score-normalizers";
import { POPS_FRAUD_RISK_WEIGHTS_V1 } from "./pops-score-weights";
import { POPS_REASON_CODES, type PopsReasonCodeEngine } from "./pops-reason-code-engine";

export interface PopsFraudRiskInputsV1 {
  impossibleProgressRisk: number;
  automationTimingRisk: number;
  deviceIntegrityRisk: number;
  duplicateRewardRisk: number;
  sessionAnomalyRisk: number;
  accountPatternRisk: number;
  campaignAbuseRisk: number;
  backgroundProgressDetected?: boolean;
  impossibleCompletionSpeedDetected?: boolean;
  hyperRegularTouchTimingDetected?: boolean;
  duplicateRewardAttemptDetected?: boolean;
  deviceFarmIndicatorsDetected?: boolean;
  emulatorOrRootWarningDetected?: boolean;
  repeatedAbnormalSessionsDetected?: boolean;
}

export interface PopsFraudRiskResultV1 {
  fraudRisk: number;
  components: {
    impossibleProgressRisk: number;
    automationTimingRisk: number;
    deviceIntegrityRisk: number;
    duplicateRewardRisk: number;
    sessionAnomalyRisk: number;
    accountPatternRisk: number;
    campaignAbuseRisk: number;
  };
}

export function scoreFraudRiskV1(
  input: PopsFraudRiskInputsV1,
  reasonEngine: PopsReasonCodeEngine,
): PopsFraudRiskResultV1 {
  const components = {
    impossibleProgressRisk: clamp01(input.impossibleProgressRisk),
    automationTimingRisk: clamp01(input.automationTimingRisk),
    deviceIntegrityRisk: clamp01(input.deviceIntegrityRisk),
    duplicateRewardRisk: clamp01(input.duplicateRewardRisk),
    sessionAnomalyRisk: clamp01(input.sessionAnomalyRisk),
    accountPatternRisk: clamp01(input.accountPatternRisk),
    campaignAbuseRisk: clamp01(input.campaignAbuseRisk),
  };

  if (input.backgroundProgressDetected) {
    components.impossibleProgressRisk = clamp01(Math.max(components.impossibleProgressRisk, 0.9));
    reasonEngine.add({
      code: POPS_REASON_CODES.negative.BACKGROUND_PROGRESS_DETECTED,
      scoreArea: "fraudRisk",
      impact: "negative",
      contribution: 0.2,
      internalOnly: true,
    });
  }
  if (input.impossibleCompletionSpeedDetected) {
    components.impossibleProgressRisk = clamp01(Math.max(components.impossibleProgressRisk, 0.95));
    reasonEngine.add({
      code: POPS_REASON_CODES.negative.IMPOSSIBLE_COMPLETION_SPEED,
      scoreArea: "fraudRisk",
      impact: "negative",
      contribution: 0.2,
      internalOnly: true,
    });
  }
  if (input.hyperRegularTouchTimingDetected) {
    components.automationTimingRisk = clamp01(Math.max(components.automationTimingRisk, 0.9));
    reasonEngine.add({
      code: POPS_REASON_CODES.negative.HYPER_REGULAR_TOUCH_TIMING,
      scoreArea: "fraudRisk",
      impact: "negative",
      contribution: 0.15,
      internalOnly: true,
    });
  }
  if (input.duplicateRewardAttemptDetected) {
    components.duplicateRewardRisk = clamp01(Math.max(components.duplicateRewardRisk, 0.95));
    reasonEngine.add({
      code: POPS_REASON_CODES.negative.DUPLICATE_REWARD_ATTEMPT,
      scoreArea: "fraudRisk",
      impact: "negative",
      contribution: 0.15,
      internalOnly: true,
    });
  }
  if (input.deviceFarmIndicatorsDetected || input.emulatorOrRootWarningDetected) {
    components.deviceIntegrityRisk = clamp01(Math.max(components.deviceIntegrityRisk, 0.9));
    reasonEngine.add({
      code: POPS_REASON_CODES.negative.DEVICE_INTEGRITY_WARNING,
      scoreArea: "fraudRisk",
      impact: "negative",
      contribution: 0.2,
      internalOnly: true,
    });
  }
  if (input.repeatedAbnormalSessionsDetected) {
    components.sessionAnomalyRisk = clamp01(Math.max(components.sessionAnomalyRisk, 0.85));
  }

  let fraudRisk = weightedAverage([
    {
      value: components.impossibleProgressRisk,
      weight: POPS_FRAUD_RISK_WEIGHTS_V1.impossibleProgressRisk,
    },
    {
      value: components.automationTimingRisk,
      weight: POPS_FRAUD_RISK_WEIGHTS_V1.automationTimingRisk,
    },
    {
      value: components.deviceIntegrityRisk,
      weight: POPS_FRAUD_RISK_WEIGHTS_V1.deviceIntegrityRisk,
    },
    {
      value: components.duplicateRewardRisk,
      weight: POPS_FRAUD_RISK_WEIGHTS_V1.duplicateRewardRisk,
    },
    {
      value: components.sessionAnomalyRisk,
      weight: POPS_FRAUD_RISK_WEIGHTS_V1.sessionAnomalyRisk,
    },
    {
      value: components.accountPatternRisk,
      weight: POPS_FRAUD_RISK_WEIGHTS_V1.accountPatternRisk,
    },
    {
      value: components.campaignAbuseRisk,
      weight: POPS_FRAUD_RISK_WEIGHTS_V1.campaignAbuseRisk,
    },
  ]);

  if (input.impossibleCompletionSpeedDetected && input.duplicateRewardAttemptDetected) {
    fraudRisk = Math.max(fraudRisk, 0.65);
  }
  if (
    input.impossibleCompletionSpeedDetected &&
    (input.duplicateRewardAttemptDetected || input.deviceFarmIndicatorsDetected || input.emulatorOrRootWarningDetected)
  ) {
    fraudRisk = Math.max(fraudRisk, 0.82);
  }

  if (fraudRisk >= 0.75) {
    reasonEngine.add({
      code: POPS_REASON_CODES.negative.HIGH_FRAUD_RISK,
      scoreArea: "fraudRisk",
      impact: "negative",
      contribution: 0.2,
      internalOnly: true,
    });
  } else if (fraudRisk <= 0.2) {
    reasonEngine.add({
      code: POPS_REASON_CODES.positive.LOW_FRAUD_RISK,
      scoreArea: "fraudRisk",
      impact: "positive",
      contribution: 0.1,
    });
  }

  return {
    fraudRisk,
    components,
  };
}
