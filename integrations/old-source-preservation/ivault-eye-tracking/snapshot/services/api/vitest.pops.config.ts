import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "../../src/pops/scoring/pops-scoring-model-v1.test.ts",
      "../../src/pops/rewards/pops-reward-decision.service.test.ts",
      "../../src/pops/tests/pops-manual-scenarios.test.ts",
    ],
    testTimeout: 30_000,
  },
});
