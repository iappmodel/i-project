import type { PopsSignalBatch } from "../../../../services/api/src/pops/types/pops.types";
import type { PopsPipelineSignalBatch } from "../../pops-pipeline.types";
import {
  getPopsScenarioFixture,
  popsScenarioFixtures,
  type PopsScenarioId
} from "./pops-session-fixtures";

export interface PopsSignalFixture {
  scenarioId: PopsScenarioId;
  scoringBatch: PopsSignalBatch;
  pipelineSignalBatches: PopsPipelineSignalBatch[];
}

export const popsSignalFixtures: PopsSignalFixture[] = popsScenarioFixtures.map((scenario) => ({
  scenarioId: scenario.id,
  scoringBatch: scenario.scoringBatch,
  pipelineSignalBatches: scenario.pipelineSignalBatches
}));

export function getPopsSignalFixture(id: PopsScenarioId): PopsSignalFixture {
  const fixture = popsSignalFixtures.find((item) => item.scenarioId === id);
  if (!fixture) {
    const scenario = getPopsScenarioFixture(id);
    return {
      scenarioId: scenario.id,
      scoringBatch: scenario.scoringBatch,
      pipelineSignalBatches: scenario.pipelineSignalBatches
    };
  }
  return fixture;
}
