import { POPS_DEFAULT_POLICY_BY_PROOF_LEVEL } from "../constants/pops.constants";
import {
  POPS_PRIVACY_POLICY,
  type PopsPrivacyPolicy,
  type PopsPrivacyPolicyConfig,
  type PopsPrivacyReceipt
} from "../types/pops-privacy.types";
import type { PopsProofLevel, PopsSessionType } from "../types/pops.types";

const POLICY_CONFIGS: Record<PopsPrivacyPolicy, PopsPrivacyPolicyConfig> = {
  [POPS_PRIVACY_POLICY.DISCARD_RAW]: {
    policy: POPS_PRIVACY_POLICY.DISCARD_RAW,
    retentionDays: 0,
    allowRawCameraStorage: false,
    allowRawAudioStorage: false,
    allowRawLocationStorage: false,
    allowedFeatureTypes: []
  },
  [POPS_PRIVACY_POLICY.LOCAL_ONLY]: {
    policy: POPS_PRIVACY_POLICY.LOCAL_ONLY,
    retentionDays: 0,
    allowRawCameraStorage: false,
    allowRawAudioStorage: false,
    allowRawLocationStorage: false,
    allowedFeatureTypes: ["screen", "touch", "motion", "content"]
  },
  [POPS_PRIVACY_POLICY.STORE_FEATURES_ONLY]: {
    policy: POPS_PRIVACY_POLICY.STORE_FEATURES_ONLY,
    retentionDays: 7,
    allowRawCameraStorage: false,
    allowRawAudioStorage: false,
    allowRawLocationStorage: false,
    allowedFeatureTypes: ["screen", "touch", "motion", "content", "visual_features", "integrity_features"]
  },
  [POPS_PRIVACY_POLICY.STORE_WITH_CONSENT]: {
    policy: POPS_PRIVACY_POLICY.STORE_WITH_CONSENT,
    retentionDays: 30,
    allowRawCameraStorage: false,
    allowRawAudioStorage: false,
    allowRawLocationStorage: false,
    allowedFeatureTypes: ["screen", "touch", "motion", "content", "visual_features", "audio_features", "location_class"]
  },
  [POPS_PRIVACY_POLICY.STORE_FOR_KYC_REVIEW]: {
    policy: POPS_PRIVACY_POLICY.STORE_FOR_KYC_REVIEW,
    retentionDays: 90,
    allowRawCameraStorage: true,
    allowRawAudioStorage: false,
    allowRawLocationStorage: false,
    allowedFeatureTypes: ["screen", "touch", "motion", "content", "visual_features", "integrity_features"]
  },
  [POPS_PRIVACY_POLICY.STORE_FOR_FRAUD_REVIEW]: {
    policy: POPS_PRIVACY_POLICY.STORE_FOR_FRAUD_REVIEW,
    retentionDays: 180,
    allowRawCameraStorage: true,
    allowRawAudioStorage: true,
    allowRawLocationStorage: true,
    allowedFeatureTypes: [
      "screen",
      "touch",
      "motion",
      "content",
      "visual_features",
      "audio_features",
      "location_class",
      "integrity_features",
      "continuity_features"
    ]
  }
};

function nowIso(): string {
  return new Date().toISOString();
}

export interface CreatePopsPrivacyReceiptInput {
  sessionId: string;
  userId: string;
  sessionType: PopsSessionType;
  proofLevel: PopsProofLevel;
  rawCameraStored: boolean;
  rawAudioStored: boolean;
  rawLocationStored: boolean;
  localProcessingUsed: boolean;
  storedFeatureTypes: string[];
  retentionPolicy?: PopsPrivacyPolicy;
}

export class PopsPrivacyService {
  resolvePolicy(proofLevel: PopsProofLevel): PopsPrivacyPolicy {
    return POPS_DEFAULT_POLICY_BY_PROOF_LEVEL[proofLevel];
  }

  getPolicyConfig(policy: PopsPrivacyPolicy): PopsPrivacyPolicyConfig {
    return POLICY_CONFIGS[policy];
  }

  createPrivacyReceipt(input: CreatePopsPrivacyReceiptInput): PopsPrivacyReceipt {
    const policy = input.retentionPolicy ?? this.resolvePolicy(input.proofLevel);
    const policyConfig = this.getPolicyConfig(policy);

    return {
      id: `pops_privacy_receipt_${crypto.randomUUID()}`,
      sessionId: input.sessionId,
      userId: input.userId,
      sessionType: input.sessionType,
      proofLevel: input.proofLevel,
      rawCameraStored: input.rawCameraStored,
      rawAudioStored: input.rawAudioStored,
      rawLocationStored: input.rawLocationStored,
      localProcessingUsed: input.localProcessingUsed,
      storedFeatureTypes: input.storedFeatureTypes.filter((feature) =>
        policyConfig.allowedFeatureTypes.includes(feature)
      ),
      retentionPolicy: policy,
      userVisibleSummary: `P.O.P.S used ${input.localProcessingUsed ? "local" : "server"} feature processing under ${policy}.`,
      createdAt: nowIso()
    };
  }
}
