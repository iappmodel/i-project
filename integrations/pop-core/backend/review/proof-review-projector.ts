import {
  proofPacketV0ToDecisionInput,
  proofPacketV0ToPopsSignalBatch
} from "../adapters/proof-packet-v0-to-pops.js";
import { popsDecisionToProofReview } from "../adapters/proof-review-status-map.js";
import { PopsDecisionService } from "../decisions/pops-decision.service.js";
import { PopsScoringService } from "../scoring/pops-scoring.service.js";
import type {
  ProofPacketDecisionOverrides,
  ProofPacketV0,
  ProofReviewResult
} from "../types/proof-packet-v0.types.js";
import type {
  PopsRewardDecision,
  PopsScoringResult
} from "../types/pops-decisions.types.js";
import type { PopsSignalBatch } from "../types/pops.types.js";

export interface ProofReviewProjectorOptions {
  decisionOverrides?: ProofPacketDecisionOverrides;
  scoringService?: PopsScoringService;
  decisionService?: PopsDecisionService;
}

export interface ProofReviewProjectionResult {
  packet: ProofPacketV0;
  batch: PopsSignalBatch;
  scoring: PopsScoringResult;
  decision: PopsRewardDecision;
  review: ProofReviewResult;
}

export function projectProofPacketReview(
  packet: ProofPacketV0,
  options?: ProofReviewProjectorOptions
): ProofReviewProjectionResult {
  const scoringService = options?.scoringService ?? new PopsScoringService();
  const decisionService = options?.decisionService ?? new PopsDecisionService();

  const batch = proofPacketV0ToPopsSignalBatch(packet);
  const scoring = scoringService.score(batch);
  const input = proofPacketV0ToDecisionInput(packet, scoring, options?.decisionOverrides);
  const decision = decisionService.evaluate(input);
  const review = popsDecisionToProofReview(decision);

  const updatedPacket: ProofPacketV0 = {
    ...packet,
    review
  };

  return {
    packet: updatedPacket,
    batch,
    scoring,
    decision,
    review
  };
}
