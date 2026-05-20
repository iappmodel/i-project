import type { PopsPipelineEventRecord } from "../../pops-pipeline.types";
import {
  getPopsScenarioFixture,
  popsScenarioFixtures,
  type PopsScenarioId
} from "./pops-session-fixtures";

export interface PopsEventFixture {
  scenarioId: PopsScenarioId;
  events: PopsPipelineEventRecord[];
}

export const popsEventFixtures: PopsEventFixture[] = popsScenarioFixtures.map((scenario) => ({
  scenarioId: scenario.id,
  events: scenario.pipelineEvents
}));

export function getPopsEventFixture(id: PopsScenarioId): PopsEventFixture {
  const fixture = popsEventFixtures.find((item) => item.scenarioId === id);
  if (!fixture) {
    const scenario = getPopsScenarioFixture(id);
    return { scenarioId: scenario.id, events: scenario.pipelineEvents };
  }
  return fixture;
}
