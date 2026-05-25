import { POPS_FRAUD_MODEL_V1, POPS_SCORING_MODEL_V1 } from "./pops-rule-registry.js";

/** Logical scoring engine artifact ids (alias scoring model for observability). */
export const POPS_SCORING_ENGINE_V1 = POPS_SCORING_MODEL_V1;

/** Fraud risk model tied to batch-derived heuristics. */
export const POPS_FRAUD_ENGINE_V1 = POPS_FRAUD_MODEL_V1;

export interface PopsModelRegistration {
  modelKind: "SCORING" | "FRAUD";
  versionId: string;
  notes: string;
}

export const POPS_REGISTERED_MODELS: readonly PopsModelRegistration[] = [
  { modelKind: "SCORING", versionId: POPS_SCORING_ENGINE_V1, notes: "PopsScoringService batch-weighted pipeline" },
  { modelKind: "FRAUD", versionId: POPS_FRAUD_ENGINE_V1, notes: "Automation / impossible-behavior subscores folded into fraudRisk" }
] as const;
