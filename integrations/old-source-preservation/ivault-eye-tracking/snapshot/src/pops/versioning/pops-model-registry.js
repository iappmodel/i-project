"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POPS_REGISTERED_MODELS = exports.POPS_FRAUD_ENGINE_V1 = exports.POPS_SCORING_ENGINE_V1 = void 0;
const pops_rule_registry_1 = require("./pops-rule-registry");
/** Logical scoring engine artifact ids (alias scoring model for observability). */
exports.POPS_SCORING_ENGINE_V1 = pops_rule_registry_1.POPS_SCORING_MODEL_V1;
/** Fraud risk model tied to batch-derived heuristics. */
exports.POPS_FRAUD_ENGINE_V1 = pops_rule_registry_1.POPS_FRAUD_MODEL_V1;
exports.POPS_REGISTERED_MODELS = [
    { modelKind: "SCORING", versionId: exports.POPS_SCORING_ENGINE_V1, notes: "PopsScoringService batch-weighted pipeline" },
    { modelKind: "FRAUD", versionId: exports.POPS_FRAUD_ENGINE_V1, notes: "Automation / impossible-behavior subscores folded into fraudRisk" }
];
