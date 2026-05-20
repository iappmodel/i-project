import { PrivacyViolationError } from "./errors";

export interface RawAttentionInput {
  userId: string;
  campaignId: string;
  rewardAmount: number;
  deviceAttestationHash: string;
  camera_frame?: Uint8Array;
  gaze_vector_raw?: number[];
  biometric_raw?: number[];
  durationMs: number;
  facePresentScore: number;
  eyesOpenScore: number;
  gazeForwardScore: number;
  interactionScore: number;
}

export interface AttentionVerificationProof {
  attentionVerified: boolean;
  confidenceScore: number;
  fraudScore: number;
  verificationGates: {
    facePresent: boolean;
    eyesOpen: boolean;
    gazeForward: boolean;
    durationMet: boolean;
    interactionValid: boolean;
  };
  economicProofPayload: {
    userId: string;
    campaignId: string;
    rewardAmount: number;
    confidenceScore: number;
    fraudScore: number;
    rawDataIncluded: false;
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function disposeRawSignals(input: RawAttentionInput): void {
  if (input.camera_frame) {
    input.camera_frame.fill(0);
    input.camera_frame = undefined;
  }
  if (input.gaze_vector_raw) {
    input.gaze_vector_raw = [];
  }
  if (input.biometric_raw) {
    input.biometric_raw = [];
  }
}

export function verifyAttentionSession(input: RawAttentionInput): AttentionVerificationProof {
  try {
    const gates = {
      facePresent: input.facePresentScore >= 0.7,
      eyesOpen: input.eyesOpenScore >= 0.65,
      gazeForward: input.gazeForwardScore >= 0.65,
      durationMet: input.durationMs >= 15_000,
      interactionValid: input.interactionScore >= 0.5,
    };

    const confidenceScore = clamp01(
      input.facePresentScore * 0.25 +
        input.eyesOpenScore * 0.2 +
        input.gazeForwardScore * 0.3 +
        input.interactionScore * 0.25,
    );

    const failedGateCount = Object.values(gates).filter((isPass) => !isPass).length;
    const fraudScore = clamp01(failedGateCount * 0.2 + (1 - input.interactionScore) * 0.2);
    const attentionVerified = Object.values(gates).every(Boolean) && confidenceScore >= 0.7 && fraudScore <= 0.4;

    const proof: AttentionVerificationProof = {
      attentionVerified,
      confidenceScore,
      fraudScore,
      verificationGates: gates,
      economicProofPayload: {
        userId: input.userId,
        campaignId: input.campaignId,
        rewardAmount: input.rewardAmount,
        confidenceScore,
        fraudScore,
        rawDataIncluded: false,
      },
    };

    return proof;
  } catch (error) {
    throw new PrivacyViolationError(
      `Attention verification failed before proof generation: ${(error as Error).message}`,
      [],
    );
  } finally {
    // Mandatory explicit cleanup so raw signal buffers cannot leak beyond verification.
    disposeRawSignals(input);
  }
}
