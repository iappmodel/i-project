import {
  POPS_RAW_DATA_TYPE,
  POPS_RETENTION_POLICY,
  type PopsRawDataType,
  type PopsRetentionPolicy
} from "./pops-privacy-receipt.types";
import type { PopsProofLevel } from "../types/pops.types";

const BASE_ALLOWED_RAW_DATA = new Set<PopsRawDataType>([]);

const HIGH_PROOF_ALLOWED_RAW_DATA = new Set<PopsRawDataType>([
  POPS_RAW_DATA_TYPE.RAW_CAMERA_FRAME,
  POPS_RAW_DATA_TYPE.RAW_AUDIO_SAMPLE
]);

const LEGAL_ALLOWED_RAW_DATA = new Set<PopsRawDataType>([
  POPS_RAW_DATA_TYPE.RAW_CAMERA_FRAME,
  POPS_RAW_DATA_TYPE.RAW_AUDIO_SAMPLE,
  POPS_RAW_DATA_TYPE.RAW_PRECISE_LOCATION,
  POPS_RAW_DATA_TYPE.RAW_SCREEN_RECORDING,
  POPS_RAW_DATA_TYPE.RAW_BIOMETRIC_TEMPLATE
]);

function isHighProofLevel(proofLevel: PopsProofLevel): boolean {
  return proofLevel === "LEVEL_4_IDENTITY_CONTINUITY" || proofLevel === "LEVEL_5_HIGH_VALUE";
}

export function resolveAllowedRawDataTypes(params: {
  proofLevel: PopsProofLevel;
  retentionPolicy: PopsRetentionPolicy;
}): Set<PopsRawDataType> {
  if (params.retentionPolicy === POPS_RETENTION_POLICY.LEGAL_REQUIRED) {
    return new Set(LEGAL_ALLOWED_RAW_DATA);
  }

  if (
    params.retentionPolicy === POPS_RETENTION_POLICY.FRAUD_REVIEW_REQUIRED ||
    params.retentionPolicy === POPS_RETENTION_POLICY.KYC_REQUIRED ||
    isHighProofLevel(params.proofLevel)
  ) {
    return new Set(HIGH_PROOF_ALLOWED_RAW_DATA);
  }

  return new Set(BASE_ALLOWED_RAW_DATA);
}

export function filterStoredRawDataTypes(params: {
  proofLevel: PopsProofLevel;
  retentionPolicy: PopsRetentionPolicy;
  requestedRawDataTypes: PopsRawDataType[];
}): PopsRawDataType[] {
  const allowed = resolveAllowedRawDataTypes({
    proofLevel: params.proofLevel,
    retentionPolicy: params.retentionPolicy
  });
  return params.requestedRawDataTypes.filter((rawType) => allowed.has(rawType));
}

